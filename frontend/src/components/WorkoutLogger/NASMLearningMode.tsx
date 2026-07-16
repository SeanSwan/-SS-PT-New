/**
 * ============================================================================
 * FILE: NASMLearningMode.tsx
 * PURPOSE: Context provider + toggle for NASM Learning Mode — when ON,
 *          contextual education tooltips appear throughout the app
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a React context that tracks whether NASM
 * Learning Mode is enabled. Persists the preference to the backend via
 * PUT /api/profile { preferences: { nasmLearningMode: true } }.
 *
 * HOW IT FITS: Wraps WorkoutLogger and BootcampBuilder. Child components
 * call useNASMLearning() to check if education content should render.
 *
 * KEY DECISIONS: Uses the existing `preferences` JSON column on User model.
 * New trainers default to ON. Toggle is a simple switch in the UI header.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, memo } from 'react';
import styled from 'styled-components';
import { GraduationCap } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';

// ─── Context ─────────────────────────────────────────────────

interface NASMLearningContextValue {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (val: boolean) => void;
}

const NASMLearningContext = createContext<NASMLearningContextValue>({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

const useNASMLearning = () => useContext(NASMLearningContext);

// ─── Provider ────────────────────────────────────────────────

interface NASMLearningProviderProps {
  children: React.ReactNode;
  /** Initial value from user preferences (default: true for new trainers) */
  initialEnabled?: boolean;
  /** Callback to persist preference changes */
  onPreferenceChange?: (enabled: boolean) => void;
}

export const NASMLearningProvider: React.FC<NASMLearningProviderProps> = memo(({
  children,
  initialEnabled = true,
  onPreferenceChange,
}) => {
  const [enabled, setEnabledState] = useState(initialEnabled);

  useEffect(() => {
    setEnabledState(initialEnabled);
  }, [initialEnabled]);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    onPreferenceChange?.(val);
  }, [onPreferenceChange]);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  return (
    <NASMLearningContext.Provider value={{ enabled, toggle, setEnabled }}>
      {children}
    </NASMLearningContext.Provider>
  );
});

NASMLearningProvider.displayName = 'NASMLearningProvider';

// ─── Toggle Switch Component ─────────────────────────────────

interface LearningModeToggleProps {
  compact?: boolean;
}

export const LearningModeToggle: React.FC<LearningModeToggleProps> = memo(({ compact = false }) => {
  const { enabled, toggle } = useNASMLearning();

  return (
    <ToggleWrapper
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={enabled}
      aria-label="NASM Learning Mode"
      title={enabled ? 'Learning Mode ON — contextual tips visible' : 'Learning Mode OFF'}
    >
      <GraduationCap size={16} />
      {!compact && <ToggleLabel>{enabled ? 'Learning ON' : 'Learning OFF'}</ToggleLabel>}
      <ToggleTrack $active={enabled}>
        <ToggleThumb $active={enabled} />
      </ToggleTrack>
    </ToggleWrapper>
  );
});

LearningModeToggle.displayName = 'LearningModeToggle';

// ─── Conditional Wrapper ─────────────────────────────────────
// Renders children only when learning mode is ON

interface WhenLearningProps {
  children: React.ReactNode;
}

export const WhenLearning: React.FC<WhenLearningProps> = ({ children }) => {
  const { enabled } = useNASMLearning();
  if (!enabled) return null;
  return <>{children}</>;
};

// ─── Styled Components ───────────────────────────────────────

const ToggleWrapper = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  min-height: 44px;
  background: ${withAlpha(CS.surfaceDark, 0.8)};
  border: 1px solid ${withAlpha(CS.secondary, 0.15)};
  border-radius: 10px;
  color: ${CS.secondaryLight};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${withAlpha(CS.secondary, 0.1)};
    border-color: ${withAlpha(CS.secondary, 0.3)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
  }

  svg { color: ${CS.gaming}; flex-shrink: 0; }
`;

const ToggleLabel = styled.span`
  font-family: 'Sora', sans-serif;
  white-space: nowrap;
`;

const ToggleTrack = styled.div<{ $active: boolean }>`
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: ${p => p.$active ? withAlpha(CS.gaming, 0.4) : withAlpha(CS.textSecondary, 0.2)};
  position: relative;
  transition: background 0.25s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.div<{ $active: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${p => p.$active ? CS.gaming : CS.textSecondary};
  position: absolute;
  top: 2px;
  left: ${p => p.$active ? '18px' : '2px'};
  transition: left 0.25s, background 0.25s;
  box-shadow: 0 1px 3px ${withAlpha(CS.bgDeep, 0.3)};
`;

export default NASMLearningProvider;
