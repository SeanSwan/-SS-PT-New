/**
 * ┌─── SUB-COMPONENT: SlotDetailPanel ──────────────────────────┐
 * │ PARENT: SprintPlannerPage                                    │
 * │ PURPOSE: Shows class detail for a selected slot with        │
 * │          confirm/regenerate actions                          │
 * │ Props: { slot, sprintId, onClose, onRefresh }               │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Mark as Taught] → PUT .../confirm → updates status         │
 * │ [Regenerate] → POST .../regenerate → new class generated    │
 * │ [Close] → hides panel                                       │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import type { SprintClassSlot } from '../../hooks/useSprintAPI';
import { useSprintAPI } from '../../hooks/useSprintAPI';
import {
  Card, ModalOverlay, ModalContent, ModalTitle,
  StatusBadge, PrimaryButton, SecondaryButton,
  GenerateButton, ActionBar, FormField,
} from './SprintPlannerStyles';

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const TitleNoMargin = styled(ModalTitle)`
  margin: 0;
`;

const SpacedCard = styled(Card)<{ $bottom?: number; $top?: number; $pad?: number; $center?: boolean; $success?: boolean }>`
  margin-bottom: ${({ $bottom = 0 }) => $bottom}px;
  margin-top: ${({ $top = 0 }) => $top}px;
  padding: ${({ $pad }) => ($pad === undefined ? undefined : `${$pad}px`)};
  text-align: ${({ $center }) => ($center ? 'center' : 'inherit')};
  border-color: ${({ $success }) => ($success ? 'rgba(0,255,136,0.3)' : undefined)};
`;

const MetaRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.85rem;
`;

const Section = styled.div<{ $bottom?: number }>`
  margin-bottom: ${({ $bottom = 16 }) => $bottom}px;
`;

const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  margin: 0 0 8px;
`;

const StationLabel = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 0.85rem;
`;

const ExerciseRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(96,192,240,0.06);
  font-size: 0.8rem;
`;

const MutedCode = styled.span`
  color: rgba(255,255,255,0.4);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
`;

const MutedNote = styled.div<{ $top?: number }>`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  margin-top: ${({ $top = 0 }) => $top}px;
`;

const EmptyCopy = styled.p`
  color: rgba(255,255,255,0.5);
  margin: 0 0 16px;
`;

const ConfirmTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  margin: 0 0 12px;
`;

const ActionBarSpaced = styled(ActionBar)<{ $top?: number; $spread?: boolean }>`
  margin-top: ${({ $top = 0 }) => $top}px;
  justify-content: ${({ $spread }) => ($spread ? 'space-between' : undefined)};
`;

const SuccessText = styled.div`
  color: #00ff88;
  font-weight: 600;
  font-size: 0.85rem;
`;

interface Props {
  slot: SprintClassSlot;
  sprintId: number;
  onClose: () => void;
  onRefresh: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_TYPE_LABELS: Record<string, string> = {
  lower_body: 'Lower Body', upper_body: 'Upper Body',
  cardio: 'Cardio', full_body: 'Full Body',
};

const SlotDetailPanel: React.FC<Props> = ({ slot, sprintId, onClose, onRefresh }) => {
  const { confirmSlot, regenerateSlot, loading } = useSprintAPI();
  const [usedDate, setUsedDate] = useState(slot.scheduledDate);

  const handleConfirm = useCallback(async () => {
    const success = await confirmSlot(sprintId, slot.id, usedDate);
    if (success) onRefresh();
  }, [confirmSlot, sprintId, slot.id, usedDate, onRefresh]);

  const handleRegenerate = useCallback(async () => {
    const success = await regenerateSlot(sprintId, slot.id);
    if (success) onRefresh();
  }, [regenerateSlot, sprintId, slot.id, onRefresh]);

  const classData = slot.generatedClassData as Record<string, unknown> | undefined;
  const exercises = (classData?.exercises as Array<Record<string, unknown>>) || [];
  const stations = (classData?.stations as Array<Record<string, unknown>>) || [];

  return (
    <ModalOverlay onClick={onClose} role="dialog" aria-modal="true">
      <ModalContent onClick={e => e.stopPropagation()}>
        <HeaderRow>
          <TitleNoMargin>
            {DAY_NAMES[slot.dayOfWeek]} &mdash; {slot.scheduledDate}
          </TitleNoMargin>
          <StatusBadge $status={slot.status}>{slot.status}</StatusBadge>
        </HeaderRow>

        <SpacedCard $bottom={16}>
          <MetaRow>
            <div><strong>Day Type:</strong> {DAY_TYPE_LABELS[slot.dayType] || slot.dayType}</div>
            <div><strong>Format:</strong> {slot.classFormat}</div>
            <div><strong>Style:</strong> {slot.classStyle}</div>
          </MetaRow>
        </SpacedCard>

        {slot.status === 'generated' || slot.status === 'taught' ? (
          <>
            {stations.length > 0 && (
              <Section>
                <SectionTitle>
                  Stations ({stations.length})
                </SectionTitle>
                {stations.map((station, idx) => (
                  <SpacedCard key={idx} $bottom={8} $pad={12}>
                    <StationLabel>
                      Station {idx + 1}: {(station as Record<string, unknown>).label as string || `Station ${idx + 1}`}
                    </StationLabel>
                  </SpacedCard>
                ))}
              </Section>
            )}

            {exercises.length > 0 && (
              <Section>
                <SectionTitle>
                  Exercises ({exercises.length})
                </SectionTitle>
                {exercises.slice(0, 20).map((ex, idx) => (
                  <ExerciseRow key={idx}>
                    <span>{(ex as Record<string, unknown>).exerciseName as string}</span>
                    <MutedCode>
                      {(ex as Record<string, unknown>).durationSec as number}s
                    </MutedCode>
                  </ExerciseRow>
                ))}
                {exercises.length > 20 && (
                  <MutedNote $top={4}>
                    +{exercises.length - 20} more exercises
                  </MutedNote>
                )}
              </Section>
            )}
          </>
        ) : (
          <SpacedCard $center $pad={32}>
            <EmptyCopy>
              This class has not been generated yet. Generate the full sprint to populate this slot.
            </EmptyCopy>
          </SpacedCard>
        )}

        {/* Confirm section */}
        {slot.status === 'generated' && !slot.wasUsed && (
          <SpacedCard $top={16}>
            <ConfirmTitle>
              Did you teach this class?
            </ConfirmTitle>
            <FormField>
              <label htmlFor={`slot-${slot.id}-used-date`}>Date used</label>
              <input
                id={`slot-${slot.id}-used-date`}
                type="date"
                value={usedDate}
                onChange={e => setUsedDate(e.target.value)}
              />
            </FormField>
            <ActionBarSpaced $top={12}>
              <PrimaryButton onClick={handleConfirm} disabled={loading}>
                {loading ? 'Confirming...' : 'Yes, I taught this class'}
              </PrimaryButton>
            </ActionBarSpaced>
          </SpacedCard>
        )}

        {slot.wasUsed && (
          <SpacedCard $top={16} $success>
            <SuccessText>
              Taught on {slot.usedDate || slot.scheduledDate}
            </SuccessText>
          </SpacedCard>
        )}

        <ActionBarSpaced $top={20} $spread>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          {(slot.status === 'generated' || slot.status === 'planned') && (
            <GenerateButton onClick={handleRegenerate} disabled={loading}>
              {loading ? 'Regenerating...' : 'Regenerate Class'}
            </GenerateButton>
          )}
        </ActionBarSpaced>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SlotDetailPanel;
