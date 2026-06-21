import styled, { css, keyframes } from 'styled-components';
import { AlertTriangle, Check, RefreshCw } from 'lucide-react';

const spin = keyframes`to { transform: rotate(360deg); }`;

const spinAnimation = css`
  animation: ${spin} 1s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const focusRing = css`
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Panel = styled.div`
  padding: 0;
`;

export const Label = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #B7C4CF);
  margin-bottom: 6px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin-bottom: 16px;
  transition: border-color 0.15s ease;
  ${focusRing}

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent); }
`;

export const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const ToggleBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) =>
    $active
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent)'
      : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-secondary, #B7C4CF)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  ${focusRing}

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

export const ActionBtn = styled.button`
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: var(--text-on-accent, #FFFFFF);
  transition: opacity 0.15s ease;
  margin-bottom: 20px;
  ${focusRing}

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

export const PetSelect = styled.select`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  flex: 1;
  min-width: 160px;
  ${focusRing}

  option { background: var(--bg-elevated, #141419); }
`;

export const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 16px;
`;

export const ResultCard = styled.button<{ $selected: boolean }>`
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $selected }) =>
    $selected
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)'};
  overflow: hidden;
  cursor: pointer;
  color: inherit;
  padding: 0;
  text-align: left;
  transition: transform 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  ${focusRing}

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:disabled { cursor: not-allowed; opacity: 0.75; }

  @media (prefers-reduced-motion: reduce) {
    transition: border-color 0.15s ease, opacity 0.15s ease;

    &:hover:not(:disabled) { transform: none; }
  }
`;

export const ResultImg = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ResultImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

export const ResultLabel = styled.div`
  padding: 8px 10px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-secondary, #B7C4CF);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const FailedOverlay = styled.div`
  color: color-mix(in srgb, var(--error, #EF4444) 80%, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  text-align: center;
  padding: 16px;
`;

export const FailedIcon = styled(AlertTriangle)`
  display: block;
  margin: 0 auto 4px;
`;

export const SelectedCheck = styled(Check)`
  color: var(--accent-secondary, #8B5CF6);
  flex-shrink: 0;
`;

export const SaveRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

export const Input = styled.input`
  flex: 1 1 180px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
  ${focusRing}

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;

export const RaritySelect = styled.select`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  ${focusRing}

  option { background: var(--bg-elevated, #141419); }
`;

export const SaveBtn = styled.button`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s ease;
  ${focusRing}

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

export const StyleSpacer = styled.div`height: 16px;`;

export const SpinningRefresh = styled(RefreshCw)`
  ${spinAnimation}
`;
