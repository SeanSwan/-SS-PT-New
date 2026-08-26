/**
 * FILE: MessagingSummary.tsx
 * PURPOSE: The "Communication Hub" header — kicker, title and the three status
 *          tiles (threads / unread / live). Extracted 2026-08-25 so
 *          MessagingView.tsx sits under the 300-line cap (ox-alpha, GLM 5.3).
 *          Hidden on phones while a thread is open: the header plus three
 *          stacked tiles pushed the conversation out of the viewport once the
 *          keyboard rose (Gemini 3.1 Pro).
 */
import React from 'react';
import styled from 'styled-components';

const MessagingSummary = styled.header<{ $mobileHidden?: boolean }>`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  /* On a phone the thread IS the screen. This header plus three metric tiles
     stacks into four blocks above the conversation, and once the keyboard opens
     the messages are pushed out of the viewport entirely — so a user who tapped
     a conversation has to scroll to find it. Hidden while a thread is open,
     matching how the list panel already yields (Gemini 3.1 Pro, UX panel). */
  @media (max-width: 1024px) {
    display: ${({ $mobileHidden }) => ($mobileHidden ? 'none' : 'flex')};
  }
`;

const SummaryCopy = styled.div`
  min-width: 0;
`;

const SummaryKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
`;

const SummaryTitle = styled.h1`
  margin: 0.15rem 0 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.85rem;

  @media (max-width: 520px) {
    font-size: 1.45rem;
  }
`;

const SummaryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryMetric = styled.div<{ $accent?: boolean; $live?: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 8%),
    var(--bg-base, #0A0A0F));
  padding: 0.7rem 0.85rem;

  strong {
    display: block;
    color: ${({ $accent, $live }) => ($accent
      ? 'var(--accent-secondary, #8B5CF6)'
      : $live
        ? 'var(--success, #4ECDC4)'
        : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
  }
`;

export interface MessagingSummaryBarProps {
  threads: number;
  unread: number;
  connected: boolean;
  mobileHidden: boolean;
}

export const MessagingSummaryBar: React.FC<MessagingSummaryBarProps> = ({ threads, unread, connected, mobileHidden }) => (
  <MessagingSummary $mobileHidden={mobileHidden}>
    <SummaryCopy>
      <SummaryKicker>Communication Hub</SummaryKicker>
      <SummaryTitle>Messages</SummaryTitle>
    </SummaryCopy>
    <SummaryMetrics aria-label="Messaging status">
      <SummaryMetric><strong>{threads}</strong><span>Threads</span></SummaryMetric>
      <SummaryMetric $accent={unread > 0}><strong>{unread}</strong><span>Unread</span></SummaryMetric>
      <SummaryMetric $live={connected}><strong>{connected ? 'Live' : 'Polling'}</strong><span>Status</span></SummaryMetric>
    </SummaryMetrics>
  </MessagingSummary>
);
