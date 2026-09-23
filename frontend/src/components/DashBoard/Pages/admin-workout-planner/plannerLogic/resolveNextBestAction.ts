/**
 * @since S14 — extracted pure logic.
 * Wired at WorkoutPlannerCommandPanelV2.tsx (imported line 22, called in the
 * `nba` memo). That panel is flag-gated by PLANNER_IA_V2 and ships dark.
 */
const MS_PER_DAY = 86_400_000;
export interface PlannerRosterEntry { readonly id: number; readonly lastPainFlag?: string; }
export interface PlannerPlan { readonly clientId: number; readonly active?: boolean; readonly endsAt?: number; readonly pendingReview?: boolean; }
export interface PlannerScheduleEntry { readonly clientId: number; readonly at: number; readonly week: number; readonly day: number; }
export interface NextBestActionInput {
  readonly roster: readonly PlannerRosterEntry[];
  readonly plans: readonly PlannerPlan[];
  readonly schedule: readonly PlannerScheduleEntry[];
  readonly now: number;
  /**
   * Whether the caller actually knows this roster's plan set (H22).
   *
   * An empty `plans` array is ambiguous: it means either "this client has no
   * plans" or "the plan request has not resolved yet". Treating the second case
   * as `missing_plan` tells the trainer a client has no plan when the truth is
   * unknown. This flag is REQUIRED (not optional-with-a-permissive-default) so
   * a new call site must state its knowledge explicitly instead of silently
   * reintroducing that misreport.
   */
  readonly planDataKnown: boolean;
}
export type NextBestAction = Readonly<{ kind: 'session_due' | 'deload_due' | 'plan_expired' | 'review_required' | 'missing_plan' | 'pain_flag' | 'pick_client'; clientId?: number; }>;
export const resolveNextBestAction = ({ roster, plans, schedule, now, planDataKnown }: NextBestActionInput): NextBestAction => {
  if (!Number.isFinite(now)) throw new TypeError('resolveNextBestAction: now must be finite epoch-ms');
  const scheduled = schedule.find(entry => entry.at >= now && entry.at <= now + MS_PER_DAY);
  if (scheduled) return { kind: 'session_due', clientId: scheduled.clientId };
  const deload = plans.find(plan => plan.active && plan.endsAt !== undefined && plan.endsAt >= now && plan.endsAt <= now + 3 * MS_PER_DAY);
  if (deload) return { kind: 'deload_due', clientId: deload.clientId };
  const expired = plans.find(plan => plan.active && plan.endsAt !== undefined && plan.endsAt < now);
  if (expired) return { kind: 'plan_expired', clientId: expired.clientId };
  const review = plans.find(plan => plan.pendingReview);
  if (review) return { kind: 'review_required', clientId: review.clientId };
  // H22: only claim "no active plan" from a plan set we have actually loaded.
  if (planDataKnown) {
    const missing = roster.find(client => !plans.some(plan => plan.clientId === client.id && plan.active));
    if (missing) return { kind: 'missing_plan', clientId: missing.id };
  }
  const pain = roster.find(client => client.lastPainFlag);
  if (pain) return { kind: 'pain_flag', clientId: pain.id };
  return { kind: 'pick_client' };
};
