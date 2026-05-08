/**
 * coachActionProposalApprovalSourceGuard.test.mjs
 * =================================================
 * Source guards for deterministic Coach proposal approval wiring.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APPROVAL_SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/coachActionProposalApprovalService.mjs'),
  'utf8',
);
const PROPOSAL_SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/coachActionProposalService.mjs'),
  'utf8',
);
const COACH_INTAKE_MIGRATION_SRC = readFileSync(
  resolve(__dirname, '../../migrations/20260506120000-create-coach-intake-items.cjs'),
  'utf8',
);

describe('coachActionProposalApprovalService source guards', () => {
  it('routes workout approval through RBAC and the canonical workout writer', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/ensureClientAccess/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/logWorkoutForClient/);
  });

  it('does not create workout rows directly inside the proposal executor', () => {
    expect(APPROVAL_SERVICE_SRC).not.toMatch(/WorkoutSession\.create\(/);
    expect(APPROVAL_SERVICE_SRC).not.toMatch(/WorkoutLog\.bulkCreate\(/);
  });

  it('routes client onboarding approval through the deterministic onboarding service', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/createClientFromCoachOnboardingProposal/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/COACH_PROPOSAL_TYPE\.CLIENT_ONBOARDING/);
  });

  it('routes client data updates through RBAC and the existing AI data write service', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/processAIDataUpdates/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/COACH_PROPOSAL_TYPE\.CLIENT_DATA_UPDATE/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/ensureClientAccess/);
  });

  it('exposes a read-only proposal detail path before approval', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/getCoachActionProposal/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/sanitizeProposalDetail/);
  });

  it('rejects empty client data update proposals instead of marking no-op approvals applied', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/CLIENT_DATA_UPDATE_EMPTY/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/updates\.length === 0/);
  });

  it('defines APPLYING as the transient deterministic-write status', () => {
    expect(PROPOSAL_SERVICE_SRC).toMatch(/APPLYING:\s*['"]APPLYING['"]/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/'APPLYING'/);
  });

  it('refreshes the database status constraint for existing proposal tables', () => {
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/DROP CONSTRAINT IF EXISTS coach_action_proposals_status_check/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/ADD CONSTRAINT coach_action_proposals_status_check/);
  });

  it('refreshes the database proposal-type constraint for non-write proposal types', () => {
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/'clarification'/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/'split_plan'/);
  });
});
