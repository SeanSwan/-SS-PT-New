import React from 'react';
import styled from 'styled-components';
import type { FoodProduct } from './productAnalysis.types';
import { alternativeLabel } from './productAnalysis.logic';
import { InfoMessage, PanelShell, SectionCopy, SectionTitle } from './ProductAnalysis.styles';

const AlternativesList = styled.div`
  display: grid;
  gap: 0.65rem;
  margin-bottom: 1rem;
`;

const AlternativeItem = styled.div`
  padding: 0.85rem;
  border: 1px solid rgba(96, 192, 240, 0.22);
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.08);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;

  &:before {
    content: "+";
    margin-right: 0.55rem;
    color: var(--accent-primary, #60C0F0);
    font-weight: 900;
  }
`;

const Tips = styled.ul`
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-size: 0.9rem;
  line-height: 1.65;
`;

interface CleanerAlternativesPanelProps {
  product: FoodProduct;
}

const CleanerAlternativesPanel: React.FC<CleanerAlternativesPanelProps> = ({ product }) => {
  const alternatives = product.healthierAlternatives || [];

  return (
    <PanelShell>
      <SectionTitle>Cleaner Alternatives</SectionTitle>
      {alternatives.length > 0 ? (
        <AlternativesList>
          {alternatives.map((alternative, index) => (
            <AlternativeItem key={`${alternativeLabel(alternative)}-${index}`}>{alternativeLabel(alternative)}</AlternativeItem>
          ))}
        </AlternativesList>
      ) : (
        <InfoMessage>No specific alternatives were provided by this data source.</InfoMessage>
      )}
      <SectionTitle>General Comparison Tips</SectionTitle>
      <Tips>
        <li>Compare shorter, recognizable ingredient lists when two products serve the same meal role.</li>
        <li>Check protein, sugar, sodium, and saturated fat against your training context.</li>
        <li>Use organic or Non-GMO labels as sourcing preferences when those matter to you.</li>
        <li>Repeat foods that fit your goals and leave you feeling ready to train.</li>
      </Tips>
      <SectionCopy>These suggestions are education and label-comparison support, not medical advice.</SectionCopy>
    </PanelShell>
  );
};

export default CleanerAlternativesPanel;
