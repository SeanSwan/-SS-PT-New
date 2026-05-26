/**
 * COMPONENT: TrainerWorkoutForgePage.styles
 * PURPOSE: Styled-components extracted from TrainerWorkoutForgePage so the
 * route orchestrator stays under the project line cap.
 */
import styled from 'styled-components';

export const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

export const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
`;

export const CardTitle = styled.h2`
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60C0F0);
`;

export const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin-bottom: 8px;
`;

export const Select = styled.div`
  position: relative;
  margin-bottom: 16px;

  select {
    width: 100%;
    min-height: 44px;
    padding: 10px 40px 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
    font-size: 0.9rem;
    appearance: none;
    cursor: pointer;
  }

  svg {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    opacity: 0.5;
  }
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  margin-bottom: 16px;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const PhaseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
`;

export const PhaseCard = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 12px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-surface, #1A1A24)'};
  color: var(--text-primary, #E0ECF4);

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
  }
`;

export const PhaseName = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
`;

export const PhaseNum = styled.div`
  font-size: 0.7rem;
  color: var(--accent-secondary, #8B5CF6);
  margin-bottom: 2px;
`;

export const PhaseDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin-bottom: 16px;

  span {
    color: var(--text-primary, #E0ECF4);
    font-weight: 600;
  }
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

export const Chip = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.12)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
`;

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const ExerciseArea = styled.div`
  min-height: 80px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-size: 0.85rem;
  margin-bottom: 16px;
`;

export const ExerciseGrid = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
`;

export const ExerciseRow = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) minmax(90px, 0.65fr) minmax(90px, 0.65fr) 44px;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 10px;
  background: var(--bg-surface, #1A1A24);

  ${Input} {
    margin-bottom: 0;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

export const RemoveExerciseBtn = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-base, #030712);
  color: var(--danger, #FF6B6B);
  cursor: pointer;
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.2s;
  background: ${({ $variant }) => $variant === 'secondary' ? 'var(--bg-surface, #1A1A24)' : 'var(--accent-secondary, #8B5CF6)'};
  color: ${({ $variant }) => $variant === 'secondary' ? 'var(--accent-primary, #60C0F0)' : 'var(--button-text-on-accent, #FFFFFF)'};
  border: 1px solid ${({ $variant }) => $variant === 'secondary' ? 'var(--border-soft, rgba(96, 192, 240, 0.12))' : 'transparent'};

  &:hover {
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const HelperCopy = styled.p`
  margin: 12px 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.48));
  font-size: 0.82rem;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 0.95rem;
`;
