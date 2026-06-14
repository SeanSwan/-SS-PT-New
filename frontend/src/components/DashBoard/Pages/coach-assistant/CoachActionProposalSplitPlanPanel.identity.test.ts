import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { splitCandidateItems, splitCandidateKey } from './CoachActionProposalSplitPlanPanel';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachActionProposalSplitPlanPanel identity contract', () => {
  it('keeps legacy Swan Coach proposal review modules wired for backward-compatible transcripts', () => {
    const layoutSource = readDashboardFile('UniversalDashboardLayout.tsx');
    const pageSource = readCoachFile('SwanCoachAssistantPage.tsx');
    const messagesSource = readCoachFile('SwanCoachMessagesPanel.tsx');
    const messageSource = readCoachFile('CoachMessage.tsx');
    const proposalCardSource = readCoachFile('CoachActionProposalCard.tsx');
    const proposalServiceSource = readFileSync(
      resolve(__dirname, '../../../../services/coachProposalService.ts'),
      'utf8',
    );

    expect(layoutSource).toContain("const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(layoutSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain('<SwanCoachMessagesPanel');
    expect(messagesSource).toContain('<CoachMessage');
    expect(messageSource).toContain('<CoachActionProposalCard key={proposal.id}');
    expect(proposalCardSource).toContain('<CoachActionProposalSplitPlanPanel detail={detail} />');
    expect(proposalServiceSource).toContain('/api/coach/proposals/');
  });

  it('keys split candidates by row identity instead of list position', () => {
    const source = readCoachFile('CoachActionProposalSplitPlanPanel.tsx');

    expect(source).toContain('export function splitCandidateKey');
    expect(source).toContain('key={item.key}');
    expect(source).toContain('splitCandidateItems(splits)');
    expect(source).not.toMatch(/key=\{`split-\$\{index \+ 1\}`\}/);

    expect(splitCandidateKey({
      date: '2026-05-31',
      recordedAtStart: '2026-05-31T16:00:00.000Z',
      recordedAtEnd: '2026-05-31T17:00:00.000Z',
      redactedEvidenceRefCount: 2,
    })).toBe('split-candidate-2026-05-31-2026-05-31T16:00:00.000Z-2026-05-31T17:00:00.000Z-2');

    expect(splitCandidateKey({
      recordedAtStart: 'bad timestamp',
      reason: 'Trainer asked for separate workout logs.',
    })).toBe('split-candidate-unknown-date-unknown-start-unknown-end-0');

    expect(splitCandidateItems([
      { reason: 'Trainer asked for separate workout logs.' },
      { reason: 'Trainer asked for separate workout logs.' },
    ]).map((item) => item.key)).toEqual([
      'split-candidate-unknown-date-unknown-start-unknown-end-0-1',
      'split-candidate-unknown-date-unknown-start-unknown-end-0-2',
    ]);
  });
});
