import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

export interface Conflict {
  type: 'hard' | 'soft';
  reason: string;
  conflictingSession?: {
    id: number | string;
    clientName?: string;
    sessionDate: string | Date;
  };
  suggestion?: string;
}

export interface Alternative {
  date: Date;
  hour: number;
  label: string;
}

interface ConflictPanelProps {
  isOpen: boolean;
  conflicts: Conflict[];
  alternatives: Alternative[];
  onSelectAlternative: (alt: Alternative) => void;
  onOverride?: () => void;
  onClose: () => void;
  canOverride?: boolean;
}

const ConflictPanel: React.FC<ConflictPanelProps> = ({
  isOpen,
  conflicts,
  alternatives,
  onSelectAlternative,
  onOverride,
  onClose,
  canOverride = false
}) => {
  if (!isOpen) return null;

  const hardConflicts = conflicts.filter((conflict) => conflict.type === 'hard');
  const softConflicts = conflicts.filter((conflict) => conflict.type === 'soft');

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(event) => event.stopPropagation()}>
        <Header>
          <AlertTriangle size={24} color="#FF4757" />
          <Title>Scheduling Conflict</Title>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </Header>

        <Content>
          {hardConflicts.length > 0 && (
            <ConflictSection $tone="hard">
              <SectionLabel>Hard Conflicts (Must Resolve)</SectionLabel>
              {hardConflicts.map((conflict, idx) => (
                <ConflictItem key={`hard-${idx}`} $tone="hard">
                  <ConflictIcon>
                    <AlertTriangle size={16} />
                  </ConflictIcon>
                  <ConflictText>{conflict.reason}</ConflictText>
                </ConflictItem>
              ))}
            </ConflictSection>
          )}

          {softConflicts.length > 0 && (
            <ConflictSection $tone="soft">
              <SectionLabel>Warnings</SectionLabel>
              {softConflicts.map((conflict, idx) => (
                <ConflictItem key={`soft-${idx}`} $tone="soft">
                  <ConflictIcon>
                    <Clock size={16} />
                  </ConflictIcon>
                  <ConflictText>{conflict.reason}</ConflictText>
                </ConflictItem>
              ))}
            </ConflictSection>
          )}

          {alternatives.length > 0 && (
            <AlternativesSection>
              <SectionLabel>Suggested Alternatives</SectionLabel>
              <AlternativesGrid>
                {alternatives.map((alt, idx) => (
                  <AlternativeCard key={`alt-${idx}`} onClick={() => onSelectAlternative(alt)}>
                    <AltTime>{alt.label}</AltTime>
                    <AltAction>Select</AltAction>
                  </AlternativeCard>
                ))}
              </AlternativesGrid>
            </AlternativesSection>
          )}
        </Content>

        <Footer>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          {canOverride && hardConflicts.length > 0 && (
            <OverrideButton onClick={onOverride}>
              Override (Admin)
            </OverrideButton>
          )}
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default ConflictPanel;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Panel = styled.div`
  background: rgba(10, 10, 30, 0.95);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  color: ${galaxySwanTheme.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${galaxySwanTheme.text.secondary};
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;

  &:hover {
    color: ${galaxySwanTheme.text.primary};
  }
`;

const Content = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const ConflictSection = styled.div<{ $tone: 'hard' | 'soft' }>`
  padding: 1rem;
  border-radius: 10px;
  background: ${({ $tone }) =>
    $tone === 'hard' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 215, 0, 0.1)'};
  border: 1px solid ${({ $tone }) =>
    $tone === 'hard' ? 'rgba(255, 71, 87, 0.3)' : 'rgba(255, 215, 0, 0.3)'};
`;

const SectionLabel = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${galaxySwanTheme.text.secondary};
  margin-bottom: 0.75rem;
`;

const ConflictItem = styled.div<{ $tone: 'hard' | 'soft' }>`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: ${({ $tone }) => ($tone === 'hard' ? '#FF4757' : '#FFD700')};
`;

const ConflictIcon = styled.span`
  flex-shrink: 0;
  margin-top: 2px;
`;

const ConflictText = styled.span`
  font-size: 0.9rem;
  color: ${galaxySwanTheme.text.primary};
`;

const AlternativesSection = styled.div``;

const AlternativesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
`;

const AlternativeCard = styled.button`
  background: ${galaxySwanTheme.background.surface};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }
`;

const AltTime = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  margin-bottom: 0.25rem;
`;

const AltAction = styled.div`
  font-size: 0.7rem;
  color: ${galaxySwanTheme.primary.main};
  text-transform: uppercase;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  color: ${galaxySwanTheme.text.primary};
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    border-color: ${galaxySwanTheme.text.secondary};
  }
`;

const OverrideButton = styled.button`
  background: rgba(255, 71, 87, 0.2);
  border: 1px solid rgba(255, 71, 87, 0.5);
  color: #FF4757;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: rgba(255, 71, 87, 0.3);
  }
`;
