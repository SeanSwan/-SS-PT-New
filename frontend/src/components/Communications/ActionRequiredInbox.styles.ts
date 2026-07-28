/**
 * FILE: ActionRequiredInbox.styles.ts
 * PURPOSE: Styled-components for the Communications OS action-required queue.
 */
import styled, { css } from 'styled-components';

export const ActionInboxShell = styled.section`
  display: grid;
  gap: 0.75rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, var(--accent-secondary, #8B5CF6) 8%),
    var(--bg-base, #0A0A0F));
  padding: 0.85rem;
`;

export const ActionInboxHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const ActionTitleBlock = styled.div`
  min-width: 0;
`;

export const ActionKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font: 700 0.68rem/1 'Fira Code', monospace;
`;

export const ActionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.2rem 0 0;
  color: var(--text-heading, #E0ECF4);
  font: 800 1rem/1.2 'Plus Jakarta Sans', sans-serif;
`;

export const RefreshButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 700 0.74rem/1 'Sora', sans-serif;
  padding: 0 0.75rem;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ActionList = styled.div`
  display: grid;
  gap: 0.65rem;
`;

export const ActionCard = styled.article`
  display: grid;
  gap: 0.45rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 84%, var(--accent-secondary, #8B5CF6) 8%);
  padding: 0.75rem;
`;

export const ActionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font: 700 0.68rem/1.2 'Fira Code', monospace;
`;

export const PriorityPill = styled.span`
  border: 1px solid var(--accent-secondary, #8B5CF6);
  border-radius: 999px;
  color: var(--accent-primary, #60C0F0);
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
`;

export const ActionCardTitle = styled.h3`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font: 800 0.92rem/1.25 'Sora', sans-serif;
`;

export const ActionMessage = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.74));
  font-size: 0.78rem;
  line-height: 1.45;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.15rem;
`;

const actionControlStyles = css`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.72rem/1 'Sora', sans-serif;
  padding: 0 0.7rem;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ActionLink = styled.a`
  ${actionControlStyles}
  text-decoration: none;
`;

export const ActionButton = styled.button`
  ${actionControlStyles}
  cursor: pointer;
`;

export const ActionState = styled.div`
  min-height: 54px;
  display: flex;
  align-items: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font: 700 0.82rem/1.3 'Sora', sans-serif;
`;
