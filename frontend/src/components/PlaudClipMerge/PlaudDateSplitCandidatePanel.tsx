/**
 * PlaudDateSplitCandidatePanel
 * ============================
 * Compact review panel for deterministic multi-date transcript split findings
 * with optional per-segment approval actions.
 */
import type { PlaudDateSplitCandidates, PlaudDateSplitSegment } from '../../services/plaudMergeService';
import {
  ActionRow,
  Button,
  DateSplitBadge,
  DateSplitCard,
  DateSplitExcerpt,
  DateSplitGrid,
  DateSplitTitle,
  DateSplitTopline,
  ReviewHeading,
} from './PlaudMergeWorkspace.styles';

interface PlaudDateSplitCandidatePanelProps {
  candidates?: PlaudDateSplitCandidates | null;
  approvalStates?: Record<string, {
    status: 'idle' | 'parsing' | 'logged' | 'error';
    workoutId?: number | string;
    error?: string;
  }>;
  canApproveSegments?: boolean;
  onApproveSegment?: (segment: PlaudDateSplitSegment) => void;
}

function toneForSegment(segment: PlaudDateSplitSegment): 'ready' | 'review' | 'blocked' {
  if (segment.futureDateBlocked) return 'blocked';
  if (segment.needsDateConfirmation) return 'review';
  return 'ready';
}

function statusLabel(segment: PlaudDateSplitSegment): string {
  if (segment.futureDateBlocked) return 'Future blocked';
  if (segment.needsDateConfirmation) return 'Confirm date';
  return 'Ready date';
}

function sourceLabel(segment: PlaudDateSplitSegment): string {
  if (segment.dateSource === 'reference_timeline') return 'reference timeline';
  if (segment.dateSource === 'phrase:last_weekday') return 'last weekday phrase';
  return segment.dateSource.replace(/[:_]/g, ' ');
}

function lineLabel(segment: PlaudDateSplitSegment): string {
  if (!segment.startLine || !segment.endLine) return 'lines unavailable';
  if (segment.startLine === segment.endLine) return `line ${segment.startLine}`;
  return `lines ${segment.startLine}-${segment.endLine}`;
}

export function PlaudDateSplitCandidatePanel({
  candidates,
  approvalStates = {},
  canApproveSegments = false,
  onApproveSegment,
}: PlaudDateSplitCandidatePanelProps): JSX.Element | null {
  const segments = candidates?.segments || [];
  if (segments.length === 0) return null;

  return (
    <section aria-label="PLAUD workout date candidates">
      <ReviewHeading>
        Split workout dates ({segments.length})
      </ReviewHeading>
      <DateSplitGrid>
        {segments.map((segment) => {
          const tone = toneForSegment(segment);
          const approval = approvalStates[segment.segmentId];
          return (
            <DateSplitCard key={segment.segmentId} $tone={tone}>
              <DateSplitTopline>
                <DateSplitTitle>
                  <strong>{segment.date}</strong>
                  <span>
                    Segment {segment.segmentIndex} - {lineLabel(segment)}
                  </span>
                  <span>
                    {sourceLabel(segment)}
                    {segment.evidence ? ` - "${segment.evidence}"` : ''}
                  </span>
                </DateSplitTitle>
                <DateSplitBadge $tone={tone}>{statusLabel(segment)}</DateSplitBadge>
              </DateSplitTopline>
              <DateSplitExcerpt>{segment.text}</DateSplitExcerpt>
              {onApproveSegment ? (
                <ActionRow>
                  <Button
                    type="button"
                    $primary={tone === 'ready'}
                    disabled={
                      !canApproveSegments
                      || tone !== 'ready'
                      || approval?.status === 'parsing'
                      || approval?.status === 'logged'
                    }
                    onClick={() => onApproveSegment(segment)}
                  >
                    {approval?.status === 'parsing'
                      ? 'Parsing...'
                      : approval?.status === 'logged'
                        ? `Logged${approval.workoutId ? ` #${approval.workoutId}` : ''}`
                        : 'Approve segment'}
                  </Button>
                  {approval?.status === 'error' && approval.error ? (
                    <span role="alert">{approval.error}</span>
                  ) : null}
                </ActionRow>
              ) : null}
            </DateSplitCard>
          );
        })}
      </DateSplitGrid>
    </section>
  );
}

export default PlaudDateSplitCandidatePanel;
