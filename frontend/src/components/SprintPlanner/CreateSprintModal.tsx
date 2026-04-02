/**
 * ┌─── SUB-COMPONENT: CreateSprintModal ────────────────────────┐
 * │ PARENT: SprintPlannerPage                                    │
 * │ PURPOSE: Form to create a new 3-month sprint plan            │
 * │ Props: { isOpen, onClose, onCreated }                        │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Create] → POST /api/bootcamp/sprints → closes + refreshes  │
 * │ [Cancel] → closes modal                                      │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import { useSprintAPI, CreateSprintParams } from '../../hooks/useSprintAPI';
import {
  ModalOverlay, ModalContent, ModalTitle,
  FormGrid, FormField, FullWidthField,
  PrimaryButton, SecondaryButton, ActionBar,
} from './SprintPlannerStyles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DAY_OPTIONS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const FOCUS_OPTIONS = ['lower_body', 'upper_body', 'full_body', 'cardio'];
const FORMAT_OPTIONS = [
  { value: 'stations_4x', label: '4 Stations' },
  { value: 'stations_3x5', label: '3 Stations x5' },
  { value: 'stations_2x7', label: '2 Stations x7' },
  { value: 'full_group', label: 'Full Group' },
];
const STRATEGY_OPTIONS = [
  { value: 'linear', label: 'Linear (steady increase)' },
  { value: 'undulating', label: 'Undulating (high/med/low waves)' },
  { value: 'block', label: 'Block (3-week focus blocks)' },
  { value: 'random', label: 'Random (max variety)' },
];

const CreateSprintModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const { createSprint, loading } = useSprintAPI();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'wednesday', 'friday']);
  const [focusRotation, setFocusRotation] = useState<string[]>(['lower_body', 'upper_body', 'full_body']);
  const [defaultFormat, setDefaultFormat] = useState('stations_4x');
  const [strategy, setStrategy] = useState('linear');

  const toggleDay = useCallback((day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  }, []);

  const toggleFocus = useCallback((focus: string) => {
    setFocusRotation(prev =>
      prev.includes(focus) ? prev.filter(f => f !== focus) : [...prev, focus],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !startDate || selectedDays.length === 0) return;

    const params: CreateSprintParams = {
      name: name.trim(),
      startDate,
      durationWeeks,
      frequencyPattern: selectedDays,
      focusRotation,
      defaultFormat,
      progressionStrategy: strategy,
    };

    const result = await createSprint(params);
    if (result) {
      onCreated();
      onClose();
      setName('');
    }
  }, [name, startDate, durationWeeks, selectedDays, focusRotation, defaultFormat, strategy, createSprint, onCreated, onClose]);

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose} role="dialog" aria-modal="true">
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalTitle>Create Sprint Plan</ModalTitle>

        <FormGrid>
          <FullWidthField>
            <label>Sprint Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Q2 2026 Bootcamp Sprint"
            />
          </FullWidthField>

          <FormField>
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormField>

          <FormField>
            <label>Duration (weeks)</label>
            <input
              type="number" min={4} max={16} value={durationWeeks}
              onChange={e => setDurationWeeks(Number(e.target.value))}
            />
          </FormField>

          <FullWidthField>
            <label>Class Days</label>
            <ActionBar>
              {DAY_OPTIONS.map(day => (
                <SecondaryButton
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    minHeight: '36px',
                    background: selectedDays.includes(day) ? 'rgba(96,192,240,0.15)' : 'transparent',
                    borderColor: selectedDays.includes(day) ? '#60C0F0' : undefined,
                  }}
                >
                  {day.slice(0, 3).toUpperCase()}
                </SecondaryButton>
              ))}
            </ActionBar>
          </FullWidthField>

          <FullWidthField>
            <label>Focus Rotation</label>
            <ActionBar>
              {FOCUS_OPTIONS.map(focus => (
                <SecondaryButton
                  key={focus}
                  type="button"
                  onClick={() => toggleFocus(focus)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    minHeight: '36px',
                    background: focusRotation.includes(focus) ? 'rgba(139,92,246,0.15)' : 'transparent',
                    borderColor: focusRotation.includes(focus) ? '#8B5CF6' : undefined,
                  }}
                >
                  {focus.replace('_', ' ')}
                </SecondaryButton>
              ))}
            </ActionBar>
          </FullWidthField>

          <FormField>
            <label>Default Format</label>
            <select value={defaultFormat} onChange={e => setDefaultFormat(e.target.value)}>
              {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </FormField>

          <FormField>
            <label>Progression Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)}>
              {STRATEGY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
        </FormGrid>

        <ActionBar style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
          <SecondaryButton onClick={onClose} type="button">Cancel</SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !startDate}
            type="button"
          >
            {loading ? 'Creating...' : 'Create Sprint'}
          </PrimaryButton>
        </ActionBar>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateSprintModal;
