/**
 * ┌─── SUB-COMPONENT: TempoInput ──────────────────────────────┐
 * │ PARENT: ExerciseCardComponent (SetRow)                      │
 * │ PURPOSE: Validated NASM tempo notation input (e.g., 4/2/1)  │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ [ 4 ] / [ 2 ] / [ 1 ]              │ 3 segments           │
 * │ │  ecc   iso   con                    │ with / separators    │
 * │ │ (or) [ X ] / [ 2 ] / [ X ]         │ "X" = explosive      │
 * │ └──────────────────────────────────────┘                     │
 * │ Props: { value, onChange, defaultTempo? }                    │
 * └──────────────────────────────────────────────────────────────┘
 *
 * CEO Ruling V2.0 Issue #6: Tempo regex supports multi-digit values (\d+).
 * Validates against: /^\d+\/\d+\/\d+$|^[Xx]\/\d+\/[Xx]$/
 *
 * NASM Tempo Notation:
 *   - 3 segments: Eccentric / Isometric / Concentric
 *   - Phase 1 (Stabilization): 4/2/1 (slow eccentric)
 *   - Phase 5 (Power): X/0/X (explosive both phases)
 *   - "X" means "as fast as possible" (explosive)
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

// ─── Validation ─────────────────────────────────────────────

/** CEO Ruling V2.0: regex supports multi-digit values */
const TEMPO_REGEX = /^\d+\/\d+\/\d+$|^[Xx]\/\d+\/[Xx]$/;

/** Validate a tempo string. Returns true if valid NASM format. */
export function isValidTempo(tempo: string): boolean {
  if (!tempo) return true; // Empty is allowed (optional field)
  return TEMPO_REGEX.test(tempo.trim());
}

/** Common NASM tempo presets by OPT phase */
export const TEMPO_PRESETS: Record<string, { label: string; value: string }[]> = {
  '1': [
    { label: 'Phase 1 Standard', value: '4/2/1' },
    { label: 'Slow Eccentric', value: '4/2/2' },
  ],
  '2': [
    { label: 'Phase 2 Standard', value: '2/0/2' },
    { label: 'Moderate Control', value: '3/1/2' },
  ],
  '3': [
    { label: 'Hypertrophy TUT', value: '3/1/2' },
    { label: 'High TUT', value: '4/1/2' },
  ],
  '4': [
    { label: 'Max Strength', value: '2/0/1' },
    { label: 'Controlled Heavy', value: '3/0/1' },
  ],
  '5': [
    { label: 'Explosive', value: 'X/0/X' },
    { label: 'Power Clean', value: 'X/1/X' },
  ],
};

// ─── Styled Components ──────────────────────────────────────

const TempoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 160px;
`;

const TempoSegment = styled.input<{ $isValid: boolean }>`
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  text-align: center;
  background: ${CS.inputBg};
  border: 1px solid ${({ $isValid }) => ($isValid ? CS.border : CS.error)};
  border-radius: 4px;
  color: ${CS.text};
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  padding: 0;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px ${CS.glow}40;
  }

  &::placeholder {
    color: ${withAlpha(CS.text, 0.35)};
  }
`;

const Separator = styled.span`
  color: ${CS.textSecondary};
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  user-select: none;
`;

const TempoLabel = styled.div`
  display: flex;
  gap: 4px;
  font-size: 0.6rem;
  color: ${CS.textSecondary};
  opacity: 0.6;
  margin-top: 2px;

  span {
    width: 44px;
    text-align: center;
  }
`;

// ─── Component ──────────────────────────────────────────────

interface TempoInputProps {
  /** Current tempo value, e.g. "4/2/1" or "X/0/X" */
  value: string;
  /** Called when tempo changes (full string, e.g. "4/2/1") */
  onChange: (tempo: string) => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Default tempo to show as placeholder */
  defaultTempo?: string;
}

const TempoInput = memo(function TempoInput({
  value,
  onChange,
  ariaLabel = 'Tempo',
  defaultTempo = '4/2/1',
}: TempoInputProps) {
  // Split value into 3 segments
  const parts = (value || '').split('/');
  const [ecc, setEcc] = useState(parts[0] || '');
  const [iso, setIso] = useState(parts[1] || '');
  const [con, setCon] = useState(parts[2] || '');

  // Refs for auto-focus on next segment
  const isoRef = useRef<HTMLInputElement>(null);
  const conRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    const newParts = (value || '').split('/');
    setEcc(newParts[0] || '');
    setIso(newParts[1] || '');
    setCon(newParts[2] || '');
  }, [value]);

  const emitChange = useCallback((e: string, i: string, c: string) => {
    const tempo = `${e}/${i}/${c}`;
    // Only emit if at least one segment has content
    if (e || i || c) {
      onChange(tempo);
    } else {
      onChange('');
    }
  }, [onChange]);

  const handleSegmentChange = useCallback((
    segment: 'ecc' | 'iso' | 'con',
    val: string,
  ) => {
    // Allow digits, "X", "x", or empty
    const cleaned = val.replace(/[^0-9Xx]/g, '').slice(0, 2);

    switch (segment) {
      case 'ecc':
        setEcc(cleaned);
        emitChange(cleaned, iso, con);
        // Auto-advance if single digit entered
        if (cleaned.length === 1 && /\d/.test(cleaned)) {
          isoRef.current?.focus();
        }
        break;
      case 'iso':
        setIso(cleaned);
        emitChange(ecc, cleaned, con);
        if (cleaned.length === 1 && /\d/.test(cleaned)) {
          conRef.current?.focus();
        }
        break;
      case 'con':
        setCon(cleaned);
        emitChange(ecc, iso, cleaned);
        break;
    }
  }, [ecc, iso, con, emitChange]);

  const defaultParts = defaultTempo.split('/');
  const fullTempo = `${ecc}/${iso}/${con}`;
  const isValid = !value || isValidTempo(fullTempo);

  return (
    <div aria-label={ariaLabel} role="group">
      <TempoContainer>
        <TempoSegment
          value={ecc}
          onChange={(e) => handleSegmentChange('ecc', e.target.value)}
          placeholder={defaultParts[0] || '4'}
          $isValid={isValid}
          aria-label="Eccentric phase duration"
          maxLength={2}
        />
        <Separator>/</Separator>
        <TempoSegment
          ref={isoRef}
          value={iso}
          onChange={(e) => handleSegmentChange('iso', e.target.value)}
          placeholder={defaultParts[1] || '2'}
          $isValid={isValid}
          aria-label="Isometric phase duration"
          maxLength={2}
        />
        <Separator>/</Separator>
        <TempoSegment
          ref={conRef}
          value={con}
          onChange={(e) => handleSegmentChange('con', e.target.value)}
          placeholder={defaultParts[2] || '1'}
          $isValid={isValid}
          aria-label="Concentric phase duration"
          maxLength={2}
        />
      </TempoContainer>
      <TempoLabel>
        <span>ecc</span>
        <span style={{ width: '10px' }} />
        <span>iso</span>
        <span style={{ width: '10px' }} />
        <span>con</span>
      </TempoLabel>
    </div>
  );
});

export default TempoInput;
