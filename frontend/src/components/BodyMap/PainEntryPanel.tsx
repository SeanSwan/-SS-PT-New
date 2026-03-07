/**
 * PainEntryPanel — Slide-out form for recording pain/injury entries
 * =================================================================
 * Opens when a body region is clicked on the BodyMapSVG.
 * Supports two modes:
 *   - Trainer mode: full form with AI notes, postural syndrome, trainer notes
 *   - Client mode: simplified form — pain level, type, side, description, movements
 *
 * Responsive: bottom-sheet on mobile (≤430px), side panel on larger screens.
 * Theme-aware with Galaxy-Swan fallbacks.
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  getRegionById,
  getSeverityColor,
  PAIN_TYPE_OPTIONS,
  AGGRAVATING_MOVEMENTS,
  RELIEVING_FACTORS,
  ALL_BODY_REGIONS,
} from './bodyRegions';
import type {
  PainEntry,
  PainType,
  PainSide,
  PosturalSyndrome,
  CreatePainEntryPayload,
} from '../../services/painEntryService';
import { device } from '../../styles/breakpoints';

// ── Styled Components ───────────────────────────────────────────────────

const Panel = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  z-index: 1200;
  background: ${({ theme }) => theme.background?.card || 'rgba(10, 10, 26, 0.95)'};
  backdrop-filter: blur(16px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 24px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  /* Mobile: bottom-sheet */
  bottom: 0;
  left: 0;
  right: 0;
  height: 85vh;
  max-height: 85vh;
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 20px 20px 0 0;
  transform: translateY(${({ $isOpen }) => ($isOpen ? '0' : '100%')});

  /* Tablet+: side panel */
  ${device.sm} {
    top: 0;
    bottom: 0;
    left: auto;
    right: 0;
    height: 100vh;
    max-height: 100vh;
    width: min(440px, 95vw);
    border-top: none;
    border-left: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.2)'};
    border-radius: 0;
    transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  }
`;

const DragHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 auto 16px;

  ${device.sm} {
    display: none;
  }
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
  color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CloseBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.3)'};
  color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
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
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.7)'};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
`;

const Slider = styled.input<{ $painColor: string }>`
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  outline: none;
  background: rgba(255, 255, 255, 0.05);

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #0a0a1a;
    border: 3px solid ${({ $painColor }) => $painColor};
    box-shadow: 0 0 12px ${({ $painColor }) => `${$painColor}80`}, inset 0 0 4px ${({ $painColor }) => $painColor};
    cursor: pointer;
    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 20px ${({ $painColor }) => `${$painColor}AA`}, inset 0 0 6px ${({ $painColor }) => $painColor};
  }

  &:focus-visible::-webkit-slider-thumb {
    outline: 2px solid #00FFFF;
    outline-offset: 4px;
  }
`;

const SliderValue = styled.div<{ $color: string }>`
  color: ${({ $color }) => $color};
  font-size: 24px;
  font-weight: 800;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}40`};
  border-radius: 12px;
  text-shadow: 0 0 10px ${({ $color }) => `${$color}60`};
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 44px;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
    outline: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
    outline: none;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 8px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  &:focus {
    border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
    outline: none;
  }
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button<{ $active: boolean }>`
  padding: 8px 14px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid ${({ $active, theme }) => ($active ? (theme?.colors?.accent || '#00FFFF') : 'rgba(255,255,255,0.15)')};
  background: ${({ $active }) => ($active ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.3)')};
  color: ${({ $active, theme }) => ($active ? (theme?.colors?.accent || '#00FFFF') : 'rgba(255,255,255,0.6)')};
  transition: all 0.15s;
  min-height: 44px;
  &:hover {
    border-color: ${({ theme }) => theme?.colors?.accent || '#00FFFF'};
    color: ${({ theme }) => theme?.colors?.accent || '#00FFFF'};
  }
  &:active {
    transform: scale(0.96);
  }
`;

const SyndromeToggle = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SyndromeBtn = styled.button<{ $active: boolean; $color: string }>`
  flex: 1;
  min-width: 100px;
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

  ${({ $variant, theme }) => {
    const accent = theme?.colors?.accent || '#00FFFF';
    switch ($variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, ${accent}, #7851A9);
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
  border-top: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0, 255, 255, 0.1)'};
  margin: 16px 0;
`;

