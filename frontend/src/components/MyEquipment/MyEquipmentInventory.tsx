/**
 * ============================================================================
 * FILE: MyEquipmentInventory.tsx
 * PURPOSE: Grouped gear list for the client/user My Equipment surface
 * BLUEPRINT: EQUIPMENT-INTELLIGENCE-OVERHAUL §4.3 + §10a #7 (S5)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the visible inventory grouped by movement
 * pattern (Pushing / Pulling / …) with tiny coverage dots for the 7-pattern
 * model, a Wing Purple pending-review dot per unapproved item, and the
 * cinematic starfield empty state with the "Scan your space" CTA.
 *
 * HOW IT FITS: MyEquipmentPage → MyEquipmentInventory. Pure presentation —
 * all grouping logic lives in myEquipmentPatterns.ts (tested separately).
 *
 * KEY DECISIONS: Items appear under every pattern they serve (teaches the
 * Equipment IQ model implicitly, §10a #7). Rejected/archived items are
 * filtered out. lucide-react icons only — no emoji (§10a #12 ban).
 */
import React, { useMemo } from 'react';
import { ScanSearch } from 'lucide-react';
import type { EquipmentItem } from '../../hooks/useEquipmentAPI';
import {
  MOVEMENT_PATTERNS,
  PATTERN_LABELS,
  getPatternCoverage,
  getVisibleItems,
  groupItemsByPattern,
} from './myEquipmentPatterns';
import { GhostButton, HeroScanButton } from './MyEquipmentPage.styles';
import {
  CoverageDot,
  CoverageRow,
  EmptyCopy,
  EmptyFootnote,
  EmptyStage,
  EmptyTitle,
  InventoryHeader,
  InventorySection,
  InventoryTitle,
  ItemName,
  ItemQuantity,
  ItemRow,
  PatternCount,
  PatternDot,
  PatternGroupBlock,
  PatternHeader,
  PendingDot,
  StateMessage,
} from './MyEquipmentInventory.styles';

interface MyEquipmentInventoryProps {
  items: EquipmentItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onScanClick: () => void;
  scanDisabled?: boolean;
}

const itemLabel = (item: EquipmentItem): string => item.trainerLabel || item.name;

const MyEquipmentInventory: React.FC<MyEquipmentInventoryProps> = ({
  items,
  loading,
  error,
  onRetry,
  onScanClick,
  scanDisabled = false,
}) => {
  const visibleItems = useMemo(() => getVisibleItems(items), [items]);
  const groups = useMemo(() => groupItemsByPattern(visibleItems), [visibleItems]);
  const coverage = useMemo(() => getPatternCoverage(visibleItems), [visibleItems]);

  if (loading) {
    return <StateMessage role="status">Loading your gear…</StateMessage>;
  }

  if (error) {
    return (
      <StateMessage role="alert">
        <p>{error}</p>
        <GhostButton type="button" onClick={onRetry}>Try again</GhostButton>
      </StateMessage>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <EmptyStage>
        <EmptyTitle>Your gear map is waiting</EmptyTitle>
        <EmptyCopy>Swan Coach identifies what you&apos;ve got and what it unlocks.</EmptyCopy>
        <EmptyFootnote>Takes about 30 seconds.</EmptyFootnote>
        <HeroScanButton type="button" onClick={onScanClick} disabled={scanDisabled}>
          <ScanSearch size={18} aria-hidden />
          Scan your space
        </HeroScanButton>
      </EmptyStage>
    );
  }

  return (
    <InventorySection aria-label="Your equipment by movement pattern">
      <InventoryHeader>
        <InventoryTitle>Your gear ({visibleItems.length})</InventoryTitle>
        <CoverageRow aria-label="Movement pattern coverage">
          {MOVEMENT_PATTERNS.map((pattern) => (
            <CoverageDot
              key={pattern}
              $covered={coverage[pattern]}
              title={`${PATTERN_LABELS[pattern]} ${coverage[pattern] ? 'covered' : 'not covered yet'}`}
            />
          ))}
        </CoverageRow>
      </InventoryHeader>

      {groups.map((group) => (
        <PatternGroupBlock key={group.pattern}>
          <PatternHeader>
            <PatternDot aria-hidden />
            {group.label}
            <PatternCount>({group.items.length})</PatternCount>
          </PatternHeader>
          {group.items.map((item) => (
            <ItemRow key={`${group.pattern}-${item.id}`}>
              <ItemName>{itemLabel(item)}</ItemName>
              {item.quantity > 1 && <ItemQuantity>×{item.quantity}</ItemQuantity>}
              {item.approvalStatus === 'pending' && (
                <PendingDot role="img" aria-label={`${itemLabel(item)} pending review`} />
              )}
            </ItemRow>
          ))}
        </PatternGroupBlock>
      ))}
    </InventorySection>
  );
};

export default MyEquipmentInventory;
