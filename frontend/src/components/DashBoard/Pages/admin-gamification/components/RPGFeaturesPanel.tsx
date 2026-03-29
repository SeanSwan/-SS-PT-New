/**
 * ============================================================================
 * FILE: RPGFeaturesPanel.tsx
 * PURPOSE: Admin panel showcasing all V2 RPG gamification features
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides admin-facing overview and controls for all
 * RPG Life Simulator features: Aegis HUD, Vault Decryption, Ghost Mode,
 * Fortress Streaks, Job Classes, Companion Pets, and Crystalline Avatars.
 *
 * HOW IT FITS IN THE APP:
 * admin-gamification-view -> RPGFeaturesPanel (tab 4)
 */

import React, { useState, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded V2 RPG Components
// ─────────────────────────────────────────────────────────────

const AegisHud = lazy(() =>
  import('../../../../AdvancedGamification/components/AegisHud').then(m => ({ default: m.AegisHud }))
);
const StreakFortress = lazy(() =>
  import('../../../../AdvancedGamification/components/StreakFortress').then(m => ({ default: m.StreakFortress }))
);
const JobClassSelector = lazy(() =>
  import('../../../../AdvancedGamification/components/JobClassSelector').then(m => ({ default: m.JobClassSelector }))
);
const CompanionPet = lazy(() =>
  import('../../../../AdvancedGamification/components/CompanionPet').then(m => ({ default: m.CompanionPet }))
);
const CrystallineAvatar = lazy(() =>
  import('../../../../AdvancedGamification/components/CrystallineAvatar').then(m => ({ default: m.CrystallineAvatar }))
);
const GhostModeBanner = lazy(() =>
  import('../../../../AdvancedGamification/components/GhostMode').then(m => ({ default: m.GhostModeBanner }))
);

// ─────────────────────────────────────────────────────────────
// SECTION: Feature Cards Data
// ─────────────────────────────────────────────────────────────

const RPG_FEATURES = [
  {
    id: 'aegis-hud',
    name: 'Aegis HUD',
    description: 'Sims-style needs bars (Athletic, Recovery, Social, Discipline, Vitality) with moodlet system and daily decay.',
    inspiration: 'The Sims 3',
    status: 'active' as const,
    psychology: 'Nurturing Effect — daily retention through digital caretaking',
  },
  {
    id: 'vault-decryption',
    name: 'Vault Decryption',
    description: 'Post-workout loot drops with rarity tiers (Common → Pearlescent). Cryptographic decryption animation.',
    inspiration: 'Borderlands 4',
    status: 'active' as const,
    psychology: 'Variable Ratio Reinforcement — dopamine spikes from randomized rewards',
  },
  {
    id: 'ghost-mode',
    name: 'Ghost Mode',
    description: 'Race against your previous best workout. Per-exercise and total volume comparison with bonus XP.',
    inspiration: 'Gran Turismo / Forza',
    status: 'active' as const,
    psychology: 'Self-Competition — intrinsic motivation through personal records',
  },
  {
    id: 'streak-fortress',
    name: 'Streak Fortress',
    description: 'Visual fortress that grows with streak count. 6 tiers from Ruins to Crystalline Citadel.',
    inspiration: 'Minecraft / Tower Defense',
    status: 'active' as const,
    psychology: 'Loss Aversion — nobody wants to see their castle crumble',
  },
  {
    id: 'job-classes',
    name: 'Job Classes',
    description: 'FFXIV-style fitness classes: Paladin, Monk, Ranger, White Mage, Dark Knight. Each with +15% XP bonus.',
    inspiration: 'Final Fantasy XIV',
    status: 'active' as const,
    psychology: 'Meaningful Progression — identity investment through class selection',
  },
  {
    id: 'companion-pet',
    name: 'Companion Pet',
    description: '5 species with 6 evolution stages. Activity-based appearance mods (armor, speed, glow, accessories).',
    inspiration: 'Tamagotchi × The Sims',
    status: 'active' as const,
    psychology: 'Dollhouse/Nurturing Effect — emotional attachment to digital companion',
  },
  {
    id: 'factions',
    name: 'Faction Warfare',
    description: 'The Vanguard (strength), The Syndicate (agility), Apex (power). Global leaderboard competition.',
    inspiration: 'Overwatch Seasons',
    status: 'planned' as const,
    psychology: 'Social Obligation — tribal competition drives attendance',
  },
  {
    id: 'my-space',
    name: 'MY SPACE Rooms',
    description: 'Virtual rooms users customize with SwanCoins. Friends can visit. Room reflects achievement level.',
    inspiration: 'The Sims Build/Buy',
    status: 'planned' as const,
    psychology: 'Investment Loop — sunk cost through customization',
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const RPGFeaturesPanel: React.FC = () => {
  const { user } = useAuth();
  const [previewFeature, setPreviewFeature] = useState<string | null>(null);
  const userId = user?.id ? Number(user.id) : undefined;

  return (
    <Container>
      <SectionTitle>RPG Life Simulator — Feature Dashboard</SectionTitle>
      <SectionDescription>
        All V2 gamification features built on the Octalysis Framework compulsion loop:
        Cue → Action → Variable Reward → Investment.
      </SectionDescription>

      {/* Feature Cards Grid */}
      <FeatureGrid>
        {RPG_FEATURES.map((feature) => (
          <FeatureCard key={feature.id} $status={feature.status}>
            <FeatureHeader>
              <FeatureName>{feature.name}</FeatureName>
              <StatusBadge $status={feature.status}>
                {feature.status === 'active' ? 'Live' : 'Planned'}
              </StatusBadge>
            </FeatureHeader>
            <FeatureDescription>{feature.description}</FeatureDescription>
            <FeatureMeta>
              <MetaLabel>Inspiration:</MetaLabel> {feature.inspiration}
            </FeatureMeta>
            <FeatureMeta>
              <MetaLabel>Psychology:</MetaLabel> {feature.psychology}
            </FeatureMeta>
            {feature.status === 'active' && (
              <PreviewButton
                onClick={() => setPreviewFeature(
                  previewFeature === feature.id ? null : feature.id
                )}
                aria-expanded={previewFeature === feature.id}
              >
                {previewFeature === feature.id ? 'Hide Preview' : 'Preview'}
              </PreviewButton>
            )}
          </FeatureCard>
        ))}
      </FeatureGrid>

      {/* Live Previews — explicit check prevents falsy-zero bug when userId === 0 */}
      {previewFeature && userId !== undefined && userId !== null && (
        <PreviewSection>
          <PreviewTitle>Live Preview</PreviewTitle>
          <Suspense fallback={<PreviewLoading>Loading preview...</PreviewLoading>}>
            {previewFeature === 'aegis-hud' && (
              <AegisHud userId={userId} showMoodlet />
            )}
            {previewFeature === 'ghost-mode' && (
              <GhostModeBanner userId={userId} />
            )}
            {previewFeature === 'streak-fortress' && (
              <StreakFortress streakDays={14} streakFreezes={2} maxFreezes={3} />
            )}
            {previewFeature === 'job-classes' && (
              <JobClassSelector userId={userId} currentJobClass={null} />
            )}
            {previewFeature === 'companion-pet' && (
              <CompanionPet userId={userId} size={180} showControls />
            )}
            {previewFeature === 'vault-decryption' && (
              <PreviewLoading>
                Vault Decryption triggers automatically after workout completion.
                Complete a workout to see the loot drop animation.
              </PreviewLoading>
            )}
          </Suspense>
        </PreviewSection>
      )}
    </Container>
  );
};

export default RPGFeaturesPanel;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const SectionDescription = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0;
  max-width: 700px;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div<{ $status: 'active' | 'planned' }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $status }) =>
    $status === 'active'
      ? 'rgba(96, 192, 240, 0.2)'
      : 'rgba(224, 236, 244, 0.08)'};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: ${({ $status }) => ($status === 'planned' ? 0.65 : 1)};
  transition: border-color 0.3s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: ${({ $status }) =>
      $status === 'active'
        ? 'rgba(96, 192, 240, 0.4)'
        : 'rgba(224, 236, 244, 0.15)'};
    transform: translateY(-2px);
  }
`;

const FeatureHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const FeatureName = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusBadge = styled.span<{ $status: 'active' | 'planned' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: ${({ $status }) =>
    $status === 'active'
      ? 'rgba(96, 192, 240, 0.15)'
      : 'rgba(198, 168, 75, 0.15)'};
  color: ${({ $status }) =>
    $status === 'active'
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--accent-gold, #C6A84B)'};
  border: 1px solid ${({ $status }) =>
    $status === 'active'
      ? 'rgba(96, 192, 240, 0.3)'
      : 'rgba(198, 168, 75, 0.3)'};
`;

const FeatureDescription = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.5;
`;

const FeatureMeta = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const MetaLabel = styled.span`
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
`;

const PreviewButton = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: linear-gradient(135deg, #003080 0%, #002060 100%);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  margin-top: 4px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: #003080;
    border-color: #8B5CF6;
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.5);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
  }
`;

const PreviewSection = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 24px;
`;

const PreviewTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 16px 0;
`;

const PreviewLoading = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  padding: 24px;
  text-align: center;
`;
