/**
 * CoachAudioInspectionResultCard.tsx
 * ==================================
 * Coach command result renderer for audio-piece inspection summaries.
 *
 * Keeps the live Coach Assistant command lane operational instead of exposing
 * raw command transport keys when Sean asks Coach to inspect voice-note pieces.
 */
import styled from 'styled-components';
import { AlertTriangle, CheckCircle, GitBranch } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';

interface AudioInspectionItem {
  id?: string | null;
  kind?: string | null;
  queueStatus?: string | null;
  audioPieces?: number;
  audioBundles?: number;
  audioConfidence?: string;
  needsOrderingReview?: boolean;
  reviewRoute?: string | null;
}

interface CoachAudioInspectionResultCardProps {
  command: string;
  result: Record<string, unknown>;
  message?: string;
}

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent),
      color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)
    ),
    var(--bg-surface, #1A1A24);
`;

const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  margin: 12px 0;
`;

const SummaryPill = styled.div`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #003080) 34%, transparent);
  padding: 8px 10px;
  font-family: 'Sora', sans-serif;
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  font-weight: 700;
`;

const Hint = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

const ItemList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 10px;
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 46%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

const ItemMain = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const Tag = styled.span<{ $tone?: 'gold' | 'purple' }>`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 38%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'};
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-luxury, #C6A84B)'
      : 'var(--accent-secondary, #8B5CF6)'};
  background: ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 10%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)'};
`;

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function audioItems(value: unknown): AudioInspectionItem[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as AudioInspectionItem[] : [];
}

export function isAudioInspectionCommand(command: string): boolean {
  return command === 'inspect_coach_audio_pieces' || command === 'inspect_plaud_audio_pieces';
}

export function CoachAudioInspectionResultCard({
  command,
  result,
  message,
}: CoachAudioInspectionResultCardProps) {
  const totalAudioItems = numberValue(result.totalAudioItems);
  const needsOrderingReview = numberValue(result.needsOrderingReview);
  const lowConfidence = numberValue(result.lowConfidence);
  const items = audioItems(result.items).slice(0, 3);
  const hint = typeof result.commandHint === 'string' ? result.commandHint : null;

  return (
    <CardShell>
      <CardTitle><CheckCircle size={16} aria-hidden="true" /> Audio pieces inspected</CardTitle>
      {message && <Hint>{message}</Hint>}
      <SummaryGrid aria-label="Audio inspection summary">
        <SummaryPill>{plural(totalAudioItems, 'audio item')}</SummaryPill>
        <SummaryPill>{needsOrderingReview} needs order review</SummaryPill>
        <SummaryPill>{lowConfidence} low confidence</SummaryPill>
      </SummaryGrid>
      {items.length > 0 && (
        <ItemList aria-label="Audio piece review targets">
          {items.map((item, index) => (
            <ItemRow key={item.id || `audio-item-${index}`}>
              <ItemMain>
                <GitBranch size={14} aria-hidden="true" />
                <strong>{plural(numberValue(item.audioPieces), 'piece')}</strong>
                <Tag>{plural(numberValue(item.audioBundles), 'bundle')}</Tag>
                <span>{String(item.audioConfidence || 'medium')} confidence</span>
                {item.needsOrderingReview && <Tag $tone="gold">order review</Tag>}
              </ItemMain>
              {item.queueStatus === 'failed' && <AlertTriangle size={15} aria-label="Failed item" />}
            </ItemRow>
          ))}
        </ItemList>
      )}
      {hint && <Hint>{hint}</Hint>}
      <CommandRouteAction command={command} result={result} />
    </CardShell>
  );
}
