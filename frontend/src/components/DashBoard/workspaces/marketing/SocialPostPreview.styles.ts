/**
 * Styled preview primitives for the Marketing approval-queue post composer.
 */

import styled from 'styled-components';
import { hexAlpha } from '../../../../components/Charts/chartTheme';
import { StatusBanner } from './SocialPostGenerator.styles';

export { StatusBanner };

export const PreviewCard = styled.div<{ $color: string }>`
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ $color }) => hexAlpha($color, 0.2)};
  background: var(--bg-elevated, #141419);
`;

export const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

export const PreviewAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-midnight, #002060), var(--accent-primary, #60C0F0));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-on-accent, #FFFFFF);
`;

export const PreviewName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const PreviewBody = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  white-space: pre-wrap;
  margin-bottom: 8px;
`;

export const PreviewTags = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

export const PublishingNote = styled.div`
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;
