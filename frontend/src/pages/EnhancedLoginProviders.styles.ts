/** Provider-button presentation for the canonical C12 login form. */
import styled from 'styled-components';

export const ProviderSection = styled.section`
  display: grid;
  gap: 13px;
  margin-top: 20px;
`;

export const Divider = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  color: var(--text-muted, #a8b6c7);
  font: 500 0.75rem/1.2 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &::before,
  &::after {
    content: '';
    height: 1px;
    background: var(--border-subtle, rgba(224, 236, 244, 0.22));
  }
`;

export const ProviderList = styled.div`
  display: grid;
  gap: 10px;
`;

export const ProviderButton = styled.button`
  display: grid;
  grid-template-columns: 30px 1fr 30px;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: 9px 12px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.28));
  border-radius: 10px;
  background: var(--surface-elevated, #1a1a24);
  color: var(--text-primary, #e0ecf4);
  font: 600 0.92rem/1.3 'Sora', sans-serif;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60c0f0);
    background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 86%, var(--primary, #002060));
  }

  &:focus-visible {
    outline: 3px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

export const ProviderMark = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-cyan-strong, rgba(96, 192, 240, 0.48));
  border-radius: 8px;
  color: var(--accent-primary, #60c0f0);
  font: 700 0.82rem/1 'Fira Code', monospace;
`;

export const ProviderSpacer = styled.span`
  width: 28px;
  height: 1px;
`;
export const MethodNotice = styled.p`
  margin: 0;
  color: var(--text-secondary, #c8d8e8);
  font: 500 0.82rem/1.45 'Sora', sans-serif;
  text-align: center;
`;