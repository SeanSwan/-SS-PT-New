import styled from 'styled-components';

export const SwitcherShell = styled.section`
  display: grid;
  gap: 0.9rem;
  margin: 0 0 1.15rem;
  padding: clamp(0.9rem, 1.8vw, 1.2rem);
  border: 1px solid var(--border-accent, rgba(96, 192, 240, 0.3));
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(96, 192, 240, 0.1), transparent 34%),
    linear-gradient(145deg, var(--surface-primary, #003080), var(--surface-secondary, #141419));
  box-shadow: 0 20px 46px rgba(0, 32, 96, 0.26);
  color: var(--text-primary, #e0ecf4);
`;

export const SwitcherHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const HeaderIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`;

export const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border-accent, rgba(96, 192, 240, 0.32));
  background: rgba(10, 10, 15, 0.54);
  color: var(--accent-primary, #60c0f0);
  flex: 0 0 auto;
`;

export const HeaderText = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: clamp(1rem, 1.4vw, 1.12rem);
    line-height: 1.2;
  }

  span {
    display: block;
    color: var(--text-secondary, rgba(224, 236, 244, 0.72));
    font-size: 0.82rem;
    line-height: 1.4;
  }
`;

export const TrustStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

export const TrustPill = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.24));
  border-radius: 999px;
  background: rgba(10, 10, 15, 0.48);
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  padding: 0 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
`;

export const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(390px, 1.1fr) minmax(220px, 1fr) minmax(260px, 1.15fr) minmax(190px, auto);
  gap: 0.8rem;
  align-items: end;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.div`
  display: grid;
  gap: 0.4rem;
  min-width: 0;
`;

export const FieldLabel = styled.label`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const RoleSegment = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 0.35rem;
  min-height: 44px;
  padding: 0.25rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.6);
`;

export const RoleButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60c0f0)' : 'transparent')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'var(--button-primary, #002060)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-on-accent, #ffffff)' : 'var(--text-secondary, rgba(224, 236, 244, 0.78))')};
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 900;
  padding: 0 0.55rem;
  min-width: 0;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease;

  &:hover:not(:disabled) {
    border-color: var(--border-accent, rgba(96, 192, 240, 0.32));
    background: rgba(96, 192, 240, 0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }
`;

export const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    left: 0.72rem;
    color: var(--accent-primary, #60c0f0);
    pointer-events: none;
  }

  input {
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
    border-radius: 8px;
    background: var(--surface-elevated, rgba(10, 10, 15, 0.82));
    color: var(--text-primary, #e0ecf4);
    padding: 0 2.5rem 0 2.35rem;
    font: inherit;
  }
`;

export const ClearSearchButton = styled.button`
  position: absolute;
  right: 0.25rem;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: -4px;
  }
`;

export const NativeSelect = styled.select`
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: var(--surface-elevated, rgba(10, 10, 15, 0.82));
  color: var(--text-primary, #e0ecf4);
  padding: 0 0.8rem;
  font: inherit;
`;

export const StartButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--accent-secondary, #8b5cf6);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--button-primary, #002060), var(--accent-secondary, #8b5cf6));
  color: var(--text-on-accent, #ffffff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 1rem;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }
`;
