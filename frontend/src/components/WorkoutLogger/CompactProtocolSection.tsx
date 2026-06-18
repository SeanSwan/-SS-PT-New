/**
 * CompactProtocolSection
 *
 * Parent: WorkoutLogger
 * Purpose: compact warmup, balance/core, and cooldown picker section.
 * It keeps protocol work visible without reviving the old full-page
 * static checklist, and routes additions through the shared rolodex.
 */

import React, { memo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { NASMDefaultItem } from './NASMProtocolDefaults';
import {
  AddButton,
  AddButtonLabel,
  Badge,
  ChipLabel,
  ChipList,
  ChipRemove,
  EmptyHint,
  HeaderRow,
  RecommendedChip,
  RecommendedHint,
  SectionBody,
  SectionCard,
  SelectedChip,
  SubHeading,
  TitleText,
  ToggleButton,
} from './CompactProtocolSection.styles';

export type ProtocolSectionKey = 'warmup' | 'balance_core' | 'cooldown';

export interface ProtocolSelection {
  id: string;
  name: string;
  source: 'preset' | 'rolodex' | 'template';
  category?: string;
}

interface CompactProtocolSectionProps {
  title: string;
  icon: React.ReactNode;
  sectionKey: ProtocolSectionKey;
  selectedItems: ProtocolSelection[];
  recommendedItems: NASMDefaultItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onAddFromRolodex: () => void;
  onQuickAddPreset: (item: NASMDefaultItem) => void;
  onRemoveSelected: (id: string) => void;
}

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

  const selectedIdSet = new Set(selectedItems.map((s) => s.id));
  const availableRecommendations = recommendedItems.filter(
    (r) => !selectedIdSet.has(r.id),
  );

  return (
    <SectionCard data-testid={`compact-protocol-section-${sectionKey}`}>
      <HeaderRow>
        <ToggleButton $open={isOpen} onClick={onToggleOpen} aria-expanded={isOpen} type="button">
          {icon}
          <TitleText>{title}</TitleText>
          <Badge>{selectedItems.length}</Badge>
          {!isOpen && selectedItems.length === 0 && availableRecommendations.length > 0 && (
            <RecommendedHint>{availableRecommendations.length} recommended</RecommendedHint>
          )}
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
