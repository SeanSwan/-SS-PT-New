/**
 * FILE: MessageThreadCoachIntelligence.tsx
 * PURPOSE: Read-only Swan Coach thread brief panel for the mounted messaging surface.
 * DATA: Builds deterministic local thread context only; no autonomous writes and no raw message text in deep links.
 */
import React, { useMemo, useState } from 'react';
import { CalendarClock, ClipboardCheck, ClipboardList, Dumbbell, ExternalLink, MessageCircleReply, Sparkles } from 'lucide-react';
import styled from 'styled-components';
import type { MessageData } from './MessagingTypes';
import { buildCoachMessageActionHrefs, buildCoachThreadBrief, buildCoachThreadHref } from './MessageThreadCoachIntelligence.logic';

const MESSAGE_ACTION_ICONS = {
  create_task_from_message: ClipboardCheck,
  schedule_from_message: CalendarClock,
  log_workout_from_message: Dumbbell,
} as const;

interface Props {
  messages: MessageData[];
  currentUserId: string | number;
  conversationId: string | number | null;
  currentUserRole?: string | null;
  participantLabel: string;
  onUseSuggestedReply: (reply: string) => void;
}

const MessageThreadCoachIntelligence: React.FC<Props> = ({
  messages,
  currentUserId,
  conversationId,
  currentUserRole,
  participantLabel,
  onUseSuggestedReply,
}) => {
  const [expanded, setExpanded] = useState(false);
  const brief = useMemo(
    () => buildCoachThreadBrief(messages, currentUserId, participantLabel),
    [currentUserId, messages, participantLabel],
  );
  const coachHref = useMemo(
    () => buildCoachThreadHref(currentUserRole, conversationId),
    [conversationId, currentUserRole],
  );
  const coachActionHrefs = useMemo(
    () => buildCoachMessageActionHrefs(currentUserRole, conversationId, brief.sourceMessageId),
    [brief.sourceMessageId, conversationId, currentUserRole],
  );

  return (
    <CoachBand>
      <CoachHeader>
        <CoachTitleGroup>
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <CoachKicker>Swan Coach</CoachKicker>
            <CoachTitle>Thread brief</CoachTitle>
          </div>
        </CoachTitleGroup>
        <CoachButton
          type="button"
          aria-label={expanded ? 'Hide Swan Coach thread brief' : 'Summarize thread with Swan Coach'}
          onClick={() => setExpanded(open => !open)}
        >
          <ClipboardList size={16} aria-hidden="true" />
          Brief
        </CoachButton>
      </CoachHeader>

      {expanded && (
        <CoachBriefRegion role="region" aria-label="Swan Coach thread brief">
          <CoachMetricRow>
            <CoachMetric><strong>{brief.messageCount}</strong><span>Messages</span></CoachMetric>
            <CoachMetric><strong>{brief.flagLabels.length}</strong><span>Flags</span></CoachMetric>
          </CoachMetricRow>

          <FlagRow aria-label="Coach action flags">
            {brief.flagLabels.length > 0
              ? brief.flagLabels.map(label => <FlagPill key={label}>{label}</FlagPill>)
              : <QuietFlag>No urgent flags</QuietFlag>}
          </FlagRow>

          <CoachText><strong>Latest</strong><span>{brief.summary}</span></CoachText>
          <CoachText><strong>Task seed</strong><span>{brief.taskSeed}</span></CoachText>
          <CoachText><strong>Suggested reply</strong><span>{brief.suggestedReply}</span></CoachText>

          {coachActionHrefs.length > 0 && (
            <CoachActionGrid aria-label="Message Coach actions">
              {coachActionHrefs.map(action => {
                const Icon = MESSAGE_ACTION_ICONS[action.intent];
                return (
                  <CoachActionLink key={action.intent} href={action.href} aria-label={action.ariaLabel}>
                    <Icon size={15} aria-hidden="true" />
                    {action.label}
                  </CoachActionLink>
                );
              })}
            </CoachActionGrid>
          )}

          <CoachFooter>
            {coachHref && (
              <CoachLink href={coachHref} aria-label="Open Swan Coach">
                Open Swan Coach
                <ExternalLink size={14} aria-hidden="true" />
              </CoachLink>
            )}
            <CoachButton type="button" aria-label="Use suggested reply" onClick={() => onUseSuggestedReply(brief.suggestedReply)}>
              <MessageCircleReply size={16} aria-hidden="true" />
              Use reply
            </CoachButton>
          </CoachFooter>
        </CoachBriefRegion>
      )}
    </CoachBand>
  );
};

export default MessageThreadCoachIntelligence;

const CoachBand = styled.section`
  display: grid;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-secondary, #8B5CF6) 6%);
`;

const CoachHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const CoachTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  color: var(--accent-primary, #60C0F0);
`;

const CoachKicker = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: var(--accent-primary, #60C0F0);
`;

const CoachTitle = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
`;

const CoachButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 0 0.8rem;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const CoachBriefRegion = styled.div`
  display: grid;
  gap: 0.65rem;
`;

const CoachMetricRow = styled.div`
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
`;

const CoachMetric = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));

  strong { color: var(--text-primary, #E0ECF4); }
`;

const FlagRow = styled.div`
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
`;

const FlagPill = styled.span`
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
`;

const QuietFlag = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-size: 0.78rem;
`;

const CoachText = styled.p`
  display: grid;
  gap: 0.2rem;
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.74));
  font-size: 0.82rem;
  overflow-wrap: anywhere;

  strong { color: var(--text-primary, #E0ECF4); }
`;

const CoachActionGrid = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const CoachActionLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 84%, var(--accent-secondary, #8B5CF6) 10%);
  color: var(--text-primary, #E0ECF4);
  padding: 0 0.75rem;
  text-decoration: none;
  font-weight: 800;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const CoachFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-wrap: wrap;
`;

const CoachLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  color: var(--accent-primary, #60C0F0);
  padding: 0 0.8rem;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;