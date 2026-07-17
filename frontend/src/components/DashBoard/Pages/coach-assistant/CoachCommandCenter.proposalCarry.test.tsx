/**
 * Regression (v2 P0.1): chat-lane action proposals must reach the canonical
 * Command Center transcript on BOTH paths — the live reply (interpreter →
 * log entry) and loaded thread history (chatLogs) — and render a real
 * confirm card. Before this fix, chatLogs dropped all message metadata and
 * the merge dedup preferred the proposal-less live entry: clients' chat-lane
 * "Log workout" proposals were invisible on this surface.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { interpretCoachChatResponse } from './CoachCommandCenter.chatResponse';
import { buildConversationLogs, mergeTranscriptLogs } from './CoachCommandCenter.chatLogs';
import CoachCommandLogEntry from './CoachCommandLogEntry';
import type { CoachActionProposal } from './SwanCoachTypes';

const proposal: CoachActionProposal = {
  id: 'prop-1',
  type: 'workout_log',
  status: 'PENDING',
  title: 'Log workout for Client #84',
  summary: { exercise: 'Goblet Squat', sets: 3, reps: 12 },
};

describe('chat-lane proposal carry (canonical Command Center)', () => {
  it('live reply outcome carries proposals from message metadata', () => {
    const outcome = interpretCoachChatResponse(
      { role: 'assistant', content: 'Here is the draft.', metadata: { coachActionProposals: [proposal] } },
      'log workout',
    );
    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') expect(outcome.proposals).toEqual([proposal]);
  });

  it('a blank-body reply WITH proposals is still a reply, never the empty state', () => {
    const outcome = interpretCoachChatResponse(
      { role: 'assistant', content: '', metadata: { coachActionProposals: [proposal] } },
      'log workout',
    );
    expect(outcome.kind).toBe('reply');
    if (outcome.kind === 'reply') {
      expect(outcome.proposals).toEqual([proposal]);
      // Body stays blank so the live entry and its persisted copy share a
      // dedup key — one card, not two.
      expect(outcome.body).toBe('');
    }
  });

  it('live and history copies of one blank-body proposal reply dedupe to a single card', () => {
    const live = [{ id: 'live-1', actor: 'coach' as const, label: 'coach reply', body: '', proposals: [proposal] }];
    const history = buildConversationLogs(501, [
      { role: 'assistant', content: '', timestamp: '2026-07-17T00:00:01.000Z', metadata: { coachActionProposals: [proposal] } } as never,
    ]);
    const merged = mergeTranscriptLogs(live, history);
    const proposalEntries = merged.filter((entry) => entry.proposals?.length);
    expect(proposalEntries).toHaveLength(1);
    // Two DIFFERENT blank-body proposal replies must NOT collide.
    const other = { ...proposal, id: 'prop-2' };
    const historyTwo = buildConversationLogs(501, [
      { role: 'assistant', content: '', timestamp: '2026-07-17T00:00:02.000Z', metadata: { coachActionProposals: [other] } } as never,
    ]);
    expect(mergeTranscriptLogs(live, historyTwo).filter((entry) => entry.proposals?.length)).toHaveLength(2);
  });

  it('loaded thread history carries proposals (including blank-body proposal messages)', () => {
    const logs = buildConversationLogs(501, [
      { role: 'user', content: 'log workout', timestamp: '2026-07-17T00:00:00.000Z' },
      {
        role: 'assistant',
        content: '',
        timestamp: '2026-07-17T00:00:01.000Z',
        metadata: { coachActionProposals: [proposal] },
      } as never,
    ]);
    expect(logs).toHaveLength(2);
    const coachEntry = logs.find((entry) => entry.actor === 'coach');
    expect(coachEntry?.proposals).toEqual([proposal]);
  });

  it('renders a visible confirm card for a proposal-bearing entry', () => {
    render(
      <MemoryRouter>
        <CoachCommandLogEntry
          entry={{
            id: 'e1',
            actor: 'coach',
            label: 'coach reply',
            body: 'Prepared an action for your review:',
            proposals: [proposal],
          }}
        />
      </MemoryRouter>,
    );
    // The card renders a PII-safe type-derived title, never the raw string.
    expect(screen.getByText(/workout log proposal/i)).toBeInTheDocument();
  });
});
