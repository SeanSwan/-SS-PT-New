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
import type { SprintClassSlot } from '../../hooks/useSprintAPI';
import { useSprintAPI } from '../../hooks/useSprintAPI';
import {
  Card, ModalOverlay, ModalContent, ModalTitle,
  StatusBadge, PrimaryButton, SecondaryButton,
  GenerateButton, ActionBar, FormField,
} from './SprintPlannerStyles';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <ModalTitle style={{ margin: 0 }}>
            {DAY_NAMES[slot.dayOfWeek]} &mdash; {slot.scheduledDate}
          </ModalTitle>
          <StatusBadge $status={slot.status}>{slot.status}</StatusBadge>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem' }}>
            <div><strong>Day Type:</strong> {DAY_TYPE_LABELS[slot.dayType] || slot.dayType}</div>
            <div><strong>Format:</strong> {slot.classFormat}</div>
            <div><strong>Style:</strong> {slot.classStyle}</div>
          </div>
        </Card>

        {slot.status === 'generated' || slot.status === 'taught' ? (
          <>
            {stations.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', marginBottom: 8 }}>
                  Stations ({stations.length})
                </h3>
                {stations.map((station, idx) => (
                  <Card key={idx} style={{ marginBottom: 8, padding: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>
                      Station {idx + 1}: {(station as Record<string, unknown>).label as string || `Station ${idx + 1}`}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {exercises.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', marginBottom: 8 }}>
                  Exercises ({exercises.length})
                </h3>
                {exercises.slice(0, 20).map((ex, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid rgba(96,192,240,0.06)', fontSize: '0.8rem',
                  }}>
                    <span>{(ex as Record<string, unknown>).exerciseName as string}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Fira Code', monospace", fontSize: '0.7rem' }}>
                      {(ex as Record<string, unknown>).durationSec as number}s
                    </span>
                  </div>
                ))}
                {exercises.length > 20 && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    +{exercises.length - 20} more exercises
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <Card style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              This class has not been generated yet. Generate the full sprint to populate this slot.
            </p>
          </Card>
        )}

        {/* Confirm section */}
        {slot.status === 'generated' && !slot.wasUsed && (
          <Card style={{ marginTop: 16 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.95rem', marginBottom: 12 }}>
              Did you teach this class?
            </h3>
            <FormField>
              <label>Date used</label>
              <input type="date" value={usedDate} onChange={e => setUsedDate(e.target.value)} />
            </FormField>
            <ActionBar style={{ marginTop: 12 }}>
              <PrimaryButton onClick={handleConfirm} disabled={loading}>
                {loading ? 'Confirming...' : 'Yes, I taught this class'}
              </PrimaryButton>
            </ActionBar>
          </Card>
        )}

        {slot.wasUsed && (
          <Card style={{ marginTop: 16, borderColor: 'rgba(0,255,136,0.3)' }}>
            <div style={{ color: '#00ff88', fontWeight: 600, fontSize: '0.85rem' }}>
              Taught on {slot.usedDate || slot.scheduledDate}
            </div>
          </Card>
        )}

        <ActionBar style={{ marginTop: 20, justifyContent: 'space-between' }}>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          {(slot.status === 'generated' || slot.status === 'planned') && (
            <GenerateButton onClick={handleRegenerate} disabled={loading}>
              {loading ? 'Regenerating...' : 'Regenerate Class'}
            </GenerateButton>
          )}
        </ActionBar>
      </ModalContent>
    </ModalOverlay>
  );
};

export default SlotDetailPanel;
