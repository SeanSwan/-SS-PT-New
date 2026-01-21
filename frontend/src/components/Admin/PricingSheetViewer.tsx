/**
 * PricingSheetViewer
 * ==================
 * Admin-facing wrapper for the pricing sheet PDF component.
 */

import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Printer, Store } from 'lucide-react';
import {
  PageTitle,
  BodyText,
  Card,
  CardBody,
  PrimaryButton,
  OutlinedButton,
  FlexBox
} from '../UniversalMasterSchedule/ui';
import PricingSheetPDF from '../PricingSheet/PricingSheetPDF';

const PricingSheetViewer: React.FC = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Pricing Sheet</PageTitle>
          <BodyText secondary>
            Use this sheet to share current pricing with clients.
          </BodyText>
        </div>
        <FlexBox gap="0.75rem" wrap>
          <OutlinedButton type="button" onClick={() => navigate('/shop')}>
            <Store size={16} />
            Open Storefront
          </OutlinedButton>
          <PrimaryButton type="button" onClick={handlePrint}>
            <Printer size={16} />
            Print or Save PDF
          </PrimaryButton>
        </FlexBox>
      </HeaderRow>

      <Card>
        <CardBody>
          <PricingSheetPDF />
        </CardBody>
      </Card>
    </PageWrapper>
  );
};

export default PricingSheetViewer;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;
