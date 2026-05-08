/**
 * Local data contracts for the Marketing approval-queue post composer.
 */

export interface ConnectedAccount {
  id: string;
  platform: string;
  name: string;
}

export interface ComplianceResult {
  compliant: boolean;
  warnings: string[];
  autoTags: string[];
}
