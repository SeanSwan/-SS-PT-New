import React from 'react';
import styled from 'styled-components';
import { BadgeCheck, Leaf, ShieldQuestion } from 'lucide-react';
import type { FoodProduct } from './productAnalysis.types';
import { Chip, InfoMessage, PanelShell, SectionCopy, SectionTitle } from './ProductAnalysis.styles';

const CertGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const CertCard = styled.div<{ $active: boolean }>`
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(255, 255, 255, 0.12))'};
  border-radius: 8px;
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'rgba(255, 255, 255, 0.04)'};
  color: var(--text-primary, #E0ECF4);
`;

const CertText = styled.div`
  display: grid;
  gap: 0.2rem;
  font-size: 0.85rem;
`;

interface ProductCertificationsPanelProps {
  product: FoodProduct;
}

const ProductCertificationsPanel: React.FC<ProductCertificationsPanelProps> = ({ product }) => (
  <PanelShell>
    <SectionTitle>Certifications and Source Tags</SectionTitle>
    <CertGrid>
      <CertCard $active={product.isOrganic}>
        <Leaf size={22} aria-hidden="true" />
        <CertText><strong>Organic</strong><span>{product.isOrganic ? 'Listed by source' : 'Not listed by source'}</span></CertText>
      </CertCard>
      <CertCard $active={product.isNonGMO}>
        <BadgeCheck size={22} aria-hidden="true" />
        <CertText><strong>Non-GMO</strong><span>{product.isNonGMO ? 'Listed by source' : 'Not listed by source'}</span></CertText>
      </CertCard>
    </CertGrid>
    <InfoMessage>
      Bioengineered/GMO and Non-GMO are shown as sourcing, disclosure, and preference information. Swan does not treat them as blanket health verdicts.
    </InfoMessage>
    <SectionCopy>
      Product labels and certifications depend on provider coverage. When a certification matters, confirm it on the package or manufacturer page.
    </SectionCopy>
    <Chip><ShieldQuestion size={14} />Source-aware claim categories enabled</Chip>
  </PanelShell>
);

export default ProductCertificationsPanel;