const HintText = styled.div`
  color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.4)'};
  font-size: 11px;
  margin-top: 4px;
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
  isClientMode?: boolean;
}

/**
 * Find the matching region on the opposite side.
 * e.g., right_shoulder + 'left' → left_shoulder
 */
function findRegionForSide(currentId: string, newSide: PainSide): string {
  const current = getRegionById(currentId);
  if (!current || current.side === 'center' || newSide === 'center' || newSide === 'bilateral') {
    return currentId;
  }
  // Build the expected ID by swapping the side prefix
  const oppositePrefix = current.side === 'left' ? 'left_' : 'right_';
  const newPrefix = newSide === 'left' ? 'left_' : 'right_';
  if (currentId.startsWith(oppositePrefix)) {
    const swappedId = newPrefix + currentId.slice(oppositePrefix.length);
    if (getRegionById(swappedId)) return swappedId;
  }
  // Fallback: find a region with the same muscleGroup, view, and desired side
  const match = ALL_BODY_REGIONS.find(
    (r) => r.muscleGroup === current.muscleGroup && r.view === current.view && r.side === newSide,
  );
  return match?.id || currentId;
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
  isClientMode = false,
}) => {
  // Track effective region — may differ from regionId if user swaps sides
  const [effectiveRegionId, setEffectiveRegionId] = useState<string | null>(regionId);
  const region = effectiveRegionId ? getRegionById(effectiveRegionId) : null;
  // Ref to prevent form reset when side-swap changes effectiveRegionId
  const isSideSwapRef = useRef(false);

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

  // Sync effectiveRegionId when parent regionId changes
  useEffect(() => {
    setEffectiveRegionId(regionId);
  }, [regionId]);

  // Reset form when region changes or existing entry loads
  // Skip reset when the change came from a side-swap (user is actively editing)
  useEffect(() => {
    if (isSideSwapRef.current) {
      isSideSwapRef.current = false;
      return;
    }
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
      const currentRegion = effectiveRegionId ? getRegionById(effectiveRegionId) : null;
      setPainLevel(5);
      setPainType('aching');
      setSide(currentRegion?.side || 'center');
      setDescription('');
      setOnsetDate('');
      setSelectedAggravating([]);
      setSelectedRelieving([]);
      setTrainerNotes('');
      setAiNotes('');
      setPosturalSyndrome('none');
    }
  }, [effectiveRegionId, existingEntry]);

  const toggleChip = useCallback(
    (value: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
      setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    },
    [],
  );

  const handleSave = () => {
    if (!effectiveRegionId) return;
    const payload: CreatePainEntryPayload = {
      bodyRegion: effectiveRegionId,
      side,
      painLevel,
      painType,
      description: description.trim() || undefined,
      onsetDate: onsetDate || undefined,
      aggravatingMovements: selectedAggravating.length > 0 ? selectedAggravating.join(', ') : undefined,
      relievingFactors: selectedRelieving.length > 0 ? selectedRelieving.join(', ') : undefined,
      // Only include trainer fields in trainer mode
      ...(!isClientMode && {
        trainerNotes: trainerNotes.trim() || undefined,
        aiNotes: aiNotes.trim() || undefined,
        posturalSyndrome,
      }),
    };
    onSave(payload);
  };

  const severityColor = getSeverityColor(painLevel);

  return (
    <>
      <Overlay $isOpen={isOpen} onClick={onClose} />
      <Panel $isOpen={isOpen}>
        <DragHandle />
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
              $painColor={severityColor}
            />
            <SliderValue $color={severityColor}>{painLevel}</SliderValue>
          </SliderContainer>
          <HintText>
            {painLevel >= 7 ? 'Severe — exercises AVOIDED' : painLevel >= 4 ? 'Moderate — exercises MODIFIED' : 'Mild — include with corrective warm-up'}
          </HintText>
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
          <Select value={side} onChange={(e) => {
            const newSide = e.target.value as PainSide;
            setSide(newSide);
            // Swap to matching region when side changes (e.g., right_shoulder → left_shoulder)
            if (effectiveRegionId && (newSide === 'left' || newSide === 'right')) {
              const swapped = findRegionForSide(effectiveRegionId, newSide);
              if (swapped !== effectiveRegionId) {
                isSideSwapRef.current = true; // prevent form reset
                setEffectiveRegionId(swapped);
              }
            }
          }}>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="center">Center</option>
            <option value="bilateral">Bilateral</option>
          </Select>
        </FormGroup>

        {/* Description */}
        <FormGroup>
          <Label>{isClientMode ? 'Describe Your Pain' : 'Client Description'}</Label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isClientMode
              ? "Describe what the pain feels like, e.g., 'Sharp pain when I lift my arm overhead...'"
              : "What does the client say about this pain? e.g., 'Sharp pain when pressing overhead...'"
            }
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
          <Label>{isClientMode ? 'What Makes It Worse?' : 'Aggravating Movements'}</Label>
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
          <Label>{isClientMode ? 'What Helps?' : 'Relieving Factors'}</Label>
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

        {/* Trainer-only fields */}
        {!isClientMode && (
          <>
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
              <HintText>
                This text will be injected into the AI workout generation prompt.
              </HintText>
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
          </>
        )}

        {/* Action Buttons */}
        <ButtonRow>
          <ActionBtn $variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : existingEntry ? 'Update' : 'Save'}
          </ActionBtn>
          {existingEntry && !isClientMode && (
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
