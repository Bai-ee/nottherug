import type { AvailabilitySlot, KnockoutReason, OnCallAnswers } from './contract';

/**
 * NYC Local Law 144: an applicant is rejected automatically only on an
 * objective answer they gave themselves about the role. Nothing here scores
 * or ranks, and the physical-duties answer never rejects (that is an
 * accommodation conversation). The first matching reason is returned so the
 * stored record says exactly why.
 */
export function knockoutReason(app: {
  answers: Pick<OnCallAnswers, 'travelToWilliamsburg' | 'willingTraining'>;
  availability: AvailabilitySlot[];
}): KnockoutReason | null {
  if (app.answers.travelToWilliamsburg === 'no') return 'no_travel';
  if (app.answers.willingTraining === 'no') return 'no_training';
  if (app.availability.length === 0) return 'no_availability';
  return null;
}
