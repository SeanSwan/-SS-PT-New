import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { retentionCandidateItems, retentionCandidateKey } from './CoachIntakeRetentionCandidates';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachIntakeRetentionCandidates identity contract', () => {
  it('stays wired into the canonical Coach intake retention surface', () => {
    const layoutSource = readDashboardFile('UniversalDashboardLayout.tsx');
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    const workspaceSource = readCoachFile('CoachIntakeWorkspace.tsx');
    const healthStripSource = readCoachFile('CoachIntakeHealthStrip.tsx');
    const serviceSource = readFileSync(resolve(__dirname, '../../../../services/coachIntakeService.ts'), 'utf8');

    expect(layoutSource).toContain("const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(layoutSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain('<CoachIntakeWorkspace');
    expect(workspaceSource).toContain('retention={queue.retention}');
    expect(healthStripSource).toContain('<CoachIntakeRetentionCandidates retention={retention} />');
    expect(serviceSource).toContain("'/api/coach/intake/retention'");
  });

  it('uses deterministic retention candidate keys without falling back to map indexes', () => {
    const source = readCoachFile('CoachIntakeRetentionCandidates.tsx');

    expect(source).toContain('export function retentionCandidateKey');
    expect(source).toContain('retentionCandidateItems(items)');
    expect(source).toContain('key={candidate.key}');
    expect(source).not.toMatch(/key=\{item\.id \|\| `retention-candidate-\$\{index\}`\}/);

    expect(retentionCandidateKey({
      sourceType: 'audio_upload',
      status: 'APPLIED',
      classification: 'purge_ready',
      reason: 'archived_raw_artifact_grace_elapsed',
      recordedAt: '2026-05-31T16:00:00.000Z',
    })).toBe('retention-candidate-audio_upload-APPLIED-purge_ready-archived_raw_artifact_grace_elapsed-2026-05-31T16:00:00.000Z');

    expect(retentionCandidateItems([
      { classification: 'review_required', reason: 'stale_unapplied_raw_artifact' },
      { classification: 'review_required', reason: 'stale_unapplied_raw_artifact' },
    ]).map((candidate) => candidate.key)).toEqual([
      'retention-candidate-unknown-source-unknown-status-review_required-stale_unapplied_raw_artifact-unknown-time-1',
      'retention-candidate-unknown-source-unknown-status-review_required-stale_unapplied_raw_artifact-unknown-time-2',
    ]);
  });
});
