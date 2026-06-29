import React from 'react';
import styled from 'styled-components';
import { Clapperboard, Loader2, Sparkles } from 'lucide-react';
import type { FoodProduct, ProductExplanation, ProductVideoBrief } from './productAnalysis.types';
import { productFlags, sourceConfidenceForProduct } from './productAnalysis.logic';
import { ActionButton, ButtonRow, Chip, InfoMessage, PanelShell, SectionCopy, SectionTitle } from './ProductAnalysis.styles';

const SectionCard = styled.div`
  padding: 0.9rem;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  margin-bottom: 0.75rem;
`;

const CardTitle = styled.h5`
  margin: 0 0 0.35rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
`;

const CardBody = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-size: 0.86rem;
  line-height: 1.55;
`;

const ClaimGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.75rem 0 1rem;
`;

interface HowItsMadePanelProps {
  product: FoodProduct;
  explanation: ProductExplanation | null;
  videoBrief: ProductVideoBrief | null;
  loadingAction: string | null;
  error: string | null;
  onExplainProduct: () => void;
  onCreateVideoBrief: () => void;
}

const HowItsMadePanel: React.FC<HowItsMadePanelProps> = ({
  product,
  explanation,
  videoBrief,
  loadingAction,
  error,
  onExplainProduct,
  onCreateVideoBrief,
}) => {
  const source = explanation?.sourceConfidence || sourceConfidenceForProduct(product);
  const flags = explanation?.flags || productFlags(product);

  return (
    <PanelShell>
      <SectionTitle>Learn How It Is Made</SectionTitle>
      <SectionCopy>{source.detail}</SectionCopy>
      <ClaimGrid>
        {flags.length > 0 ? flags.slice(0, 6).map((flag) => (
          <Chip key={`${flag.category}-${flag.label}`}>{flag.category}: {flag.label}</Chip>
        )) : <Chip>No source-backed concern flags in available data</Chip>}
      </ClaimGrid>
      <ButtonRow>
        <ActionButton onClick={onExplainProduct} disabled={loadingAction === 'explain'}>
          {loadingAction === 'explain' ? <Loader2 size={15} /> : <Sparkles size={15} />}
          {loadingAction === 'explain' ? 'Explaining...' : 'Explain product'}
        </ActionButton>
        <ActionButton $primary onClick={onCreateVideoBrief} disabled={loadingAction === 'video'}>
          {loadingAction === 'video' ? <Loader2 size={15} /> : <Clapperboard size={15} />}
          {loadingAction === 'video' ? 'Drafting...' : 'Create video brief'}
        </ActionButton>
      </ButtonRow>
      {error && <InfoMessage style={{ marginTop: '0.9rem' }}>{error}</InfoMessage>}
      {explanation ? explanation.sections.map((section) => (
        <SectionCard key={section.title}>
          <CardTitle>{section.title}</CardTitle>
          <CardBody>{section.body}</CardBody>
        </SectionCard>
      )) : (
        <SectionCard>
          <CardTitle>What to expect</CardTitle>
          <CardBody>Ask Swan for a source-aware explanation before turning scanner data into education, coaching, or creator content.</CardBody>
        </SectionCard>
      )}
      {explanation?.guardrails?.map((guardrail) => <InfoMessage key={guardrail}>{guardrail}</InfoMessage>)}
      {videoBrief && (
        <SectionCard>
          <CardTitle>{videoBrief.title}</CardTitle>
          <CardBody>Status: {videoBrief.status.replace(/_/g, ' ')}</CardBody>
          {videoBrief.scenes.map((scene) => <CardBody key={scene.title}>Scene: {scene.title} - {scene.notes}</CardBody>)}
        </SectionCard>
      )}
    </PanelShell>
  );
};

export default HowItsMadePanel;
