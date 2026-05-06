import styled from 'styled-components';

export const PageWrap = styled.div<{ $embedded?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $embedded }) => ($embedded ? '1rem' : '1.25rem')};
  padding: ${({ $embedded }) => ($embedded ? '0' : '1rem')};
  max-width: ${({ $embedded }) => ($embedded ? 'none' : '1400px')};
  margin: 0 auto;
  color: var(--text-primary, #E0ECF4);

  @media (min-width: 768px) {
    padding: ${({ $embedded }) => ($embedded ? '0' : '1.5rem')};
    gap: 1.5rem;
  }
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

export const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.875rem;
  }
`;

export const Sub = styled.p`
  font-size: 0.95rem;
  color: var(--text-secondary, rgba(224,236,244,0.75));
  margin: 0;
  max-width: 680px;
`;

export const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 44px;
  padding: 0 0.875rem;
  background: transparent;
  border: 1px solid rgba(96,192,240,0.3);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 14px rgba(96,192,240,0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1.5fr 1fr;
  }
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const ReviewWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--surface-base, rgba(20,20,36,0.6));
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.2));
  border-radius: 16px;
`;

export const ReviewHeading = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const TranscriptBlock = styled.pre`
  margin: 0;
  padding: 1rem;
  background: var(--surface-elevated, rgba(30,30,60,0.4));
  border: 1px solid rgba(96,192,240,0.18);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  max-height: 280px;
  overflow: auto;
  white-space: pre-wrap;
`;

export const ExerciseList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const ExerciseRow = styled.li`
  padding: 0.625rem 0.875rem;
  background: var(--surface-elevated, rgba(30,30,60,0.4));
  border: 1px solid rgba(96,192,240,0.18);
  border-radius: 10px;
`;

export const SetList = styled.ul`
  margin: 0.4rem 0 0 1.1rem;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: 0.5rem;
`;

export const Button = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 48px;
  padding: 0 1.125rem;
  background: ${({ $primary }) => ($primary ? 'var(--accent-purple, #8B5CF6)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $primary }) => ($primary ? 'rgba(96,192,240,0.5)' : 'rgba(96,192,240,0.3)')};
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: ${({ $primary }) => ($primary ? '0 0 22px rgba(96,192,240,0.5)' : 'none')};
  transition: box-shadow 200ms ease, border-color 200ms ease;

  &:hover:not(:disabled) {
    box-shadow: ${({ $primary }) => ($primary ? '0 0 32px rgba(96,192,240,0.7)' : '0 0 16px rgba(96,192,240,0.3)')};
    border-color: ${({ $primary }) => ($primary ? 'rgba(96,192,240,0.7)' : 'var(--accent-primary, #60C0F0)')};
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const SuccessBanner = styled.div`
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(96, 192, 240, 0.12);
  border: 1px solid rgba(96, 192, 240, 0.4);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);

  & strong {
    font-weight: 700;
    color: var(--accent-primary, #60C0F0);
  }

  & svg {
    color: var(--accent-primary, #60C0F0);
  }
`;

export const ErrorBanner = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: rgba(252, 165, 165, 1);
  font-size: 0.875rem;
`;
