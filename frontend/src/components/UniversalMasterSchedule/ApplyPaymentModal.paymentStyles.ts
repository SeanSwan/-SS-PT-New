import styled from 'styled-components';

export const ForceOverrideContainer = styled.div`
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  margin-bottom: 1rem;
`;

export const ForceOverrideHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  color: #ef4444;
  margin-bottom: 0.5rem;
`;

export const ForceOverrideBody = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

export const StripeCardSection = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const CardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
`;

export const CardOption = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ $selected }) => $selected ? '#60C0F0' : 'rgba(255, 255, 255, 0.8)'};
  background: ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  border: 2px solid ${({ $selected }) => $selected ? '#60C0F0' : 'rgba(255, 255, 255, 0.1)'};

  &:hover {
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.3);
  }
`;

export const NoCardsMessage = styled.div`
  padding: 1rem;
  text-align: center;
  margin-bottom: 0.5rem;
`;

export const TestCardButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px dashed rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.08);
  color: rgba(139, 92, 246, 0.9);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;
  width: 100%;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.7);
  }
`;

export const ConfirmationBanner = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
`;

export const ConfirmationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fbbf24;
  margin-bottom: 0.5rem;
`;

export const ForceOverrideButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
  }
`;
