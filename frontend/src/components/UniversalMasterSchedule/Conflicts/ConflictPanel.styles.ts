import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: var(--modal-backdrop, rgba(0, 0, 0, 0.72));
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const Panel = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 25, 0.96));
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 34%, transparent);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const Title = styled.h2`
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary, #E0ECF4);
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  border-radius: 4px;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const Content = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const ConflictSection = styled.div<{ $tone: 'hard' | 'soft' }>`
  padding: 1rem;
  border-radius: 10px;
  background: ${({ $tone }) =>
    $tone === 'hard'
      ? 'color-mix(in srgb, var(--danger, #ef4444) 14%, transparent)'
      : 'color-mix(in srgb, var(--warning, #f59e0b) 14%, transparent)'};
  border: 1px solid ${({ $tone }) =>
    $tone === 'hard'
      ? 'color-mix(in srgb, var(--danger, #ef4444) 34%, transparent)'
      : 'color-mix(in srgb, var(--warning, #f59e0b) 34%, transparent)'};
`;

export const SectionLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  margin-bottom: 0.75rem;
`;

export const ConflictItem = styled.div<{ $tone: 'hard' | 'soft' }>`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: ${({ $tone }) => ($tone === 'hard' ? 'var(--danger, #ef4444)' : 'var(--warning, #f59e0b)')};
`;

export const ConflictIcon = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
`;

export const ConflictText = styled.span`
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
`;

export const AlternativesSection = styled.div``;

export const AlternativesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
`;

export const AlternativeCard = styled.button`
  background: var(--bg-surface, rgba(10, 10, 15, 0.88));
  border: 1px solid var(--border, rgba(96, 192, 240, 0.16));
  border-radius: 10px;
  min-height: 44px;
  padding: 0.75rem;
  cursor: pointer;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out, transform 150ms ease-out;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const AltTime = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 0.25rem;
`;

export const AltAction = styled.div`
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  text-transform: uppercase;
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const CancelButton = styled.button`
  background: transparent;
  border: 1px solid var(--border, rgba(96, 192, 240, 0.16));
  color: var(--text-primary, #E0ECF4);
  min-height: 44px;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    border-color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const OverrideButton = styled.button`
  background: color-mix(in srgb, var(--danger, #ef4444) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 52%, transparent);
  color: var(--danger, #ef4444);
  min-height: 44px;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: color-mix(in srgb, var(--danger, #ef4444) 32%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
