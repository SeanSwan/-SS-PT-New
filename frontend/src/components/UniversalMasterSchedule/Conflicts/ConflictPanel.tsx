import React from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { getAlternativeKey, getConflictKey } from './ConflictPanel.logic';
import {
  AlternativeCard,
  AlternativesGrid,
  AlternativesSection,
  AltAction,
  AltTime,
  CancelButton,
  CloseButton,
  ConflictIcon,
  ConflictItem,
  ConflictSection,
  ConflictText,
  Content,
  Footer,
  Header,
  Overlay,
  OverrideButton,
  Panel,
  SectionLabel,
  Title,
} from './ConflictPanel.styles';

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
          <AlertTriangle size={24} color="var(--danger, #ef4444)" />
          <Title>Scheduling Conflict</Title>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </Header>

        <Content>
          {hardConflicts.length > 0 && (
            <ConflictSection $tone="hard">
              <SectionLabel>Hard Conflicts (Must Resolve)</SectionLabel>
              {hardConflicts.map((conflict) => (
                <ConflictItem key={getConflictKey(conflict)} $tone="hard">
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
              {softConflicts.map((conflict) => (
                <ConflictItem key={getConflictKey(conflict)} $tone="soft">
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
                {alternatives.map((alt) => (
                  <AlternativeCard key={getAlternativeKey(alt)} onClick={() => onSelectAlternative(alt)}>
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
