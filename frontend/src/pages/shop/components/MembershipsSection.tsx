import React, { useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, Crown } from 'lucide-react';
import { useSubscription } from '../../../hooks/useSubscription';

const cardReveal = {
  hidden: { y: 30, opacity: 0 },
  visible: (i: number) => ({
    y: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15, delay: i * 0.12 },
  }),
};

const MembershipsSection: React.FC = () => {
  const { tiers, fetchTiers } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  if (tiers.length === 0) return null;

  const tierCards = [
    {
      icon: <Sparkles size={20} />,
      name: 'Swan Starter',
      price: 'Free',
      benefit: 'Swan Coach, workout logging, nutrition, and community — forever free.',
      variant: 'starter' as const,
    },
    {
      icon: <Heart size={20} />,
      name: 'Swan Guardian',
      price: 'From $1',
      benefit: 'NASM calculators, 50 Victory charts, advanced analytics. Support the mission.',
      variant: 'guardian' as const,
    },
    {
      icon: <Crown size={20} />,
      name: 'Crystalline Swan',
      price: '$24.99/mo',
      benefit: 'Direct trainer messaging, video form checks, and Content Studio access.',
      variant: 'crystalline' as const,
    },
  ];

  return (
    <SectionWrapper>
      <SectionHeader>
        <SectionEyebrow>Membership Tiers</SectionEyebrow>
        <SectionTitle>Choose Your Level</SectionTitle>
        <SectionSub>Swan Coach is free for everyone. Upgrade for advanced tools and trainer access.</SectionSub>
      </SectionHeader>

      <CardsRow>
        {tierCards.map((card, i) => (
          <MiniCard
            key={card.variant}
            as={motion.div}
            custom={i}
            variants={cardReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            $variant={card.variant}
          >
            <CardIcon $variant={card.variant}>{card.icon}</CardIcon>
            <CardName>{card.name}</CardName>
            <CardPrice $variant={card.variant}>{card.price}</CardPrice>
            <CardBenefit>{card.benefit}</CardBenefit>
            <LearnMoreBtn
              $variant={card.variant}
              onClick={() => navigate('/ascension')}
            >
              {card.variant === 'starter' ? 'Get Started' : 'Learn More'}
            </LearnMoreBtn>
          </MiniCard>
        ))}
      </CardsRow>
    </SectionWrapper>
  );
};

export default MembershipsSection;

// ─── Styled Components ─────────────────────────────────────────

const SectionWrapper = styled.section`
  padding: 4rem 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
`;

const SectionEyebrow = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #60C0F0;
  margin-bottom: 0.5rem;
`;

const SectionTitle = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.5rem;
`;

const SectionSub = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
`;

const CardsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;

  @media (min-width: 640px) { grid-template-columns: repeat(3, 1fr); }
`;

type Variant = 'starter' | 'guardian' | 'crystalline';

const MiniCard = styled.div<{ $variant: Variant }>`
  border-radius: 1rem;
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s;

  ${({ $variant }) => $variant === 'starter' && css`
    background: rgba(20, 20, 25, 0.8);
    border: 1px solid rgba(42, 42, 51, 0.6);
  `}
  ${({ $variant }) => $variant === 'guardian' && css`
    background: rgba(0, 32, 96, 0.3);
    border: 1px solid rgba(198, 168, 75, 0.25);
  `}
  ${({ $variant }) => $variant === 'crystalline' && css`
    background: rgba(10, 10, 15, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.3);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.08);
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`;

const CardIcon = styled.div<{ $variant: Variant }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  color: ${({ $variant }) =>
    $variant === 'crystalline' ? '#60C0F0'
    : $variant === 'guardian' ? '#C6A84B'
    : 'rgba(224, 236, 244, 0.5)'};
  background: ${({ $variant }) =>
    $variant === 'crystalline' ? 'rgba(96, 192, 240, 0.1)'
    : $variant === 'guardian' ? 'rgba(198, 168, 75, 0.1)'
    : 'rgba(224, 236, 244, 0.05)'};
`;

const CardName = styled.h3`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-weight: 600;
  font-size: 1.25rem;
  color: #E0ECF4;
  margin: 0 0 0.25rem;
`;

const CardPrice = styled.div<{ $variant: Variant }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: ${({ $variant }) =>
    $variant === 'crystalline' ? '#8B5CF6'
    : $variant === 'guardian' ? '#C6A84B'
    : '#60C0F0'};
`;

const CardBenefit = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.825rem;
  line-height: 1.5;
  color: rgba(224, 236, 244, 0.6);
  margin: 0 0 1.25rem;
  flex: 1;
`;

const LearnMoreBtn = styled.button<{ $variant: Variant }>`
  width: 100%;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  ${({ $variant }) => $variant === 'starter' && css`
    background: rgba(42, 42, 51, 0.8);
    color: #E0ECF4;
    &:hover { background: rgba(60, 60, 70, 0.8); }
  `}
  ${({ $variant }) => $variant === 'guardian' && css`
    background: #002060;
    color: #E0ECF4;
    &:hover { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
  `}
  ${({ $variant }) => $variant === 'crystalline' && css`
    background: #8B5CF6;
    color: #0A0A0F;
    &:hover { box-shadow: 0 0 20px rgba(96, 192, 240, 0.4); }
  `}
`;
