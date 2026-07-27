/**
 * EnhancedClientProgressView truth locks
 * =====================================
 * Guards the canonical trainer /dashboard/trainer/client-progress surface
 * against placeholder tabs and invented progress defaults.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressView.tsx'),
  'utf8',
);
const STATE_PANEL_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressViewStatePanels.tsx'),
  'utf8',
);
const COMPARISON_SOURCE = readFileSync(
  resolve(__dirname, './Analytics/ComparisonAnalytics.tsx'),
  'utf8',
);
const GOAL_TRACKER_SOURCE = readFileSync(
  resolve(__dirname, './Analytics/GoalProgressTracker.tsx'),
  'utf8',
);
const GOAL_TRACKER_LOGIC_SOURCE = readFileSync(
  resolve(__dirname, './Analytics/GoalProgressTracker.logic.ts'),
  'utf8',
);
const GOAL_TRACKER_DETAILS_SOURCE = readFileSync(
  resolve(__dirname, './Analytics/GoalProgressTrackerGoalDetails.tsx'),
  'utf8',
);
const GOAL_TRACKER_COMBINED_SOURCE = [
  GOAL_TRACKER_SOURCE,
  GOAL_TRACKER_LOGIC_SOURCE,
  GOAL_TRACKER_DETAILS_SOURCE,
].join('\n');
const INJURY_RISK_SOURCE = readFileSync(
  resolve(__dirname, './Analytics/InjuryRiskAssessment.tsx'),
  'utf8',
);

describe('EnhancedClientProgressView truth locks', () => {
  it('does not expose a placeholder gamification tab on the trainer progress route', () => {
    expect(SOURCE).not.toMatch(/Gamification &amp; Social Progress/);
    expect(SOURCE).not.toMatch(/Integration with existing gamification functionality will be completed in the next phase/);
    expect(SOURCE).not.toMatch(/This tab will show the gamification content/);
  });

  it('keeps route-state panels extracted from the oversized progress shell', () => {
    expect(SOURCE).toContain("from './EnhancedClientProgressViewStatePanels'");
    expect(STATE_PANEL_SOURCE).toContain('MissingClientProgressState');
    expect(STATE_PANEL_SOURCE).toContain('LoadingClientProgressState');
  });

  it('does not seed missing progress metrics with a fake midpoint value', () => {
    expect(SOURCE).not.toMatch(/\|\|\s*50/);
    expect(SOURCE).not.toMatch(/progressMetrics:\s*\{[^}]*strength:\s*50/s);
  });

  it('does not render the trainer progress shell without a selected client identity', () => {
    expect(SOURCE).toContain('if (!clientId)');
    expect(SOURCE).toContain('MissingClientProgressState');
    expect(STATE_PANEL_SOURCE).toContain('Select a client first');
    expect(SOURCE).toContain('navigate(clientHubBase)');
    expect(SOURCE).not.toContain("id: clientId, firstName: 'Loading'");
  });

  /**
   * Superseded assertion (2026-07-24): this file previously locked the literal
   * `navigate('/dashboard/trainer/clients')`. That hardcode was safe only while
   * the view was trainer-only. Now that the admin mounts the same capability,
   * the literal would demote an admin to the trainer shell on "back to clients"
   * (activeRole is URL-derived — UniversalDashboardLayout.tsx:77). The lock is
   * inverted: the hardcode is now forbidden, and the audience-resolved base is
   * required.
   */
  it('resolves the back-to-clients target by audience instead of hardcoding the trainer hub', () => {
    expect(SOURCE).not.toContain("navigate('/dashboard/trainer/clients')");
    expect(SOURCE).toContain('resolveAudienceFromPath');
    expect(SOURCE).toContain('getClientHubAudienceConfig');
    expect(SOURCE).toContain('clientManagementBase');
  });

  it('shows an explicit loading state before mounting the progress shell', () => {
    expect(SOURCE).toContain('if (isLoadingClient)');
    expect(SOURCE).toContain('LoadingClientProgressState');
    expect(STATE_PANEL_SOURCE).toContain('Loading client progress');
  });

  it('does not invent a generic client goal when the API has no goals', () => {
    expect(SOURCE).not.toMatch(/Fitness Improvement/);
  });

  it('does not downgrade missing risk data into a fake low-risk label', () => {
    expect(SOURCE).not.toMatch(/riskLevel:\s*'low'\s+as\s+const/);
    expect(SOURCE).toMatch(/riskLevel:\s*'unknown'/);
  });

  it('does not manufacture comparison analytics from hardcoded benchmark stories', () => {
    expect(COMPARISON_SOURCE).toContain('/api/client-progress/${clientId}/comparison');
    expect(COMPARISON_SOURCE).not.toMatch(/Generate comparison mock data/);
    expect(COMPARISON_SOURCE).not.toMatch(/client:\s*75/);
    expect(COMPARISON_SOURCE).not.toMatch(/Compared to 12 clients/);
    expect(COMPARISON_SOURCE).not.toMatch(/Bench 100kg|Run 5K under 25min|Core Development/);
  });

  it('does not manufacture goal tracking and achievements from hardcoded stories', () => {
    expect(GOAL_TRACKER_SOURCE).toContain('/api/client-progress/${clientId}/goals');
    expect(GOAL_TRACKER_SOURCE).not.toMatch(/Generate comprehensive goal tracking data/);
    expect(GOAL_TRACKER_SOURCE).not.toMatch(/Lose 15 lbs|Bench Press 100kg|Run 5K under 25 minutes/);
    expect(GOAL_TRACKER_SOURCE).not.toMatch(/First Milestone Master|Consistency Champion|Goal Crusher/);
  });

  it('does not expose goal add or update controls as no-op UI', () => {
    expect(GOAL_TRACKER_SOURCE).toContain("authAxios.post(`/api/client-progress/${clientId}/goals`");
    expect(GOAL_TRACKER_SOURCE).toContain("authAxios.put(`/api/client-progress/${clientId}/goals/${goal.id}`");
    expect(GOAL_TRACKER_SOURCE).not.toMatch(/\/\* Edit goal \*\//);
    expect(GOAL_TRACKER_SOURCE).not.toMatch(/<AccentButton>Update Progress<\/AccentButton>/);
  });

  it('does not manufacture goal insight dates or likelihood from missing API evidence', () => {
    expect(GOAL_TRACKER_COMBINED_SOURCE).not.toMatch(/predictedCompletion\s*\?\?\s*Date\.now\(\)/);
    expect(GOAL_TRACKER_COMBINED_SOURCE).toContain('formatPredictedCompletion');
    expect(GOAL_TRACKER_COMBINED_SOURCE).toContain('formatSuccessLikelihood');
    expect(GOAL_TRACKER_COMBINED_SOURCE).toContain('Not enough evidence yet');
  });

  it('does not manufacture injury risk assessment findings from hardcoded stories', () => {
    expect(INJURY_RISK_SOURCE).toContain('/api/client-progress/${clientId}/risk-assessment');
    expect(INJURY_RISK_SOURCE).not.toMatch(/Generate comprehensive risk assessment/);
    expect(INJURY_RISK_SOURCE).not.toMatch(/Proper knee tracking|Slight shoulder impingement pattern|Averaging 5\.5 hours/);
    expect(INJURY_RISK_SOURCE).not.toMatch(/Recovery Deficit|Volume Spike|Clamshells|Couch Stretch/);
  });
});
