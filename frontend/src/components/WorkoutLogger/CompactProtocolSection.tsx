/**
 * ┌─── SUB-COMPONENT: CompactProtocolSection ──────────────────┐
 * │ PARENT: WorkoutLogger                                      │
 * │ PURPOSE: Small, rolodex-first protocol section for warmup, │
 * │          balance/core, and cooldown categories. Replaces   │
 * │          the full-height static NASMProtocolSection list   │
 * │          that used to dominate the logger page.            │
 * │ OWNER: Claude Opus 4.7 | CREATED: 2026-04-17               │
 * └────────────────────────────────────────────────────────────┘
 *
 * Design intent (2026-04-17):
 *   Before: every page load dumped 25 warmup rows + 20 balance/core rows
 *   + 15 cooldown rows as always-rendered checklists. The Exercise Rolodex
 *   (the actual primary add mechanism) sat below the fold.
 *
 *   After: each section renders as a small card. The body is:
 *     1. Compact chip list of items the user has selected (with X to remove)
 *     2. A small, scoped "Recommended" row of phase-appropriate quick-add chips
 *     3. An obvious labeled "Add from Rolodex" button that opens the existing
 *        NASMExerciseRolodex in the correct sectionContext
 *
 * Wire contract:
 *   - Each section's selected items live in WorkoutLogger state as
 *     ProtocolSelection[], distinct from the main `exercises` array.
 *   - Protocol items are NOT persisted through the workout save payload
 *     in this slice. Backend wire contract is unchanged. This is a
 *     pure logger-UX compaction — not a schema slice.
 *   - The rolodex opens with sectionContext set by the parent before the
 *     user clicks Add, so the rolodex filters relevant exercises.
 *   - Recommended chips come from `NASMProtocolDefaults.getRecommendedProtocolItems`
 *     (phase + section + cap on count) so Swan Coach can reuse the same
 *     helper for AI-driven suggestions.
 *
 * Phase 16 preservation:
 *   This component does not touch overallIntensity, rpe, formQuality,
 *   formRating, or the save path. It cannot regress Phase 16 null-honest
 *   behavior.
 */

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { ChevronDown, Plus, X } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import type { NASMDefaultItem } from './NASMProtocolDefaults';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

/**
 * Shared section-key vocabulary. Matches the existing `sectionContext`
 * values on NASMExerciseRolodex so Swan Coach, the rolodex, and this
 * component all speak the same taxonomy.
 */
export type ProtocolSectionKey = 'warmup' | 'balance_core' | 'cooldown';

/**
 * Lightweight record for a selected protocol item. Used in all three
 * selected-items arrays on WorkoutLogger. Distinct from both NASMItem
 * (the heavy checklist row) and ExerciseEntry (the weight/reps/RPE
 * set-table row).
 */
export interface ProtocolSelection {
  /** Unique id within its section. For preset items use the NASMDefaultItem.id,
   *  for rolodex-added items use `rolodex-${exerciseId}`. */
  id: string;
  /** Display name. */
  name: string;
  /** Where this item came from so the UI can hint at recommendations. */
  source: 'preset' | 'rolodex' | 'template';
  /** Optional NASM category (foam-roll / stretch / balance / core / etc). */
  category?: string;
}

interface CompactProtocolSectionProps {
  title: string;
  icon: React.ReactNode;
  sectionKey: ProtocolSectionKey;
  /** Currently selected items for this section. */
  selectedItems: ProtocolSelection[];
  /** Small curated list of phase-appropriate quick-add suggestions. */
  recommendedItems: NASMDefaultItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
  /** Open the rolodex scoped to this section. */
  onAddFromRolodex: () => void;
  /** Quick-add a recommended preset into the selected list. */
  onQuickAddPreset: (item: NASMDefaultItem) => void;
  /** Remove a selected item by id. */
  onRemoveSelected: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const CompactProtocolSection: React.FC<CompactProtocolSectionProps> = memo(({
  title,
  icon,
  sectionKey,
  selectedItems,
  recommendedItems,
  isOpen,
  onToggleOpen,
  onAddFromRolodex,
  onQuickAddPreset,
  onRemoveSelected,
}) => {
  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddFromRolodex();
  }, [onAddFromRolodex]);

  // Filter out recommended items that are already selected — no point
  // showing a quick-add chip for something the user already added.
  const selectedIdSet = new Set(selectedItems.map((s) => s.id));
  const availableRecommendations = recommendedItems.filter(
    (r) => !selectedIdSet.has(r.id),
  );

