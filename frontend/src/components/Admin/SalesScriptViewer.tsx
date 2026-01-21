/**
 * SalesScriptViewer
 * =================
 * Galaxy-Swan themed viewer for sales scripts and objection handling.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle, Copy } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  PrimaryButton,
  OutlinedButton
} from '../UniversalMasterSchedule/ui';
import {
  INITIAL_CONTACT,
  OBJECTION_HANDLING,
  MOVEMENT_SCREEN_QUESTIONS
} from '../../config/salesScripts';

const SalesScriptViewer: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const initialScript = useMemo(() => (
    [
      INITIAL_CONTACT.intro,
      '',
      INITIAL_CONTACT.movementScreenPitch,
      '',
      INITIAL_CONTACT.schedulingCTA
    ].join('\n')
  ), []);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopiedKey(null);
    }
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Sales Script Library</PageTitle>
          <BodyText secondary>
            Reference approved scripts for parent onboarding and objections.
          </BodyText>
        </div>
        <PrimaryButton type="button" onClick={() => handleCopy('initial', initialScript)}>
          <Copy size={16} />
          Copy Initial Script
        </PrimaryButton>
      </HeaderRow>

      <GridContainer columns={2} gap="1.5rem">
        <Card>
          <CardHeader>
            <SectionTitle>Initial Contact</SectionTitle>
            {copiedKey === 'initial' && (
              <CopyStatus>
                <CheckCircle size={14} />
                Copied
              </CopyStatus>
            )}
          </CardHeader>
          <CardBody>
            <ScriptBlock>{INITIAL_CONTACT.intro}</ScriptBlock>
            <ScriptBlock>{INITIAL_CONTACT.movementScreenPitch}</ScriptBlock>
            <ScriptBlock>{INITIAL_CONTACT.schedulingCTA}</ScriptBlock>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle>Movement Screen Questions</SectionTitle>
          </CardHeader>
          <CardBody>
            <QuestionList>
              {MOVEMENT_SCREEN_QUESTIONS.map((question) => (
                <QuestionItem key={question}>{question}</QuestionItem>
              ))}
            </QuestionList>
            <SmallText secondary>
              Use these questions to guide the free 10-minute assessment.
            </SmallText>
          </CardBody>
        </Card>
      </GridContainer>

      <Card>
        <CardHeader>
          <SectionTitle>Objection Handling</SectionTitle>
        </CardHeader>
        <CardBody>
          <ObjectionGrid>
            {Object.entries(OBJECTION_HANDLING).map(([key, value]) => {
              const label = key.replace(/_/g, ' ');
              const copyKey = `objection-${key}`;
              const copyText = `${value.response}\nOffer: ${value.offer}`;

              return (
                <ObjectionCard key={key}>
                  <FlexBox justify="space-between" align="center" gap="0.75rem">
                    <ObjectionTitle>{label}</ObjectionTitle>
                    <Badge>{value.offer}</Badge>
                  </FlexBox>
                  <ObjectionText>{value.response}</ObjectionText>
                  <FlexBox justify="space-between" align="center" gap="0.75rem">
                    <SmallText secondary>Suggested offer: {value.offer}</SmallText>
                    <OutlinedButton type="button" onClick={() => handleCopy(copyKey, copyText)}>
                      <Copy size={14} />
                      Copy
                    </OutlinedButton>
                  </FlexBox>
                  {copiedKey === copyKey && (
                    <CopyStatus>
                      <CheckCircle size={14} />
                      Copied
                    </CopyStatus>
                  )}
                </ObjectionCard>
              );
            })}
          </ObjectionGrid>
        </CardBody>
      </Card>
    </PageWrapper>
  );
};

export default SalesScriptViewer;

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

const ScriptBlock = styled.p`
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  white-space: pre-line;
`;

const QuestionList = styled.ul`
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.5rem;
`;

const QuestionItem = styled.li`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ObjectionGrid = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const ObjectionCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ObjectionTitle = styled.span`
  font-size: 1rem;
  font-weight: 600;
  text-transform: capitalize;
  color: #ffffff;
`;

const ObjectionText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
`;

const Badge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  border: 1px solid rgba(0, 255, 255, 0.3);
`;

const CopyStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #10b981;
`;
