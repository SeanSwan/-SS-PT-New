/**
 * PainEntryPanel — Slide-out form for recording pain/injury entries
 * =================================================================
 * Opens when a body region is clicked on the BodyMapSVG.
 * Allows the trainer to record pain level, type, description,
 * aggravating movements, and postural syndrome flags.
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  getRegionById,
  getSeverityColor,
  PAIN_TYPE_OPTIONS,
  AGGRAVATING_MOVEMENTS,
  RELIEVING_FACTORS,
} from './bodyRegions';
import type {
  PainEntry,
  PainType,
  PainSide,
  PosturalSyndrome,
  CreatePainEntryPayload,
} from '../../services/painEntryService';

// ── Styled Components ───────────────────────────────────────────────────

const Panel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ $isOpen }) => ($isOpen ? '0' : '-460px')};
  width: 440px;
  max-width: 95vw;
  height: 100vh;
  background: rgba(10, 10, 26, 0.95);
  border-left: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(16px);
  z-index: 1200;
  overflow-y: auto;
  transition: right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 24px;
  box-sizing: border-box;
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1199;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const PanelTitle = styled.h3`
  color: #00FFFF;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #00FFFF;
  border-radius: 8px;
  width: 44px;
  height: 44px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Slider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  outline: none;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    cursor: pointer;
  }
`;

const SliderValue = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-size: 20px;
  font-weight: 700;
  min-width: 32px;
  text-align: center;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  min-height: 44px;
  &:focus {
    border-color: #00FFFF;
    outline: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus {
    border-color: #00FFFF;
    outline: none;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  &:focus {
    border-color: #00FFFF;
    outline: none;
  }
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid ${({ $active }) => ($active ? '#00FFFF' : 'rgba(255,255,255,0.15)')};
  background: ${({ $active }) => ($active ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.3)')};
  color: ${({ $active }) => ($active ? '#00FFFF' : 'rgba(255,255,255,0.6)')};
  transition: all 0.15s;
  min-height: 36px;
  &:hover {
    border-color: #00FFFF;
    color: #00FFFF;
  }
`;

const SyndromeToggle = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SyndromeBtn = styled.button<{ $active: boolean; $color: string }>`
  flex: 1;
  min-width: 120px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.15)')};
  background: ${({ $active, $color }) => ($active ? `${$color}22` : 'rgba(0,0,0,0.3)')};
  color: ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.6)')};
  transition: all 0.15s;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  flex: 1;
  min-width: 100px;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #00FFFF, #7851A9);
          border: none;
          color: #0a0a1a;
          &:hover { filter: brightness(1.1); }
        `;
      case 'danger':
        return `
          background: rgba(255,50,50,0.15);
          border: 1px solid rgba(255,50,50,0.4);
          color: #FF5555;
          &:hover { background: rgba(255,50,50,0.25); }
        `;
      default:
        return `
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          &:hover { background: rgba(255,255,255,0.1); }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(0, 255, 255, 0.1);
  margin: 16px 0;
`;

// ── Component ───────────────────────────────────────────────────────────

interface PainEntryPanelProps {
  regionId: string | null;
  existingEntry: PainEntry | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: CreatePainEntryPayload) => void;
  onResolve: (entryId: number) => void;
  onDelete: (entryId: number) => void;
  isAdmin: boolean;
}

const PainEntryPanel: React.FC<PainEntryPanelProps> = ({
  regionId,
  existingEntry,
  isOpen,
  isSaving,
  onClose,
  onSave,
  onResolve,
  onDelete,
  isAdmin,
}) => {
  const region = regionId ? getRegionById(regionId) : null;

  const [painLevel, setPainLevel] = useState(5);
  const [painType, setPainType] = useState<PainType>('aching');
  const [side, setSide] = useState<PainSide>('center');
  const [description, setDescription] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [selectedAggravating, setSelectedAggravating] = useState<string[]>([]);
  const [selectedRelieving, setSelectedRelieving] = useState<string[]>([]);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [posturalSyndrome, setPosturalSyndrome] = useState<PosturalSyndrome>('none');

  // Reset form when region changes or existing entry loads
  useEffect(() => {
    if (existingEntry) {
      setPainLevel(existingEntry.painLevel);
      setPainType(existingEntry.painType);
      setSide(existingEntry.side);
      setDescription(existingEntry.description || '');
      setOnsetDate(existingEntry.onsetDate || '');
      setSelectedAggravating(
        existingEntry.aggravatingMovements
          ? existingEntry.aggravatingMovements.split(',').map(s => s.trim())
          : [],
      );
      setSelectedRelieving(
        existingEntry.relievingFactors
          ? existingEntry.relievingFactors.split(',').map(s => s.trim())
          : [],
      );
      setTrainerNotes(existingEntry.trainerNotes || '');
      setAiNotes(existingEntry.aiNotes || '');
      setPosturalSyndrome(existingEntry.posturalSyndrome || 'none');
    } else {
      setPainLevel(5);
      setPainType('aching');
      setSide(region?.side || 'center');
      setDescription('');
      setOnsetDate('');
      setSelectedAggravating([]);
      setSelectedRelieving([]);
      setTrainerNotes('');
      setAiNotes('');
      setPosturalSyndrome('none');
    }
  }, [regionId, existingEntry, region?.side]);

  const toggleChip = useCallback(
    (value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    },
    [],
  );

  const handleSave = () => {
    if (!regionId) return;
    const payload: CreatePainEntryPayload = {
      bodyRegion: regionId,
      side,
      painLevel,
      painType,
      description: description.trim() || undefined,
      onsetDate: onsetDate || undefined,
      aggravatingMovements: selectedAggravating.length > 0 ? selectedAggravating.join(', ') : undefined,
      relievingFactors: selectedRelieving.length > 0 ? selectedRelieving.join(', ') : undefined,
      trainerNotes: trainerNotes.trim() || undefined,
      aiNotes: aiNotes.trim() || undefined,
      posturalSyndrome,
    };
    onSave(payload);
  };

  const severityColor = getSeverityColor(painLevel);

  return (
    <>
      <Overlay $isOpen={isOpen} onClick={onClose} />
      <Panel $isOpen={isOpen}>
        <PanelHeader>
          <PanelTitle>{region?.label || 'Select Region'}</PanelTitle>
          <CloseBtn onClick={onClose} aria-label="Close panel">&#x2715;</CloseBtn>
        </PanelHeader>

        {/* Pain Level Slider */}
        <FormGroup>
          <Label>Pain Level</Label>
          <SliderContainer>
            <Slider
              type="range"
              min={1}
              max={10}
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #33CC66, #FFB833, #FF3333)`,
              }}
            />
            <SliderValue $color={severityColor}>{painLevel}</SliderValue>
          </SliderContainer>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
            {painLevel >= 7 ? 'Severe — exercises AVOIDED' : painLevel >= 4 ? 'Moderate — exercises MODIFIED' : 'Mild — include with corrective warm-up'}
          </div>
        </FormGroup>

        {/* Pain Type */}
        <FormGroup>
          <Label>Pain Type</Label>
          <Select value={painType} onChange={(e) => setPainType(e.target.value as PainType)}>
            {PAIN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormGroup>

        {/* Side */}
        <FormGroup>
          <Label>Side</Label>
          <Select value={side} onChange={(e) => setSide(e.target.value as PainSide)}>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="center">Center</option>
            <option value="bilateral">Bilateral</option>
          </Select>
        </FormGroup>

        {/* Client Description */}
        <FormGroup>
          <Label>Client Description</Label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does the client say about this pain? e.g., 'Sharp pain when pressing overhead...'"
          />
        </FormGroup>

        {/* Onset Date */}
        <FormGroup>
          <Label>When did it start?</Label>
          <Input
            type="date"
            value={onsetDate}
            onChange={(e) => setOnsetDate(e.target.value)}
          />
        </FormGroup>

        <Divider />

        {/* Aggravating Movements */}
        <FormGroup>
          <Label>Aggravating Movements</Label>
          <ChipGrid>
            {AGGRAVATING_MOVEMENTS.map((mv) => (
              <Chip
                key={mv}
                $active={selectedAggravating.includes(mv)}
                onClick={() => toggleChip(mv, selectedAggravating, setSelectedAggravating)}
              >
                {mv}
              </Chip>
            ))}
          </ChipGrid>
        </FormGroup>

        {/* Relieving Factors */}
        <FormGroup>
          <Label>Relieving Factors</Label>
          <ChipGrid>
            {RELIEVING_FACTORS.map((rf) => (
              <Chip
                key={rf}
                $active={selectedRelieving.includes(rf)}
                onClick={() => toggleChip(rf, selectedRelieving, setSelectedRelieving)}
              >
                {rf}
              </Chip>
            ))}
          </ChipGrid>
        </FormGroup>

        <Divider />

        {/* Postural Syndrome */}
        <FormGroup>
          <Label>Postural Syndrome</Label>
          <SyndromeToggle>
            <SyndromeBtn
              $active={posturalSyndrome === 'none'}
              $color="#00FFFF"
              onClick={() => setPosturalSyndrome('none')}
            >
              None
            </SyndromeBtn>
            <SyndromeBtn
              $active={posturalSyndrome === 'upper_crossed'}
              $color="#FFB833"
              onClick={() => setPosturalSyndrome('upper_crossed')}
            >
              Upper Crossed
            </SyndromeBtn>
            <SyndromeBtn
              $active={posturalSyndrome === 'lower_crossed'}
              $color="#FF5555"
              onClick={() => setPosturalSyndrome('lower_crossed')}
            >
              Lower Crossed
            </SyndromeBtn>
          </SyndromeToggle>
        </FormGroup>

        {/* AI Notes */}
        <FormGroup>
          <Label>AI Guidance Notes</Label>
          <TextArea
            value={aiNotes}
            onChange={(e) => setAiNotes(e.target.value)}
            placeholder="Guidance for the AI when generating workouts, e.g., 'Focus on thoracic mobility before any pressing...'"
          />
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            This text will be injected into the AI workout generation prompt.
          </div>
        </FormGroup>

        {/* Trainer Notes (private) */}
        <FormGroup>
          <Label>Trainer Notes (Private)</Label>
          <TextArea
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            placeholder="Internal notes — not sent to AI..."
          />
        </FormGroup>

        {/* Action Buttons */}
        <ButtonRow>
          <ActionBtn $variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : existingEntry ? 'Update' : 'Save'}
          </ActionBtn>
          {existingEntry && (
            <ActionBtn $variant="secondary" onClick={() => onResolve(existingEntry.id)} disabled={isSaving}>
              Resolve
            </ActionBtn>
          )}
          {existingEntry && isAdmin && (
            <ActionBtn $variant="danger" onClick={() => onDelete(existingEntry.id)} disabled={isSaving}>
              Delete
            </ActionBtn>
          )}
        </ButtonRow>
      </Panel>
    </>
  );
};

export default PainEntryPanel;
