/**
 * WalkTheGymSummary — multi-photo scan session header (S7).
 * =============================================================================
 * Blueprint §10a #9 (Kimi #8 merge transparency). Rendered ABOVE the batch
 * tray when more than one photo was scanned in the same queue run:
 *
 *   "N photos · M unique items · K duplicates merged"
 *
 * - "K duplicates merged" is a 44px tappable disclosure that expands the merge
 *   receipt ("Dumbbell Rack seen in photo1.jpg & photo2.jpg → kept once") so
 *   the trainer can audit exactly what was collapsed. Nothing merges silently.
 * - Filmstrip of per-photo chips with detected-item counts; photos whose scan
 *   ran degraded get a Gilded Fern corner dot.
 * - Crystalline tokens with fallbacks, styled-components, reduced-motion safe.
 *
 * Pure presentation: all merge math lives in equipmentScanSessionMerge.ts.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { Camera, ChevronDown } from 'lucide-react';
import type { MergeReceiptEntry } from './equipmentScanSessionMerge';

export interface WalkTheGymFileChip {
  fileName: string;
  itemCount: number;
  degraded: boolean;
}

export interface WalkTheGymSummaryProps {
  photoCount: number;
  uniqueItemCount: number;
  receipt: MergeReceiptEntry[];
  files: WalkTheGymFileChip[];
}

const SessionPanel = styled.section`
  padding: 14px 16px;
  margin: 8px 0 0;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent), color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)),
    var(--surface-elevated, rgba(0, 32, 96, 0.48));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
`;

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-secondary, #8B5CF6);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const HeadlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
`;

const Dot = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

const MergeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  svg {
    transition: transform 160ms ease;
  }

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;

const ReceiptList = styled.ul`
  display: grid;
  gap: 6px;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
`;

const ReceiptRow = styled.li`
  padding: 8px 12px;
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-base, #001040) 58%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-size: 13px;

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

const Filmstrip = styled.ul`
  display: flex;
  gap: 8px;
  list-style: none;
  margin: 12px 0 0;
  padding: 0 0 4px;
  overflow-x: auto;
`;

const FileChip = styled.li`
  position: relative;
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-base, #001040) 62%, transparent);
`;

const ChipName = styled.div`
  max-width: 160px;
  overflow: hidden;
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChipMeta = styled.div`
  margin-top: 2px;
  color: var(--text-muted, rgba(224, 236, 244, 0.64));
  font-size: 11px;
`;

/* Gilded Fern corner dot — the honest "this photo's scan was limited" signal. */
const DegradedDot = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-warning, #C6A84B);
  border: 1.5px solid var(--surface-base, #001040);
`;

const plural = (count: number, singular: string): string => (
  `${count} ${singular}${count === 1 ? '' : 's'}`
);

const WalkTheGymSummary: React.FC<WalkTheGymSummaryProps> = ({
  photoCount,
  uniqueItemCount,
  receipt,
  files,
}) => {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const mergedCount = receipt.length;
  const mergedLabel = plural(mergedCount, 'duplicate') + ' merged';

  return (
    <SessionPanel aria-label="Walk-the-gym scan session summary">
      <Eyebrow>
        <Camera size={14} aria-hidden />
        Walk-the-gym session
      </Eyebrow>
      <HeadlineRow>
        <span>{plural(photoCount, 'photo')}</span>
        <Dot aria-hidden>·</Dot>
        <span>{plural(uniqueItemCount, 'unique item')}</span>
        <Dot aria-hidden>·</Dot>
        {mergedCount > 0 ? (
          <MergeToggle
            type="button"
            aria-expanded={receiptOpen}
            onClick={() => setReceiptOpen(open => !open)}
          >
            {mergedLabel}
            <ChevronDown size={16} aria-hidden />
          </MergeToggle>
        ) : (
          <span>{mergedLabel}</span>
        )}
      </HeadlineRow>

      {receiptOpen && mergedCount > 0 && (
        <ReceiptList aria-label="Merged duplicates receipt">
          {receipt.map((entry, index) => (
            <ReceiptRow key={`${entry.key}-${entry.droppedFile}-${index}`}>
              <strong>{entry.keptLabel}</strong>
              {` seen in ${entry.keptFile} & ${entry.droppedFile} → kept once`}
            </ReceiptRow>
          ))}
        </ReceiptList>
      )}

      <Filmstrip aria-label="Photos in this session">
        {files.map((file, index) => (
          <FileChip
            key={`${file.fileName}-${index}`}
            aria-label={`${file.fileName} — ${plural(file.itemCount, 'item')} detected${file.degraded ? ', limited scan' : ''}`}
          >
            <ChipName>{file.fileName}</ChipName>
            <ChipMeta>{plural(file.itemCount, 'item')}</ChipMeta>
            {file.degraded && <DegradedDot aria-hidden />}
          </FileChip>
        ))}
      </Filmstrip>
    </SessionPanel>
  );
};

export default WalkTheGymSummary;
