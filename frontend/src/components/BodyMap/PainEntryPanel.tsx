/**
 * PainEntryPanel — Slide-out form for recording pain/injury entries
 * =================================================================
 * Opens when a body region is clicked on the BodyMapSVG.
 * Supports two modes:
 *   - Trainer mode: full form with AI notes, postural syndrome, trainer notes
 *   - Client mode: simplified form — pain level, type, side, description, movements
 *
 * Responsive: bottom-sheet on mobile (≤430px), side panel on larger screens.
 * Theme-aware with Crystalline Swan fallbacks.
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PainContext,
  PosturalSyndrome,
  CreatePainEntryPayload,
} from '../../services/painEntryService';

import {
  Panel,
  DragHandle,
  Overlay,
  PanelHeader,
  PanelTitle,
  CloseBtn,
  FormGroup,
  Label,
  GroupLabel,
  SliderContainer,
  Slider,
  SliderValue,
  Select,
  TextArea,
  Input,
  ChipGrid,
  Chip,
  SyndromeToggle,
  SyndromeBtn,
  ButtonRow,
  ActionBtn,
  Divider,
  HintText,
} from './PainEntryPanel.styles';

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

  // ── Slice 3 (B6): real dialog semantics ─────────────────────────────
  // The panel was a modal that wasn't one: no role, no focus management, no
  // Escape, and its 11 hidden fields stayed tab-reachable while closed.
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      (panel as any).inert = false;
      panel.removeAttribute('aria-hidden');
      const firstFocusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
      return undefined;
    }
    // Closed: unreachable for keyboard/AT (the transform only moves it
    // off-screen), and focus returns to the opener.
    (panel as any).inert = true;
    panel.setAttribute('aria-hidden', 'true');
    if (lastFocusedRef.current && document.contains(lastFocusedRef.current)) {
      lastFocusedRef.current.focus();
    }
    return undefined;
  }, [isOpen]);

  const handleDialogKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap: cycle within the dialog.
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  // Drag-to-dismiss: the handle was pure decoration promising a gesture
  // that didn't exist.
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const handleDragMove = useCallback(() => {}, []);
  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (dragStartYRef.current !== null && e.clientY - dragStartYRef.current > 80) {
      onClose();
    }
    dragStartYRef.current = null;
  }, [onClose]);
  const region = effectiveRegionId ? getRegionById(effectiveRegionId) : null;
  // Ref to prevent form reset when side-swap changes effectiveRegionId
  const isSideSwapRef = useRef(false);

  const [painLevel, setPainLevel] = useState(5);
  const [painType, setPainType] = useState<PainType>('aching');
  const [side, setSide] = useState<PainSide>('center');
  // Slice 5 dry-loop finding: F5's rest-pain escalation was server-ready but
  // the form never sent painContext — unreachable feature. Now first-class.
  const [painContext, setPainContext] = useState<PainContext>('loaded_movement');
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
      setPainContext(existingEntry.painContext || 'loaded_movement');
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
      setPainContext('loaded_movement');
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
      painContext,
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
      <Overlay $isOpen={isOpen} onPointerDown={onClose} role="presentation" />
      <Panel
        ref={panelRef}
        $isOpen={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={region?.label ? `Pain entry for ${region.label}` : 'Pain entry'}
        onKeyDown={handleDialogKeyDown}
      >
        <DragHandle
          role="button"
          tabIndex={-1}
          aria-hidden="true"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <PanelHeader>
          <PanelTitle>{region?.label || 'Select Region'}</PanelTitle>
          <CloseBtn onClick={onClose} aria-label="Close panel">&#x2715;</CloseBtn>
        </PanelHeader>

        {/* Pain Level Slider */}
        <FormGroup>
          <Label htmlFor="pain-entry-level">Pain Level</Label>
          <SliderContainer>
            <Slider
              id="pain-entry-level"
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

        {/* Slice 5 (F5): pain felt AT REST is a contraindication signal —
            escalates the safety tier server-side. */}
        <FormGroup>
          <GroupLabel id="pain-context-label">When does it hurt?</GroupLabel>
          <ChipGrid role="radiogroup" aria-labelledby="pain-context-label">
            {([
              ['loaded_movement', 'Under load'],
              ['daily_activity', 'Daily life'],
              ['rest', 'At rest'],
            ] as Array<[PainContext, string]>).map(([value, label]) => (
              <Chip
                key={value}
                type="button"
                role="radio"
                aria-checked={painContext === value}
                $active={painContext === value}
                onClick={() => setPainContext(value)}
              >
                {label}
              </Chip>
            ))}
          </ChipGrid>
        </FormGroup>

        {/* Pain Type */}
        <FormGroup>
          <Label htmlFor="pain-entry-type">Pain Type</Label>
          <Select id="pain-entry-type" value={painType} onChange={(e) => setPainType(e.target.value as PainType)}>
            {PAIN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormGroup>

        {/* Side */}
        <FormGroup>
          <Label htmlFor="pain-entry-side">Side</Label>
          <Select id="pain-entry-side" value={side} onChange={(e) => {
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
          <Label htmlFor="pain-entry-description">{isClientMode ? 'Describe Your Pain' : 'Client Description'}</Label>
          <TextArea
            id="pain-entry-description"
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
          <Label htmlFor="pain-entry-onset">When did it start?</Label>
          <Input
            id="pain-entry-onset"
            type="date"
            value={onsetDate}
            onChange={(e) => setOnsetDate(e.target.value)}
          />
        </FormGroup>

        <Divider />

        {/* Aggravating Movements */}
        <FormGroup>
          <GroupLabel>{isClientMode ? 'What Makes It Worse?' : 'Aggravating Movements'}</GroupLabel>
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
          <GroupLabel>{isClientMode ? 'What Helps?' : 'Relieving Factors'}</GroupLabel>
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
              <GroupLabel>Postural Syndrome</GroupLabel>
              <SyndromeToggle>
                <SyndromeBtn
                  $active={posturalSyndrome === 'none'}
                  $color="#8B5CF6"
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
              <Label htmlFor="pain-entry-ai-notes">Swan Coach Guidance Notes</Label>
              <TextArea
                id="pain-entry-ai-notes"
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="Guidance for Swan Coach when generating workouts, e.g., 'Focus on thoracic mobility before any pressing...'"
              />
              <HintText>
                This text will be injected into the AI workout generation prompt.
              </HintText>
            </FormGroup>

            {/* Trainer Notes (private) */}
            <FormGroup>
              <Label htmlFor="pain-entry-trainer-notes">Trainer Notes (Private)</Label>
              <TextArea
                id="pain-entry-trainer-notes"
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                placeholder="Internal notes — not sent to Swan Coach..."
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
