import styled from 'styled-components';

export const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

export const Title = styled.h1`
  color: #00ffff;
  font-size: 1.5rem;
  margin: 0;
`;

export const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

export const FilterSelect = styled.select`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #1a1a2e;
    color: white;
  }
`;

export const SearchInput = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 0.875rem;
  width: 200px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
`;

export const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  background: rgba(120, 81, 169, 0.3);
  color: #00ffff;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(120, 81, 169, 0.3);
`;

export const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
`;

export const Tr = styled.tr`
  transition: background 0.15s;
  &:hover {
    background: rgba(120, 81, 169, 0.08);
  }
`;

const statusColors: Record<string, { bg: string; fg: string }> = {
  pending_match: { bg: 'rgba(255, 193, 7, 0.2)', fg: '#ffc107' },
  linked: { bg: 'rgba(0, 255, 136, 0.2)', fg: '#00ff88' },
  superseded: { bg: 'rgba(156, 163, 175, 0.2)', fg: '#9ca3af' },
  revoked: { bg: 'rgba(255, 107, 107, 0.2)', fg: '#ff6b6b' },
};

export const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${({ $status }) => statusColors[$status]?.bg ?? 'rgba(156, 163, 175, 0.2)'};
  color: ${({ $status }) => statusColors[$status]?.fg ?? '#9ca3af'};
`;

const badgeColors: Record<string, { bg: string; fg: string }> = {
  'Waiver Signed': { bg: 'rgba(0, 255, 136, 0.15)', fg: '#00ff88' },
  'AI Consent Signed': { bg: 'rgba(0, 255, 255, 0.15)', fg: '#00ffff' },
  'Consent Missing': { bg: 'rgba(255, 107, 107, 0.15)', fg: '#ff6b6b' },
  'Guardian Required': { bg: 'rgba(255, 193, 7, 0.15)', fg: '#ffc107' },
  'Version Outdated': { bg: 'rgba(255, 152, 0, 0.15)', fg: '#ff9800' },
  'Pending Match': { bg: 'rgba(120, 81, 169, 0.15)', fg: '#b389e0' },
};

export const ContractBadge = styled.span<{ $label: string }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  margin: 2px 4px 2px 0;
  background: ${({ $label }) => badgeColors[$label]?.bg ?? 'rgba(156, 163, 175, 0.15)'};
  color: ${({ $label }) => badgeColors[$label]?.fg ?? '#9ca3af'};
`;

export const ActionButton = styled.button<{ $variant?: 'approve' | 'reject' | 'revoke' | 'link' | 'view' }>`
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 6px;
  transition: opacity 0.2s, transform 0.15s;

  ${({ $variant }) => {
    switch ($variant) {
      case 'approve':
        return 'background: #00ff88; color: #0a0a1a;';
      case 'reject':
        return 'background: #ff6b6b; color: white;';
      case 'revoke':
        return 'background: #ff6b6b; color: white;';
      case 'link':
        return 'background: #00ffff; color: #0a0a1a;';
      default:
        return 'background: #7851a9; color: white;';
    }
  }}

  &:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

export const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid rgba(120, 81, 169, 0.3);
`;

export const ModalTitle = styled.h2`
  color: #00ffff;
  margin: 0 0 20px 0;
  font-size: 1.25rem;
`;

export const Section = styled.div`
  margin-bottom: 20px;
`;

export const SectionLabel = styled.h3`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
`;

export const InfoItem = styled.div`
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;

  strong {
    display: block;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.7rem;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
`;

export const ConsentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const ConsentItem = styled.div<{ $accepted: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  background: ${({ $accepted }) =>
    $accepted ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 107, 107, 0.1)'};
  color: ${({ $accepted }) => ($accepted ? '#00ff88' : '#ff6b6b')};
`;

export const MatchCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(120, 81, 169, 0.2);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
`;

export const MatchRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ConfidenceBar = styled.div<{ $score: number }>`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ $score }) => Math.round($score * 100)}%;
    border-radius: 3px;
    background: ${({ $score }) =>
      $score >= 0.8 ? '#00ff88' : $score >= 0.5 ? '#ffc107' : '#ff6b6b'};
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

export const CloseButton = styled.button`
  padding: 10px 20px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
`;

export const PageButton = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 6px;
  border: 1px solid ${({ $active }) => ($active ? '#00ffff' : 'rgba(120, 81, 169, 0.3)')};
  background: ${({ $active }) => ($active ? 'rgba(0, 255, 255, 0.15)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)')};
  cursor: pointer;
  font-size: 0.85rem;

  &:hover:not(:disabled) {
    background: rgba(120, 81, 169, 0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
`;

export const LoadingState = styled.div`
  text-align: center;
  padding: 48px;
  color: #00ffff;
  font-size: 0.9rem;
`;

export const UserSearchList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-top: 12px;
  border: 1px solid rgba(120, 81, 169, 0.2);
  border-radius: 8px;
`;

export const UserSearchItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  min-height: 44px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${({ $selected }) => ($selected ? 'rgba(0, 255, 255, 0.1)' : 'transparent')};
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  transition: background 0.15s;

  &:hover {
    background: rgba(120, 81, 169, 0.1);
  }

  &:last-child {
    border-bottom: none;
  }
`;
