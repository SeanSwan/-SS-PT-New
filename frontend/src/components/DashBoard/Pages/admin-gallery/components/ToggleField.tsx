/**
 * ToggleField — accessible labelled switch
 * ========================================
 * A tokenized on/off switch with a 44px-tall hit area, keyboard operable.
 */

import React from 'react';
import styled from 'styled-components';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

const ToggleField: React.FC<Props> = ({ label, hint, checked, onChange, disabled }) => (
  <Wrap>
    <Text>
      <strong>{label}</strong>
      {hint && <Hint>{hint}</Hint>}
    </Text>
    <Switch
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      $on={checked}
      onClick={() => onChange(!checked)}
    >
      <Knob $on={checked} />
    </Switch>
  </Wrap>
);

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 44px;
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.9rem;
  color: var(--text-primary, #e0ecf4);
`;

const Hint = styled.span`
  font-size: 0.78rem;
  color: var(--text-muted, #8fa3b8);
`;

const Switch = styled.button<{ $on: boolean }>`
  position: relative;
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 1px solid ${({ $on }) => ($on ? 'var(--accent-primary, #60c0f0)' : 'var(--border-subtle, rgba(96,192,240,0.28))')};
  background: ${({ $on }) => ($on ? 'rgba(96, 192, 240, 0.28)' : 'var(--surface-dark, #1a1a24)')};
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--accent-purple, #8b5cf6); outline-offset: 2px; }
`;

const Knob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $on }) => ($on ? '23px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $on }) => ($on ? 'var(--accent-primary, #60c0f0)' : 'var(--text-muted, #8fa3b8)')};
  transition: left 0.18s ease, background 0.2s ease;
`;

export default ToggleField;
