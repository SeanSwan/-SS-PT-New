/**
 * FILE: FirstSessionOrientationStrip.tsx
 * PURPOSE: Three-step orientation shown ONLY to zero-history clients on the
 *          client home — pre-frames the empty Progress tab as anticipated
 *          rather than broken (launch panel 2026-08-03, Q5 minimum set).
 *
 * Copy is trainer-attributed ("your coach"), not system-generic. Static,
 * low-motion, Crystalline Swan tokens, no data dependencies — renders the
 * same for every zero-history client and disappears after the first log.
 */
import React from 'react';
import styled from 'styled-components';
import { Dumbbell, PencilLine, TrendingUp } from 'lucide-react';

const Strip = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 18px;
  margin: 0 0 4px;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--surface-elevated, #003080) 0%,
    var(--bg-primary, #002060) 100%
  );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`;

const StepIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

const StepText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StepTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const StepMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-secondary, #4070C0);
`;

const FirstSessionOrientationStrip: React.FC = () => (
  <Strip aria-label="How your training works" data-testid="first-session-orientation-strip">
    <Step>
      <StepIcon aria-hidden="true"><Dumbbell size={17} /></StepIcon>
      <StepText>
        <StepTitle>1. Train with your coach</StepTitle>
        <StepMeta>Your first session sets your baseline.</StepMeta>
      </StepText>
    </Step>
    <Step>
      <StepIcon aria-hidden="true"><PencilLine size={17} /></StepIcon>
      <StepText>
        <StepTitle>2. Log it here</StepTitle>
        <StepMeta>Every workout becomes part of your record.</StepMeta>
      </StepText>
    </Step>
    <Step>
      <StepIcon aria-hidden="true"><TrendingUp size={17} /></StepIcon>
      <StepText>
        <StepTitle>3. Watch your proof build</StepTitle>
        <StepMeta>Charts and milestones grow from real sessions.</StepMeta>
      </StepText>
    </Step>
  </Strip>
);

export default FirstSessionOrientationStrip;
