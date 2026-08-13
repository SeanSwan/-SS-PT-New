/**
 * Local data contracts for the Marketing approval-queue post composer.
 */

export interface ConnectedAccount {
  id: string;
  platform: string;
  name: string;
}

export interface ComplianceResult {
  /**
   * `warnings.length === 0`. NOT a publish gate: the checker raises a warning
   * even when it has already remedied the issue by appending #ad, so gating on
   * this would refuse nearly every promotional post.
   */
  compliant: boolean;
  warnings: string[];
  autoTags: string[];
  /** The real publish gate — true means the route will answer 422. */
  blocked?: boolean;
  /** The subset of `warnings` with no automatic remedy. */
  blockers?: string[];
}
