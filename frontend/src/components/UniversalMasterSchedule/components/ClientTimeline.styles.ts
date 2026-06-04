/**
 * Extracted styles for the client-facing schedule timeline.
 */

import styled from 'styled-components';
import { CLIENT_TIMELINE_THEME as T } from './ClientTimeline.theme';

export const TimelineContainer = styled.div`
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0 auto;
  padding: 16px;
`;

export const CreditsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${T.surfaceGlass};
  backdrop-filter: blur(16px);
  border: 1px solid ${T.borderSubtle};
  border-radius: 12px;
`;

export const CreditsLabel = styled.span`
  color: ${T.textMuted};
  font-size: 14px;
  font-weight: 500;
`;

export const CreditsValue = styled.span`
  color: ${T.accentPrimary};
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const SectionLabel = styled.h3<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  color: ${p => (p.$muted ? T.textMuted : T.textPrimary)};
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background: ${T.surfaceGlass};
  backdrop-filter: blur(16px);
  border: 1px solid ${T.borderSubtle};
  border-radius: 16px;
  text-align: center;
`;

export const EmptyTitle = styled.h3`
  margin: 16px 0 8px;
  color: ${T.textPrimary};
  font-size: 18px;
  font-weight: 600;
`;

export const EmptyText = styled.p`
  max-width: 320px;
  color: ${T.textMuted};
  font-size: 14px;
  line-height: 1.5;
`;
