import React from 'react';
import styled from 'styled-components';
import { Crown, Heart, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, type TierDefinition } from '../../../hooks/useSubscription';
import MembershipSummary from './MembershipSummary';

type TierVariant = 'starter' | 'guardian' | 'crystalline';

const variantFor = (tier: TierDefinition): TierVariant => (
  tier.id === 'pro' ? 'guardian' : tier.id === 'elite' ? 'crystalline' : 'starter'
);

const iconFor = (variant: TierVariant) => {
  if (variant === 'guardian') return <Heart size={20} aria-hidden="true" />;
  if (variant === 'crystalline') return <Crown size={20} aria-hidden="true" />;
  return <Sparkles size={20} aria-hidden="true" />;
};

const MembershipsSection: React.FC = () => {
  const { tiers, loading, error, fetchTiers } = useSubscription();
  const navigate = useNavigate();

  if (loading && tiers.length === 0) {
    return (
      <Section aria-busy="true">
        <State role="status">Loading membership tiers…</State>
      </Section>
    );
  }

  if (error && tiers.length === 0) {
    return (
      <Section>
        <State role="alert">
          <strong>Membership tiers are unavailable</strong>
          <span>{error}</span>
          <RetryButton type="button" onClick={() => void fetchTiers()}>
            <RefreshCw size={16} aria-hidden="true" /> Retry memberships
          </RetryButton>
        </State>
      </Section>
    );
  }

  if (tiers.length === 0) {
    return (
      <Section>
        <State role="status">Membership tiers are temporarily unavailable. Please check back soon.</State>
      </Section>
    );
  }

  return (
    <Section aria-busy={loading}>
      <SectionHeader>
        <SectionEyebrow>Membership Tiers</SectionEyebrow>
        <SectionTitle>Choose Your Level</SectionTitle>
        <SectionSub>Swan Coach is free for everyone. Upgrade using the current membership options below.</SectionSub>
      </SectionHeader>

      {error && <InlineError role="alert">{error}</InlineError>}
      <CardsRow>
        {tiers.map(tier => {
          const variant = variantFor(tier);
          return (
            <MiniCard key={tier.id} $variant={variant}>
              <CardIcon $variant={variant}>{iconFor(variant)}</CardIcon>
              <MembershipSummary tier={tier} compact />
              <LearnMoreButton type="button" $variant={variant} onClick={() => navigate('/ascension')}>
                {variant === 'starter' ? 'Get Started' : 'Explore membership'}
              </LearnMoreButton>
            </MiniCard>
          );
        })}
      </CardsRow>
    </Section>
  );
};

export default MembershipsSection;

const Section = styled.section`
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
`;

const SectionHeader = styled.div`
  margin-bottom: 2.5rem;
  text-align: center;
`;

const SectionEyebrow = styled.span`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: 0 0 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-style: italic;
`;

const SectionSub = styled.p`
  margin: 0;
  color: var(--text-muted, #7f96a8);
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
`;

const CardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const MiniCard = styled.article<{ $variant: TierVariant }>`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid color-mix(in srgb, ${({ $variant }) => $variant === 'guardian' ? 'var(--gilded-fern, #C6A84B)' : $variant === 'crystalline' ? 'var(--wing-purple, #8B5CF6)' : 'var(--text-primary, #E0ECF4)'} 26%, transparent);
  border-radius: 1rem;
  background: linear-gradient(160deg, color-mix(in srgb, var(--primary, #002060) 32%, transparent), var(--card-bg, #141419));
`;

const CardIcon = styled.div<{ $variant: TierVariant }>`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  color: ${({ $variant }) => $variant === 'guardian' ? 'var(--gilded-fern, #C6A84B)' : $variant === 'crystalline' ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, #7f96a8)'};
  background: color-mix(in srgb, currentColor 12%, transparent);
`;

const LearnMoreButton = styled.button<{ $variant: TierVariant }>`
  width: 100%;
  min-height: 44px;
  margin-top: auto;
  border: 0;
  border-radius: 0.5rem;
  background: ${({ $variant }) => $variant === 'crystalline' ? 'var(--wing-purple, #8B5CF6)' : 'var(--primary, #002060)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-weight: 700;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

const State = styled.div`
  display: flex;
  min-height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-secondary, #a9bfd0);
  font-family: 'Sora', sans-serif;
  text-align: center;
`;

const RetryButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
`;

const InlineError = styled.p`
  margin: 0 0 1rem;
  color: var(--gilded-fern, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  text-align: center;
`;
