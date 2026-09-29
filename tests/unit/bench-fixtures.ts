/**
 * Shared bench test data. Not itself a test file: vitest only collects *.test.ts.
 */

/** A complete on-call application as the public form posts it. */
export function applicationPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Sam Rivera',
    email: 'Sam@Example.test',
    phone: '(347) 555-0101',
    homeNeighborhood: 'Greenpoint',
    travelToWilliamsburg: 'yes',
    travelExplain: '',
    workTypes: ['on_call'],
    cover24h: 'yes',
    availability: [
      { weekday: 1, block: 'morning' },
      { weekday: 1, block: 'morning' },
      { weekday: 3, block: 'evening' },
    ],
    noticeNeeded: '4_12h',
    sameDayEmergency: 'sometimes',
    responseSpeed: '1hr',
    responseSpeedOther: '',
    notifyBy: 'text',
    travelTime: '15 minutes by bike',
    weeklyCapacity: '5 walks',
    weeklyHoursWanted: '',
    scheduleType: '',
    regularStartDate: '',
    recurringCommitments: 'Classes Tue/Thu until 2pm',
    trainingStartDate: '2026-10-15',
    experience: 'Walked my neighbor’s two labs for a year.',
    specialDogExperience: 'Fostered a senior beagle.',
    multiDogComfort: 'need_training',
    physicalDuties: 'yes',
    willingTraining: 'yes',
    phoneProtocol: 'yes',
    phoneProtocolExplain: '',
    scenarioRefusesToLeave: 'Stay calm, try treats, text Luis.',
    scenarioLooseHarness: 'Refit it before we leave the apartment.',
    scenarioCantMakeShift: 'Tell Luis right away so he can reassign.',
    whyOnCall: 'I freelance and my weekdays are flexible.',
    experienceSummary: '',
    anythingElse: '',
    smsConsent: true,
    confirmed: true,
    source: 'indeed',
    utm: { source: 'indeed', medium: 'job_post', campaign: 'Free text here' },
    hasResume: false,
    ...overrides,
  };
}
