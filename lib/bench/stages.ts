import type { BenchAction, BenchStage } from './contract';

/**
 * Which stage each admin action moves a person to, and from which stages it
 * is allowed. Kept as data so the admin UI shows only the actions the server
 * will accept. `null` target means the action leaves the stage unchanged.
 */
export const ACTION_RULES: Record<BenchAction, { from: BenchStage[] | 'any'; to: BenchStage | null; label: string }> = {
  invite_shadow: { from: ['applied', 'review'], to: 'shadow_invited', label: 'Invite to shadow' },
  mark_scheduled: { from: ['shadow_invited'], to: 'shadow_scheduled', label: 'Mark scheduled' },
  mark_shadow_done: { from: ['shadow_invited', 'shadow_scheduled'], to: 'shadow_done', label: 'Shadow walk done' },
  conditional_offer: { from: ['shadow_done'], to: 'offer_conditional', label: 'Conditional offer' },
  // Manual stand-in for the Checkr webhook until Phase 5 (plan §7.4). New
  // bench members start at tier B.
  mark_background_clear: {
    from: ['offer_conditional', 'background_check'],
    to: 'bench',
    label: 'Mark background check clear',
  },
  reject: {
    from: ['applied', 'review', 'shadow_invited', 'shadow_scheduled', 'shadow_done'],
    to: 'rejected',
    label: 'Reject',
  },
  hold: { from: ['applied', 'review'], to: null, label: 'Hold' },
  unhold: { from: ['applied', 'review'], to: null, label: 'Take off hold' },
  mark_inactive: { from: ['bench', 'fulltime'], to: 'inactive', label: 'Mark inactive' },
  reactivate: { from: ['inactive'], to: 'bench', label: 'Back on the bench' },
  save_notes: { from: 'any', to: null, label: 'Save notes' },
};

export function actionAllowed(action: BenchAction, stage: BenchStage, onHold: boolean): boolean {
  const rule = ACTION_RULES[action];
  if (action === 'hold' && onHold) return false;
  if (action === 'unhold' && !onHold) return false;
  return rule.from === 'any' || rule.from.includes(stage);
}

/** The stage-changing actions available for a person, in pipeline order. */
export function availableActions(stage: BenchStage, onHold: boolean): BenchAction[] {
  return (Object.keys(ACTION_RULES) as BenchAction[]).filter(
    (action) => action !== 'save_notes' && actionAllowed(action, stage, onHold),
  );
}