  return (
    <SectionCard data-testid={`compact-protocol-section-${sectionKey}`}>
      {/*
        2026-04-17: header is split into two sibling buttons (ToggleButton
        + AddButton) inside a non-interactive HeaderRow wrapper. Earlier
        draft had a single button header with the Add button nested
        inside, which is invalid DOM (nested interactive elements) per
        CLAUDE.md rule 4 and also makes screen-reader focus behavior
        unpredictable.
      */}
      <HeaderRow>
        <ToggleButton $open={isOpen} onClick={onToggleOpen} aria-expanded={isOpen} type="button">
          {icon}
          <TitleText>{title}</TitleText>
          <Badge>{selectedItems.length}</Badge>
          <ChevronDown size={18} aria-hidden="true" />
        </ToggleButton>
        <AddButton
          onClick={handleAddClick}
          aria-label={`Add to ${title} from rolodex`}
          data-testid={`compact-protocol-add-${sectionKey}`}
          type="button"
        >
          <Plus size={16} />
          <AddButtonLabel>Add</AddButtonLabel>
        </AddButton>
      </HeaderRow>

      <AnimatePresence initial={false}>
        {isOpen && (
          <SectionBody
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {selectedItems.length === 0 ? (
              <EmptyHint>
                Nothing added yet. Tap <strong>Add</strong> above to pick items
                from the rolodex, or choose a recommended quick-add below.
              </EmptyHint>
            ) : (
              <ChipList aria-label={`Selected ${title} items`}>
                {selectedItems.map((item) => (
                  <SelectedChip key={item.id} $source={item.source}>
                    <ChipLabel title={item.name}>{item.name}</ChipLabel>
                    <ChipRemove
                      onClick={() => onRemoveSelected(item.id)}
                      aria-label={`Remove ${item.name}`}
                      type="button"
                    >
                      <X size={12} />
                    </ChipRemove>
                  </SelectedChip>
                ))}
              </ChipList>
            )}

            {availableRecommendations.length > 0 && (
              <>
                <SubHeading>Recommended for this phase</SubHeading>
                <ChipList aria-label={`Recommended ${title} items`}>
                  {availableRecommendations.slice(0, 6).map((item) => (
                    <RecommendedChip
                      key={item.id}
                      onClick={() => onQuickAddPreset(item)}
                      type="button"
                      aria-label={`Quick-add ${item.name}`}
                      title={item.name}
                    >
                      <Plus size={11} aria-hidden="true" />
                      <ChipLabel>{item.name}</ChipLabel>
                    </RecommendedChip>
                  ))}
                </ChipList>
              </>
            )}
          </SectionBody>
        )}
      </AnimatePresence>
    </SectionCard>
  );
});

CompactProtocolSection.displayName = 'CompactProtocolSection';
export default CompactProtocolSection;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled components
// ─────────────────────────────────────────────────────────────

const SectionCard = styled.div`
  background: rgba(20, 20, 25, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid ${withAlpha(CS.glow, 0.12)};
  border-radius: 16px;
  margin-bottom: 0.75rem;
  overflow: hidden;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 8px 12px 8px 0;
  min-height: 52px;
`;

const ToggleButton = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 8px 12px 8px 20px;
  border: none;
  background: transparent;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: -2px;
    border-radius: 8px;
  }

  svg:last-child {
    margin-left: auto;
    transition: transform 0.3s ease;
    transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  }
`;

const TitleText = styled.span`
  flex: 1;
  text-align: left;
`;

const Badge = styled.span`
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  font-weight: 600;
  font-family: 'Fira Code', monospace;
  min-width: 24px;
  text-align: center;
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  min-height: 44px;
  align-self: center;
  flex-shrink: 0;
  border: 1.5px solid ${withAlpha(CS.gaming, 0.35)};
  border-radius: 10px;
  background: ${withAlpha(CS.gaming, 0.12)};
  color: ${CS.gaming};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${withAlpha(CS.gaming, 0.22)};
    border-color: ${CS.gaming};
    box-shadow: 0 0 12px ${withAlpha(CS.gaming, 0.25)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.97);
  }
`;

const AddButtonLabel = styled.span`
  @media (max-width: 430px) {
    display: none;
  }
`;

const SectionBody = styled(motion.div)`
  padding: 0 20px 16px;
  overflow: hidden;
`;

const EmptyHint = styled.p`
  margin: 0;
  padding: 12px 14px;
  color: rgba(224, 236, 244, 0.55);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  line-height: 1.5;
  background: rgba(96, 192, 240, 0.04);
  border-radius: 10px;
  border: 1px dashed ${withAlpha(CS.glow, 0.18)};

  strong {
    color: ${CS.gaming};
    font-weight: 600;
  }
`;

const SubHeading = styled.div`
  margin-top: 12px;
  margin-bottom: 6px;
  color: rgba(224, 236, 244, 0.5);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const ChipList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SelectedChip = styled.li<{ $source: ProtocolSelection['source'] }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 12px;
  border-radius: 999px;
  border: 1px solid ${({ $source }) =>
    $source === 'rolodex'
      ? withAlpha(CS.gaming, 0.4)
      : withAlpha(CS.glow, 0.25)};
  background: ${({ $source }) =>
    $source === 'rolodex'
      ? withAlpha(CS.gaming, 0.08)
      : withAlpha(CS.glow, 0.06)};
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  max-width: 100%;
`;

const ChipLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 28ch;
`;

const ChipRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: rgba(224, 236, 244, 0.55);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 1px;
  }
`;

const RecommendedChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px dashed ${withAlpha(CS.glow, 0.3)};
  background: transparent;
  color: rgba(224, 236, 244, 0.75);
  font-family: 'Sora', sans-serif;
  font-size: 0.73rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  &:hover {
    background: ${withAlpha(CS.glow, 0.06)};
    color: ${CS.text};
    border-color: ${withAlpha(CS.glow, 0.5)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }
`;
