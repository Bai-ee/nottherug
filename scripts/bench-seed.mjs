#!/usr/bin/env node
/**
 * Seeds the Firestore EMULATOR with backup-bench settings and ~25 fake people
 * across stages, tiers and areas (plans/011 Phase 1). Refuses to run unless
 * FIRESTORE_EMULATOR_HOST is set, so it can never write to a real project.
 *
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/bench-seed.mjs [--admin you@example.com]
 *
 * The project id must match the one the dev server uses (FIREBASE_ADMIN_PROJECT_ID),
 * because lib/server/firestoreRest.ts builds its emulator path from it.
 * --admin also writes admins/{email}, so that account can open /admin while
 * the dev server points at the emulator.
 */
import { createHash } from 'node:crypto';

const host = process.env.FIRESTORE_EMULATOR_HOST?.trim();
if (!host) {
  console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is not set. This script only writes to the emulator.');
  process.exit(1);
}
const project = process.env.FIREBASE_ADMIN_PROJECT_ID || 'demo-not-the-rug';
const adminArg = process.argv.indexOf('--admin');
const adminEmail = adminArg > -1 ? process.argv[adminArg + 1] : null;
const base = `http://${host}/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents`;

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}

async function put(path, data) {
  const res = await fetch(`${base}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`);
}

const settings = {
  areas: [
    { id: 'williamsburg', name: 'Williamsburg', active: true, priorityRecruiting: false },
    { id: 'greenpoint', name: 'Greenpoint', active: true, priorityRecruiting: true },
  ],
  timeBlocks: [
    { key: 'morning', label: 'Morning', start: '07:00', end: '11:00' },
    { key: 'midday', label: 'Midday', start: '11:00', end: '15:00' },
    { key: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ],
  targetDepth: 3,
  waveTimeoutMinutes: 10,
  pingCadenceDays: 30,
  shadowBookingUrl: 'https://calendly.com/example/shadow-walk',
  alertPhone: '',
  autoInviteOnGap: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'bench-seed',
};

const FIRST = ['Ava', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jess', 'Kai', 'Lena', 'Milo', 'Nia', 'Omar', 'Pia', 'Quin', 'Rosa', 'Sol', 'Tess', 'Umi', 'Vic', 'Wren', 'Xan', 'Yara'];
const STAGES = [
  ['review', 6], ['shadow_invited', 2], ['shadow_scheduled', 2], ['shadow_done', 1], ['offer_conditional', 1],
  ['bench', 9], ['inactive', 2], ['rejected', 2],
];
const BLOCKS = ['morning', 'midday', 'evening'];
const HOODS = ['Williamsburg', 'Greenpoint', 'Bushwick', 'Bed-Stuy', 'East Williamsburg'];

let i = 0;
const people = [];
for (const [stage, count] of STAGES) {
  for (let n = 0; n < count; n++, i++) {
    const first = FIRST[i];
    const email = `${first.toLowerCase()}.seed@example.test`;
    const id = `bench_${createHash('sha256').update(email).digest('hex').slice(0, 32)}`;
    const created = new Date(Date.now() - (30 - i) * 86_400_000).toISOString();
    const areas = i % 3 === 0 ? ['williamsburg', 'greenpoint'] : i % 3 === 1 ? ['williamsburg'] : ['greenpoint'];
    const availability = [];
    for (let d = 0; d < 7; d++) {
      if ((d + i) % 2 === 0) availability.push({ weekday: d, block: BLOCKS[(d + i) % 3] });
      if ((d + i) % 5 === 0) availability.push({ weekday: d, block: BLOCKS[(d + i + 1) % 3] });
    }
    people.push({
      id,
      schemaVersion: 1,
      fullName: `${first} Seed`,
      firstName: first,
      email,
      phoneE164: `+1347555${String(1000 + i).slice(-4)}`,
      source: ['indeed', 'website', 'referral'][i % 3],
      utm: i % 3 === 0 ? { source: 'indeed', medium: 'job_post', campaign: 'backup-bench' } : {},
      stage,
      stageHistory: [
        { stage: 'applied', at: created, by: 'applicant' },
        { stage, at: created, by: stage === 'review' ? 'applicant' : 'bench-seed' },
      ],
      onHold: stage === 'review' && n === 5,
      areas,
      availability,
      unavailableDates: [],
      answers: {
        homeNeighborhood: HOODS[i % HOODS.length],
        travelToWilliamsburg: 'yes',
        travelExplain: '',
        workTypes: i % 3 === 0 ? ['on_call', 'part_time'] : ['on_call'],
        cover24h: ['yes', 'sometimes', 'yes'][i % 3],
        noticeNeeded: ['under_4h', '4_12h', '12_24h', 'over_24h'][i % 4],
        sameDayEmergency: ['yes', 'sometimes', 'no'][i % 3],
        responseSpeed: ['30min', '1hr', '4hr'][i % 3],
        responseSpeedOther: '',
        notifyBy: ['text', 'call', 'email'][i % 3],
        travelTime: `${10 + (i % 4) * 5} minutes`,
        weeklyCapacity: `${2 + (i % 5)} walks`,
        weeklyHoursWanted: i % 3 === 0 ? '15 hours' : '',
        scheduleType: i % 3 === 0 ? 'weekdays' : '',
        regularStartDate: i % 3 === 0 ? '2026-11-01' : '',
        recurringCommitments: i % 2 ? 'Classes Tue/Thu mornings' : '',
        trainingStartDate: '2026-10-15',
        experience: `Seed applicant ${first}: walked neighbors' dogs and volunteered at a shelter.`,
        specialDogExperience: 'Fostered a senior dog; comfortable with large breeds.',
        multiDogComfort: ['comfortable', 'need_training', 'prefer_solo'][i % 3],
        physicalDuties: i % 7 === 0 ? 'discuss' : 'yes',
        willingTraining: 'yes',
        phoneProtocol: 'yes',
        phoneProtocolExplain: '',
        scenarioRefusesToLeave: 'Stay calm, try treats and patience, then text Luis for guidance.',
        scenarioLooseHarness: 'Refit and check it before leaving the apartment.',
        scenarioCantMakeShift: 'Tell Luis immediately so the walk can be reassigned.',
        whyOnCall: 'My schedule changes week to week, so this work fits.',
        experienceSummary: '',
        anythingElse: '',
        questionsForUs: i % 4 === 0 ? 'How soon could I start shadowing?' : '',
      },
      confirmedAt: created,
      knockoutReason: stage === 'rejected' && n === 0 ? 'no_availability' : null,
      resumePath: null,
      resumeKind: null,
      aiSummary: null,
      smsConsentAt: i % 4 === 3 ? null : created,
      smsOptedOut: stage === 'inactive' && n === 1,
      employmentType: null,
      tier: stage === 'bench' ? ['A', 'B', 'B', 'C'][n % 4] : null,
      tierPinned: stage === 'bench' && n === 0,
      notes: '',
      shadowRating: ['shadow_done', 'offer_conditional', 'bench'].includes(stage) ? 3 + (i % 3) : null,
      createdAt: created,
      updatedAt: created,
    });
  }
}

await put('benchSettings/config', settings);
for (const p of people) await put(`benchPeople/${p.id}`, p);
if (adminEmail) await put(`admins/${adminEmail}`, { role: 'admin', seededBy: 'bench-seed' });

console.log(`Seeded benchSettings/config and ${people.length} benchPeople into ${project} on ${host}${adminEmail ? `, plus admins/${adminEmail}` : ''}.`);
