/**
 * CopilotDraftReview.styles
 *
 * Purpose: Keeps draft-review style atoms out of the AI workout plan renderer
 * so the editor can be split into smaller workflow sections.
 */

import styled from 'styled-components';
import {
  ExplainCard,
  Label,
  SWAN_CYAN,
} from './copilot-shared-styles';

export const PanelIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 2px;
`;

export const DayExerciseCount = styled.span`
  margin-left: auto;
  color: var(--text-muted, #64748b);
  font-size: 0.85rem;
`;

export const ExerciseLabel = styled(Label)`
  color: ${SWAN_CYAN};
  font-weight: 700;
`;

export const FullWidthExplainCard = styled(ExplainCard)`
  grid-column: 1 / -1;
`;

export const RecommendationTableScroll = styled.div`
  overflow-x: auto;
`;

export const RecommendationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

export const RecommendationHeadRow = styled.tr`
  border-bottom: 1px solid var(--border-soft, rgba(255, 255, 255, 0.1));
`;

export const RecommendationRow = styled.tr`
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.05));
`;

export const RecommendationHeader = styled.th`
  padding: 8px 12px;
  color: var(--text-muted, #64748b);
  font-weight: 600;
  text-align: left;
`;

export const RecommendationCell = styled.td<{ $accent?: boolean; $primary?: boolean }>`
  padding: 8px 12px;
  color: ${({ $accent, $primary }) => {
    if ($accent) return SWAN_CYAN;
    if ($primary) return 'var(--text-primary, #e2e8f0)';
    return 'var(--text-secondary, #94a3b8)';
  }};
  font-weight: ${({ $accent }) => ($accent ? 600 : 400)};
`;
