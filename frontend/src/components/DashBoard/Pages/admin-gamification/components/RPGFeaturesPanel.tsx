import React, { lazy, Suspense, useState } from 'react';

import { useAuth } from '../../../../../context/AuthContext';
import { RPG_FEATURES } from './RPGFeaturesPanel.data';
import {
  Container,
  FeatureCard,
  FeatureDescription,
  FeatureGrid,
  FeatureHeader,
  FeatureMeta,
  FeatureName,
  MetaLabel,
  PreviewButton,
  PreviewLoading,
  PreviewSection,
  PreviewTitle,
  SectionDescription,
  SectionTitle,
  StatusBadge,
} from './RPGFeaturesPanel.styles';

const AegisHud = lazy(() =>
  import('../../../../AdvancedGamification/components/AegisHud').then((module) => ({ default: module.AegisHud })),
);
const StreakFortress = lazy(() =>
  import('../../../../AdvancedGamification/components/StreakFortress').then((module) => ({ default: module.StreakFortress })),
);
const JobClassSelector = lazy(() =>
  import('../../../../AdvancedGamification/components/JobClassSelector').then((module) => ({ default: module.JobClassSelector })),
);
const CompanionPet = lazy(() =>
  import('../../../../AdvancedGamification/components/CompanionPet').then((module) => ({ default: module.CompanionPet })),
);
const GhostModeBanner = lazy(() =>
  import('../../../../AdvancedGamification/components/GhostMode').then((module) => ({ default: module.GhostModeBanner })),
);

const RPGFeaturesPanel: React.FC = () => {
  const { user } = useAuth();
  const [previewFeature, setPreviewFeature] = useState<string | null>(null);
  const userId = user?.id ? Number(user.id) : undefined;

  return (
    <Container>
      <SectionTitle>RPG Life Simulator - Feature Dashboard</SectionTitle>
      <SectionDescription>
        V2 gamification features are reviewed here as health-linked retention mechanics:
        cue, action, real completion, variable reward, and investment.
      </SectionDescription>

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
                onClick={() => setPreviewFeature(previewFeature === feature.id ? null : feature.id)}
                aria-expanded={previewFeature === feature.id}
              >
                {previewFeature === feature.id ? 'Hide Preview' : 'Preview'}
              </PreviewButton>
            )}
          </FeatureCard>
        ))}
      </FeatureGrid>

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
