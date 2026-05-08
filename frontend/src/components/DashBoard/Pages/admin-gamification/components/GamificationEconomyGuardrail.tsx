import React from 'react';
import styled from 'styled-components';
import { CheckCircle2, HeartPulse, ShieldCheck } from 'lucide-react';

const rewardCategories = ['Completion', 'Consistency', 'Mastery', 'Recovery', 'Contribution', 'Education'];

const GamificationEconomyGuardrail: React.FC = () => (
  <Guardrail aria-label="Gamification reward economy guardrail">
    <GuardrailHeader>
      <ShieldCheck size={22} aria-hidden="true" />
      <div>
        <Eyebrow>Reward Economy Charter</Eyebrow>
        <Title>Rewards only count when they map to real health behavior.</Title>
      </div>
    </GuardrailHeader>

    <CategoryList aria-label="Allowed reward sources">
      {rewardCategories.map((category) => (
        <CategoryPill key={category}>
          <CheckCircle2 size={15} aria-hidden="true" />
          {category}
        </CategoryPill>
      ))}
    </CategoryList>

    <GuardrailNote>
      <HeartPulse size={16} aria-hidden="true" />
      Cosmetic drops, avatar upgrades, and store rewards should sit on top of these six signals, not replace them.
    </GuardrailNote>
  </Guardrail>
);

export default GamificationEconomyGuardrail;

const Guardrail = styled.section`
  background:
    linear-gradient(135deg, rgba(0, 32, 96, 0.72), rgba(20, 20, 25, 0.92)),
    var(--card-bg, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  box-shadow: 0 18px 44px var(--shadow-primary, rgba(0, 0, 0, 0.28));
  margin: 0 0 1.5rem;
  padding: 1.1rem;
`;

const GuardrailHeader = styled.div`
  align-items: flex-start;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  gap: 0.75rem;
`;

const Eyebrow = styled.p`
  color: var(--accent-secondary, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 0.25rem;
  text-transform: uppercase;
`;

const Title = styled.h2`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 1.8vw, 1.2rem);
  line-height: 1.25;
  margin: 0;
`;

const CategoryList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
`;

const CategoryPill = styled.li`
  align-items: center;
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.14));
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  gap: 0.35rem;
  font: 700 0.78rem 'Sora', sans-serif;
  min-height: 32px;
  padding: 0.35rem 0.7rem;
`;

const GuardrailNote = styled.p`
  align-items: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  display: flex;
  gap: 0.45rem;
  font: 0.82rem/1.5 'Sora', sans-serif;
  margin: 1rem 0 0;
`;
