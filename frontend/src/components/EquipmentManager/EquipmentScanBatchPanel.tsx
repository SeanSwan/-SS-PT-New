/**
 * EquipmentScanBatchPanel - V2 scan review tray.
 *
 * Blueprint:
 * - Shows every created pending item from one scan session.
 * - Separates duplicate detections and low-confidence possible items.
 * - Never claims duplicates/possible items were added to inventory.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { EquipmentItem, EquipmentScanCandidate, EquipmentScanDuplicate } from '../../hooks/useEquipmentAPI';
import type { EquipmentScanBatch } from './equipmentScanBatch';
import {
  TRUST_TIER_LABELS,
  findDuplicateMatchedItem,
  getBatchBoundingBoxes,
  getCandidateName,
  getTrustTier,
} from './equipmentScanBatch';
import {
  ActionBar,
  ActionButton,
  ActionButtons,
  CandidateRow,
  DegradedBanner,
  DetectionBox,
  DetectionLabel,
  DangerActionButton,
  PipDot,
  DismissButton,
  Eyebrow,
  GhostActionButton,
  HeaderRow,
  ItemCopy,
  ItemList,
  ItemName,
  MetaLine,
  PreviewFrame,
  PreviewImage,
  PreviewOverlay,
  PreviewSection,
  MutedList,
  Panel,
  ReviewButton,
  ReviewRow,
  SceneSummary,
  Section,
  SectionTitle,
  SelectControl,
  SelectionLabel,
  Summary,
} from './EquipmentScanBatchPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface EquipmentScanBatchPanelProps {
  batch: EquipmentScanBatch;
  previewUrl?: string | null;
  onReviewItem: (item: EquipmentItem) => void;
  inventoryItems?: EquipmentItem[];
  onApproveSelected?: (items: EquipmentItem[]) => void | Promise<void>;
  onRejectSelected?: (items: EquipmentItem[]) => void | Promise<void>;
  onAddPossibleItem?: (candidate: EquipmentScanCandidate, candidateIndex: number) => void | Promise<void>;
  onMergeDuplicate?: (
    duplicate: EquipmentScanDuplicate,
    duplicateIndex: number,
    matchedItem: EquipmentItem,
  ) => void | Promise<void>;
  onDismiss: () => void;
  bulkActionPending?: boolean;
}

const statusLabel = (status: EquipmentItem['approvalStatus']): string => (
  status === 'pending' ? 'Pending review' : status
);

const itemLabel = (item: EquipmentItem): string => item.trainerLabel || item.name;

const sessionSummary = (batch: EquipmentScanBatch): string => {
  const created = batch.createdItems.length;
  const possible = batch.possibleItems.length;
  const duplicate = batch.duplicates.length;
  const parts = [
    `${created} pending ${created === 1 ? 'item' : 'items'}`,
    possible > 0 ? `${possible} possible` : null,
    duplicate > 0 ? `${duplicate} duplicate ${duplicate === 1 ? 'match' : 'matches'}` : null,
  ].filter(Boolean);
  return `${parts.join(' - ')} from ${batch.fileName}`;
};

const EquipmentScanBatchPanel: React.FC<EquipmentScanBatchPanelProps> = ({
  batch,
  previewUrl = null,
  onReviewItem,
  inventoryItems = [],
  onApproveSelected,
  onRejectSelected,
  onAddPossibleItem,
  onMergeDuplicate,
  onDismiss,
  bulkActionPending = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Constellation focus sync (§10a #2): tapping a box or its row spotlights
  // that detection and dims the rest of the photo. Null = no spotlight.
  const [focusedBoxId, setFocusedBoxId] = useState<string | null>(null);
  const pendingItems = useMemo(
    () => batch.createdItems.filter(item => item.approvalStatus === 'pending'),
    [batch.createdItems],
  );
  const detectionBoxes = useMemo(() => getBatchBoundingBoxes(batch), [batch]);
  const boxIdForItem = (item: EquipmentItem): string | null => {
    const id = `created-${item.id}`;
    return detectionBoxes.some(box => box.id === id) ? id : null;
  };
  const toggleFocus = (boxId: string | null) => {
    if (!boxId) return;
    setFocusedBoxId(current => (current === boxId ? null : boxId));
  };

  useEffect(() => {
    const validIds = new Set(pendingItems.map(item => item.id));
    setSelectedIds(current => new Set([...current].filter(id => validIds.has(id))));
  }, [pendingItems]);

  const selectedItems = pendingItems.filter(item => selectedIds.has(item.id));
  const selectedCount = selectedItems.length;
  const allSelected = pendingItems.length > 0 && selectedCount === pendingItems.length;
  const canAct = selectedCount > 0 && !bulkActionPending;

  const toggleItem = (itemId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pendingItems.map(item => item.id)));
  };

  return (
    <Panel aria-label="Latest equipment scan review" aria-live="polite">
      <HeaderRow>
        <div>
          <Eyebrow>Scan review tray</Eyebrow>
          <Summary>{sessionSummary(batch)}</Summary>
        </div>
        <DismissButton type="button" onClick={onDismiss}>Dismiss</DismissButton>
      </HeaderRow>

      {batch.scanSession?.sceneSummary && <SceneSummary>{batch.scanSession.sceneSummary}</SceneSummary>}
      {batch.degraded && (
        <DegradedBanner role="status">
          Limited scan — we could only identify one item confidently. Better lighting or a closer shot helps.
        </DegradedBanner>
      )}
      {previewUrl && (
        <PreviewSection aria-label="Scanned photo review">
          <PreviewFrame>
            <PreviewImage src={previewUrl} alt={`Scan preview for ${batch.fileName}`} />
            {detectionBoxes.length > 0 && (
              <PreviewOverlay>
                {detectionBoxes.map(box => (
                  <StyledBox as={DetectionBox}
                    key={box.id}
                    type="button"
                    aria-label={`${box.label} — ${TRUST_TIER_LABELS[box.tier]}`}
                    aria-pressed={focusedBoxId === box.id}
                    data-status={box.status}
                    data-focused={focusedBoxId === box.id}
                    data-dimmed={focusedBoxId !== null && focusedBoxId !== box.id}
                    onClick={() => toggleFocus(box.id)}
                    $style={{
                      left: `${box.left}%`,
                      top: `${box.top}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                  >
                    <PipDot aria-hidden>{box.status === 'possible' ? '?' : box.pip}</PipDot>
                    <DetectionLabel>{box.label}</DetectionLabel>
                  </StyledBox>
                ))}
              </PreviewOverlay>
            )}
          </PreviewFrame>
        </PreviewSection>
      )}
      {batch.createdItems.length > 0 && (
        <Section>
          <SectionTitle>Created for review</SectionTitle>
          <ActionBar aria-label="Batch review actions">
            <SelectionLabel>
              <input
                type="checkbox"
                aria-label="Select all pending scan items"
                checked={allSelected}
                disabled={pendingItems.length === 0 || bulkActionPending}
                onChange={toggleAll}
              />
              <span>{selectedCount} selected</span>
            </SelectionLabel>
            <ActionButtons>
              <ActionButton type="button" disabled={!canAct || !onApproveSelected} onClick={() => onApproveSelected?.(selectedItems)}>
                {selectedCount > 0 ? `Add ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}` : 'Add selected'}
              </ActionButton>
              <DangerActionButton type="button" disabled={!canAct || !onRejectSelected} onClick={() => onRejectSelected?.(selectedItems)}>
                Reject selected
              </DangerActionButton>
              <GhostActionButton type="button" onClick={onDismiss}>Review later</GhostActionButton>
            </ActionButtons>
          </ActionBar>
          <ItemList>
            {batch.createdItems.map((item) => {
              const pending = item.approvalStatus === 'pending';
              return (
                <ReviewRow key={item.id}>
                  <SelectControl>
                    <input
                      type="checkbox"
                      aria-label={`Select ${itemLabel(item)}`}
                      checked={selectedIds.has(item.id)}
                      disabled={!pending || bulkActionPending}
                      onChange={() => toggleItem(item.id)}
                    />
                  </SelectControl>
                  <ItemCopy
                    onClick={() => toggleFocus(boxIdForItem(item))}
                    data-has-box={boxIdForItem(item) !== null}
                  >
                    <ItemName>{itemLabel(item)}</ItemName>
                    <MetaLine>
                      {item.category} - {statusLabel(item.approvalStatus)}
                      {item.aiScanData ? ` - ${TRUST_TIER_LABELS[getTrustTier(item.aiScanData.confidence)]}` : ''}
                    </MetaLine>
                  </ItemCopy>
                  <ReviewButton type="button" disabled={!pending || bulkActionPending} onClick={() => onReviewItem(item)}>
                    Review
                  </ReviewButton>
                </ReviewRow>
              );
            })}
          </ItemList>
        </Section>
      )}

      {batch.duplicates.length > 0 && (
        <Section>
          <SectionTitle>Already in profile</SectionTitle>
          <MutedList>
            {batch.duplicates.map((candidate, index) => {
              const candidateName = getCandidateName(candidate);
              const matchedItem = findDuplicateMatchedItem(inventoryItems, candidate);
              return (
                <CandidateRow key={`${candidate.dedupeKey || candidate.suggestedName}-${index}`}>
                  <ItemCopy>
                    <ItemName>{candidateName}</ItemName>
                    <MetaLine>
                      {matchedItem ? `Matched ${itemLabel(matchedItem)} x${matchedItem.quantity}` : 'Duplicate match'}
                    </MetaLine>
                  </ItemCopy>
                  {matchedItem && (
                    <ReviewButton
                      type="button"
                      aria-label={`Merge ${candidateName} into matched inventory`}
                      disabled={bulkActionPending || !onMergeDuplicate}
                      onClick={() => onMergeDuplicate?.(candidate, index, matchedItem)}
                    >
                      Merge quantity
                    </ReviewButton>
                  )}
                </CandidateRow>
              );
            })}
          </MutedList>
        </Section>
      )}
      {batch.possibleItems.length > 0 && (
        <Section>
          <SectionTitle>Possible, not added</SectionTitle>
          <MutedList>
            {batch.possibleItems.map((candidate, index) => {
              const candidateName = getCandidateName(candidate);
              return (
                <CandidateRow key={`${candidate.dedupeKey || candidate.suggestedName}-${index}`}>
                  <ItemCopy>
                    <ItemName>{candidateName}</ItemName>
                    <MetaLine>{TRUST_TIER_LABELS[getTrustTier(candidate.confidence)]} - Possible, not added</MetaLine>
                  </ItemCopy>
                  <ReviewButton
                    type="button"
                    aria-label={`Add ${candidateName} to inventory`}
                    disabled={bulkActionPending || !onAddPossibleItem}
                    onClick={() => onAddPossibleItem?.(candidate, index)}
                  >
                    Add to inventory
                  </ReviewButton>
                </CandidateRow>
              );
            })}
          </MutedList>
        </Section>
      )}
    </Panel>
  );
};

export default EquipmentScanBatchPanel;