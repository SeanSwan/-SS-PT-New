import styled from 'styled-components';
import { BodyText, Caption, FormField } from './ui';

export const LastPackageBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  margin-bottom: 0.75rem;
`;

export const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const PackageCard = styled.button<{ $selected: boolean; $isLast?: boolean }>`
  position: relative;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  color: inherit;
  transition: all 150ms ease;
  text-align: center;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  background: ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 2px solid ${({ $selected, $isLast }) =>
    $selected ? '#60C0F0'
    : $isLast ? 'rgba(139, 92, 246, 0.5)'
    : 'rgba(255, 255, 255, 0.08)'};

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.4);
  }
`;

export const SpacedFormField = styled(FormField)`
  margin-top: 1rem;
`;

export const ValidationCaption = styled(Caption)`
  color: #ef4444;
  margin-top: 0.25rem;
`;

export const InstructionCaption = styled(Caption)`
  margin-top: 0.25rem;
`;

export const LastBadge = styled.span`
  position: absolute;
  top: -8px;
  right: 8px;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(139, 92, 246, 0.8);
  color: white;
`;

export const PackageName = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: white;
`;

export const PackageSessions = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #60C0F0;
`;

export const PackagePrice = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #10b981;
`;

export const PaymentMethodGrid = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const PaymentMethodButton = styled.button<{ $selected: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 150ms ease;
  border: 2px solid ${({ $selected }) => $selected ? '#60C0F0' : 'rgba(255, 255, 255, 0.15)'};
  background: ${({ $selected }) => $selected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $selected }) => $selected ? '#60C0F0' : 'rgba(255, 255, 255, 0.7)'};

  &:hover {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.08);
  }

  @media (max-width: 375px) {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
  }
`;

export const SummaryCard = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
`;

export const CapitalizedBodyText = styled(BodyText)`
  text-transform: capitalize;
`;

export const PositiveBodyText = styled(BodyText)`
  color: #00FF88;
  font-weight: 700;
`;
