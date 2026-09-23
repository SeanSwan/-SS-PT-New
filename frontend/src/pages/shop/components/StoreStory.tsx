import React from 'react';
import { ExperienceHeading, ExperienceLead, ExperienceSection, Eyebrow, StoryGrid, StoryStep, StepHeading, StepNumber, StepText } from './StoreExperience.styles';
import styled from 'styled-components';

const steps = [
  ['01', 'Consultation', 'Start with a conversation about your current training, schedule, and the work you want to make possible.'],
  ['02', 'Choose the right commitment', 'Use the schedule and session details shown here to choose a package that fits the way you can train.'],
  ['03', 'Log and review progress', 'Training becomes useful when sessions are recorded and reviewed. Your coach uses that record to guide the next decision.'],
] as const;
const Faq = styled.div`display: grid; gap: .65rem; margin-top: 2.2rem; max-width: 760px;`;
const FaqItem = styled.details`padding: .9rem 1rem; border: 1px solid rgba(96,192,240,.16); border-radius: .8rem; background: rgba(0,32,96,.2); color: var(--text-secondary, rgba(224,236,244,.8)); line-height: 1.55; summary { min-height: 44px; color: var(--text-heading, #e0ecf4); cursor: pointer; font-weight: 800; }`;

const StoreStory: React.FC = () => (
  <ExperienceSection aria-labelledby="store-method-heading">
    <Eyebrow>Inside the crystal vault</Eyebrow>
    <ExperienceHeading id="store-method-heading">The work has a method.</ExperienceHeading>
    <ExperienceLead>Training is a practice with a beginning, a useful record, and a next step. The store keeps the commitment visible so the coaching can stay focused on the work.</ExperienceLead>
    <StoryGrid>
      {steps.map(([number, title, copy]) => <StoryStep key={number}><StepNumber aria-hidden="true">{number}</StepNumber><StepHeading>{title}</StepHeading><StepText>{copy}</StepText></StoryStep>)}
    </StoryGrid>
    <Faq aria-label="Store questions">
      <FaqItem><summary>What happens before I choose a package?</summary><p>A consultation clarifies your current training, schedule, and the commitment that fits those facts.</p></FaqItem>
      <FaqItem><summary>Why is a training price sometimes unavailable?</summary><p>Training access can vary by account. When a price is not available for your account, you will see that clearly and can ask about the next step.</p></FaqItem>
      <FaqItem><summary>Are recovery product prices visible to guests?</summary><p>Physical product prices are public. Sign in is required to place a purchase in the cart, and stock or variant limits remain visible.</p></FaqItem>
      <FaqItem><summary>How are memberships different from session packages?</summary><p>Memberships and training packages are separate ways to organize training. The membership section shows its current tier details; a session package describes a set training commitment.</p></FaqItem>
      <FaqItem><summary>What will checkout confirm?</summary><p>Review your items, applicable tax, and delivery or pickup details before you pay. Your confirmation page will show the order status and next steps. If confirmation is delayed, check the status there before trying to pay again.</p></FaqItem>
    </Faq>
  </ExperienceSection>
);

export default StoreStory;
