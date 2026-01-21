/**
 * PricingSheetPDF
 * ===============
 * Print-friendly pricing sheet for SwanStudios packages.
 */

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { PACKAGES } from '../../config/pricing';

const PrintStyles = createGlobalStyle`
  @media print {
    body {
      background: #ffffff !important;
      color: #0a0a0f !important;
    }

    * {
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .no-print {
      display: none !important;
    }
  }
`;

const SheetWrapper = styled.div`
  background: radial-gradient(circle at top, rgba(0, 255, 255, 0.08), rgba(10, 10, 15, 0.95));
  padding: 3rem;
  border-radius: 24px;
  color: #ffffff;
  max-width: 900px;
  margin: 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0;
`;

const Subtitle = styled.p`
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
`;

const PackagesGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const PackageCard = styled.div`
  border-radius: 16px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PackageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PackageName = styled.h2`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
`;

const Badge = styled.span<{ variant: 'recommended' | 'value' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${props => props.variant === 'recommended' ? '#0a0a0f' : '#0a0a0f'};
  background: ${props => props.variant === 'recommended'
    ? 'linear-gradient(135deg, #00ffff, #7dd3fc)'
    : 'linear-gradient(135deg, #ffd700, #fca5a5)'
  };
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Price = styled.span`
  font-size: 2rem;
  font-weight: 700;
`;

const PriceMeta = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
`;

const FeatureItem = styled.li`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
`;

const Footer = styled.div`
  margin-top: 2.5rem;
  text-align: center;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
`;

const PricingSheetPDF: React.FC = () => (
  <>
    <PrintStyles />
    <SheetWrapper>
      <Header>
        <Title>SwanStudios Pricing</Title>
        <Subtitle>Galaxy-Swan training packages built for measurable results.</Subtitle>
      </Header>

      <PackagesGrid>
        {PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id}>
            <PackageHeader>
              <PackageName>{pkg.name}</PackageName>
              {pkg.recommended && <Badge variant="recommended">Recommended</Badge>}
              {pkg.bestValue && <Badge variant="value">Best Value</Badge>}
            </PackageHeader>

            <PriceRow>
              <Price>${pkg.price.toLocaleString()}</Price>
              {pkg.duration && <PriceMeta>{pkg.duration} min</PriceMeta>}
              {pkg.sessions && (
                <PriceMeta>
                  {pkg.sessions} sessions {pkg.perSession ? `($${pkg.perSession}/session)` : ''}
                </PriceMeta>
              )}
            </PriceRow>

            <Subtitle>{pkg.description}</Subtitle>

            <FeatureList>
              {pkg.features.map((feature) => (
                <FeatureItem key={feature}>{feature}</FeatureItem>
              ))}
            </FeatureList>

            {pkg.savings && (
              <PriceMeta>Save ${pkg.savings} compared to individual sessions.</PriceMeta>
            )}
          </PackageCard>
        ))}
      </PackagesGrid>

      <Footer className="no-print">
        Print this sheet or export to PDF to share with clients.
      </Footer>
    </SheetWrapper>
  </>
);

export default PricingSheetPDF;
