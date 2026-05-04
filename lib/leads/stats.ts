import { fsQueryCollection } from '@/lib/server/firestoreRest';

export type LeadDoc = {
  id: string;
  type: string;
  submittedAt: string;
  ownerName: string;
  email: string;
  phone: string;
  neighborhood: string;
  dogName: string;
  breedAge: string;
  serviceInterest: string;
  spayNeuter: string;
  vaccinations: string;
  dogSocial: string;
  strangerSocial: string;
  walkFrequency: string;
  notes: string;
  source: string;
  [key: string]: unknown;
};

export type LeadStats = {
  rangeDays: number;
  timezone: string;
  today: { dateLabel: string; count: number; leads: LeadDoc[] };
  yesterday: { dateLabel: string; count: number; leads: LeadDoc[] };
  totals: { allTime: number; last7Days: number; last30Days: number };
  byDay: Array<{ date: string; count: number }>;
  bySource: Record<string, number>;
};

const TZ = 'America/New_York';

function isoDateInTZ(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

function shiftDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function getLeadStats(rangeDays = 30): Promise<LeadStats> {
  const all = (await fsQueryCollection('leads', 'submittedAt', 'DESCENDING', 1000)) as unknown as LeadDoc[];

  const now = new Date();
  const todayLabel = isoDateInTZ(now, TZ);
  const yesterdayLabel = isoDateInTZ(shiftDays(now, -1), TZ);

  const byDay = new Map<string, number>();
  const bySource: Record<string, number> = {};
  const todayLeads: LeadDoc[] = [];
  const yesterdayLeads: LeadDoc[] = [];
  let last7 = 0;
  let last30 = 0;

  const sevenLabels = new Set<string>();
  const thirtyLabels = new Set<string>();
  for (let i = 0; i < 7; i++) sevenLabels.add(isoDateInTZ(shiftDays(now, -i), TZ));
  for (let i = 0; i < 30; i++) thirtyLabels.add(isoDateInTZ(shiftDays(now, -i), TZ));
  for (let i = 0; i < rangeDays; i++) {
    byDay.set(isoDateInTZ(shiftDays(now, -i), TZ), 0);
  }

  for (const lead of all) {
    if (!lead.submittedAt) continue;
    const submitted = new Date(lead.submittedAt);
    if (Number.isNaN(submitted.getTime())) continue;
    const dayLabel = isoDateInTZ(submitted, TZ);

    if (byDay.has(dayLabel)) byDay.set(dayLabel, byDay.get(dayLabel)! + 1);
    if (sevenLabels.has(dayLabel)) last7++;
    if (thirtyLabels.has(dayLabel)) last30++;
    if (dayLabel === todayLabel) todayLeads.push(lead);
    if (dayLabel === yesterdayLabel) yesterdayLeads.push(lead);

    const src = lead.source || 'unknown';
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  const byDayArr = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    rangeDays,
    timezone: TZ,
    today: {
      dateLabel: todayLabel,
      count: todayLeads.length,
      leads: todayLeads,
    },
    yesterday: {
      dateLabel: yesterdayLabel,
      count: yesterdayLeads.length,
      leads: yesterdayLeads,
    },
    totals: { allTime: all.length, last7Days: last7, last30Days: last30 },
    byDay: byDayArr,
    bySource,
  };
}
