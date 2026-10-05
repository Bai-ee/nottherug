/**
 * lib/server/benchSummary.ts: the AI summary stays off by default and never
 * sends contact details to the model (plan §4.1, §4.5).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const fsGetDoc = vi.fn();
const fsMergeDoc = vi.fn();
vi.mock('@/lib/server/firestoreRest', () => ({
  fsGetDoc,
  fsSetDoc: vi.fn(),
  fsMergeDoc,
  fsQueryCollection: vi.fn(),
}));

const person = {
  fullName: 'Zed Quimby',
  email: 'sam@example.test',
  phoneE164: '+13475550101',
  availability: [{ weekday: 1, block: 'morning' }],
  answers: {
    homeNeighborhood: 'Greenpoint',
    travelToWilliamsburg: 'yes' as const,
    travelExplain: '',
    workTypes: ['on_call' as const],
    cover24h: 'yes' as const,
    noticeNeeded: '4_12h' as const,
    sameDayEmergency: 'sometimes' as const,
    responseSpeed: '1hr' as const,
    responseSpeedOther: '',
    notifyBy: 'text' as const,
    travelTime: '15 minutes',
    weeklyCapacity: '5 walks',
    weeklyHoursWanted: '',
    scheduleType: '' as const,
    regularStartDate: '',
    recurringCommitments: '',
    trainingStartDate: '2026-10-15',
    experience: 'Two labs next door.',
    specialDogExperience: 'A senior beagle.',
    multiDogComfort: 'comfortable' as const,
    physicalDuties: 'discuss' as const,
    willingTraining: 'yes' as const,
    phoneProtocol: 'yes' as const,
    phoneProtocolExplain: '',
    scenarioRefusesToLeave: 'Try treats.',
    scenarioLooseHarness: 'Refit it.',
    scenarioCantMakeShift: 'Tell Luis.',
    whyOnCall: 'Freelance schedule.',
    experienceSummary: '',
    anythingElse: '',
    questionsForUs: '',
  },
};

afterEach(() => {
  fsGetDoc.mockReset();
  fsMergeDoc.mockReset();
  delete process.env.BENCH_AI_SUMMARIES_ENABLED;
  delete process.env.ANTHROPIC_API_KEY;
  vi.unstubAllGlobals();
});

describe('bench AI summary', () => {
  it('is off unless the flag is exactly "true" and a key exists', async () => {
    const { isAiSummaryEnabled } = await import('@/lib/server/benchSummary');
    expect(isAiSummaryEnabled()).toBe(false);
    process.env.BENCH_AI_SUMMARIES_ENABLED = 'true';
    expect(isAiSummaryEnabled()).toBe(false);
    process.env.ANTHROPIC_API_KEY = 'test-key';
    expect(isAiSummaryEnabled()).toBe(true);
  });

  it('sends only answers about the work: no name, contact details, home or physical-duties answer', async () => {
    const { buildApplicationPrompt } = await import('@/lib/server/benchSummary');
    const prompt = buildApplicationPrompt(person, { morning: 'Morning' });
    expect(prompt).toContain('Two labs next door.');
    expect(prompt).toContain('Refit it.');
    expect(prompt).toContain('Mon Morning');
    for (const excluded of ['Zed', 'Quimby', 'sam@example.test', '3475550101', 'Greenpoint', 'discuss', 'Would like to discuss']) {
      expect(prompt).not.toContain(excluded);
    }
  });

  it('returns the text blocks, and nothing on a refusal', async () => {
    const { requestSummary } = await import('@/lib/server/benchSummary');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Summary: ...' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stop_reason: 'refusal', content: [] })));
    vi.stubGlobal('fetch', fetchMock);

    expect(await requestSummary('answers')).toBe('Summary: ...');
    expect(await requestSummary('answers')).toBeNull();
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.model).toBe('claude-opus-5-5');
    expect(sent.system).toContain('Do not score, rate, rank or recommend');
  });

  it('stores only aiSummary, and only while the person exists, never the record it read', async () => {
    process.env.BENCH_AI_SUMMARIES_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    fsGetDoc.mockResolvedValueOnce({ exists: true, data: { id: 'bench_x', ...person, notes: 'stale note' }, updateTime: 't1' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Summary: ok' }] }))));

    const { summarizeApplication } = await import('@/lib/server/benchSummary');
    await summarizeApplication('bench_x', { morning: 'Morning' });

    expect(fsMergeDoc).toHaveBeenCalledTimes(1);
    const [path, fields, opts] = fsMergeDoc.mock.calls[0];
    expect(path).toBe('benchPeople/bench_x');
    expect(Object.keys(fields).sort()).toEqual(['aiSummary', 'updatedAt']);
    expect(fields.aiSummary).toBe('Summary: ok');
    expect(opts.precondition).toEqual({ exists: true });
  });
});
