import styled from 'styled-components';

export const DashboardContainer = styled.div`
  width: min(100%, 1800px);
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 2rem);
`;

export const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: clamp(1rem, 2vw, 1.75rem);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.9rem;
  }
`;

export const Title = styled.h1`
  margin: 0;
  color: var(--accent-primary, #60c0f0);
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-size: clamp(1.7rem, 3vw, 2.35rem);
  line-height: 1.08;
  text-shadow: 0 0 14px rgba(139, 92, 246, 0.34);
`;

export const TabsContainer = styled.div`
  display: flex;
  gap: 0.35rem;
  margin-bottom: clamp(1rem, 2vw, 1.75rem);
  overflow-x: auto;
  border-bottom: 1px solid rgba(224, 236, 244, 0.14);
`;

export const Tab = styled.button<{ $isActive: boolean }>`
  min-height: 44px;
  padding: 0.75rem 1.15rem;
  background: ${({ $isActive }) =>
    $isActive ? 'rgba(96, 192, 240, 0.14)' : 'transparent'};
  border: 0;
  border-bottom: 2px solid
    ${({ $isActive }) => ($isActive ? 'var(--accent-primary, #60c0f0)' : 'transparent')};
  color: ${({ $isActive }) =>
    $isActive ? 'var(--accent-primary, #60c0f0)' : 'var(--text-primary, #e0ecf4)'};
  cursor: pointer;
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;

  &:hover,
  &:focus-visible {
    background: rgba(139, 92, 246, 0.16);
    border-bottom-color: var(--accent-primary, #60c0f0);
    color: var(--accent-primary, #60c0f0);
    outline: none;
  }
`;

export const ClientSelectorContainer = styled.div`
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
`;

export const ClientSelector = styled.select`
  min-width: min(100%, 320px);
  min-height: 44px;
  padding: 0.65rem 0.9rem;
  background: rgba(10, 10, 15, 0.76);
  border: 1px solid rgba(224, 236, 244, 0.18);
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.95rem;
  outline: none;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.18);
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;

export const ErrorMessage = styled.div`
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: rgba(255, 92, 92, 0.12);
  border: 1px solid rgba(255, 92, 92, 0.38);
  border-radius: 8px;
  color: var(--danger-text, #ffb4b4);
`;
