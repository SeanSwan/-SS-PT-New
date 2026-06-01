import styled from 'styled-components';
import { ErrorText } from './ui';

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
`;

export const InlineSectionHeader = styled(SectionHeader)`
  margin-bottom: 0;
`;

export const ErrorBlock = styled(ErrorText)`
  margin-bottom: 1rem;
`;

export const ForceOverrideActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

export const CenteredPad = styled.div<{ $pad?: string }>`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: ${({ $pad }) => $pad ?? '1rem'};
`;

export const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

export const ClientCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease-out;
  width: 100%;
  min-height: 44px;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
  }

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

export const ApplyHeaderRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

export const ClientAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60C0F0;
`;

export const CreditBadge = styled.span<{ $negative?: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
  color: ${({ $negative }) => $negative ? '#ef4444' : '#10b981'};
  border: 1px solid ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
`;

export const SessionBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

export const ApplySection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

export const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  margin-bottom: 1rem;
`;

export const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  font-size: 0.9rem;
`;

export const ModeToggle = styled.div`
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  min-height: 44px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 150ms ease;
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $active }) => $active ? '#60C0F0' : 'rgba(255, 255, 255, 0.6)'};

  @media (max-width: 375px) {
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
`;
