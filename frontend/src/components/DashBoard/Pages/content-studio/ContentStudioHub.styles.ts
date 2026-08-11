/**
 * ============================================================================
 * FILE: ContentStudioHub.styles.ts
 * PURPOSE: Styled components for ContentStudioHub layout, tabs, service cards
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * ============================================================================
 */

import styled from 'styled-components';

export const Page = styled.div`
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  gap: 16px;
  flex-wrap: wrap;
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const Title = styled.h1`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const StudioBrief = styled.p`
  flex: 1 1 360px;
  max-width: 720px;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
`;

export const TierBadge = styled.span<{ $tier: 'bootstrap' | 'full' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 6px;
  color: ${({ $tier }) => ($tier === 'full' ? 'var(--accent-luxury, #C6A84B)' : 'var(--accent-primary, #60C0F0)')};
  background: ${({ $tier }) =>
    $tier === 'full' ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 15%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  border: 1px solid ${({ $tier }) =>
    $tier === 'full' ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 30%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
`;

export const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
  gap: 12px;
  padding: 16px 24px;
`;

export const ServiceCard = styled.div<{ $configured: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $configured }) =>
    $configured ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'};
  transition: all 0.2s ease;
  &:hover { background: var(--bg-surface, #1A1A24); }
`;

export const ServiceIcon = styled.div<{ $configured: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $configured }) =>
    $configured ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)' : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'};
  color: ${({ $configured }) => ($configured ? 'var(--accent-primary, #60C0F0)' : 'var(--accent-secondary, #8B5CF6)')};
  flex-shrink: 0;
`;

export const ServiceInfo = styled.div` min-width: 0; `;

export const ServiceLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ServiceMeta = styled.div<{ $configured: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: ${({ $configured }) => ($configured ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent)')};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: 0 24px;
  /* 8% alpha reads as nothing outside OLED; a divider that carries layout meaning
     needs to survive an average panel. */
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  /* The hidden scrollbar is deliberate, but on its own it left NO signal that tabs
     existed past the viewport edge — on a phone the later tabs were simply invisible.
     A narrow edge fade restores the "there is more this way" cue without reinstating
     a scrollbar, and proximity snapping stops a tab from resting half-clipped. */
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
  scroll-snap-type: x proximity;
  scroll-padding-inline: 24px;

  /* 48px of gutter on a 375px screen is 13% of the viewport spent on nothing. */
  @media (max-width: 414px) {
    padding: 0 12px;
    scroll-padding-inline: 12px;
  }
`;

export const Tab = styled.button<{ $active: boolean; $locked?: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: ${({ $locked }) => ($locked ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  min-height: 44px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active, $locked }) =>
    $locked ? 'color-mix(in srgb, var(--text-primary, #E0ECF4) 30%, transparent)'
    : $active ? 'var(--text-primary, #E0ECF4)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent)'};
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent')};
  white-space: nowrap;
  scroll-snap-align: start;
  transition: all 0.2s ease;
  opacity: ${({ $locked }) => ($locked ? 0.5 : 1)};

  &:hover:not([disabled]) { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
  svg { flex-shrink: 0; }
`;

export const TabContent = styled.div` min-height: 400px; `;

export const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  font-size: 0.9rem;
`;

export const WorkflowPanel = styled.section`
  display: grid;
  gap: 18px;
  padding: clamp(18px, 3vw, 28px) 24px 32px;
`;

export const WorkflowHeader = styled.div`
  display: grid;
  gap: 8px;
  max-width: 860px;
`;

export const WorkflowTitle = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font: 800 1.15rem/1.25 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const WorkflowCopy = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 500 0.88rem/1.55 var(--font-ui, 'Sora', sans-serif);
`;

export const WorkflowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 10px;
`;

export const WorkflowStep = styled.div`
  display: flex;
  min-width: 0;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card, #141419) 82%, transparent);
  padding: 12px;
`;

export const WorkflowStepIcon = styled.span`
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

export const WorkflowStepBody = styled.span`
  display: grid;
  min-width: 0;
  gap: 3px;
`;

export const WorkflowStepLabel = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 800 0.82rem/1.2 var(--font-ui, 'Sora', sans-serif);
`;

export const WorkflowStepMeta = styled.span`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
  font: 500 0.74rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const WorkflowActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const WorkflowActionButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 800 0.8rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 14px;

  &:hover {
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;
