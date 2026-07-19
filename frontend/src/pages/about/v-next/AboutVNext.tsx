/**
 * About V-next — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve +
 * `[data-style-lens-shell]` exists for the gate's contract check) + the `.about-vnext-shell` token scope.
 * The transformative move is AboutHero (the caustic swan-occluder signature moment); the below-hero
 * sections are REUSED verbatim from the shipped About (copy + credentials FROZEN, Kimi's "rest at essential
 * tier") and re-skin under `--about-*`. Same SeoHead. Token-driven <main> landmark (Home hostile lesson).
 */
import styled from 'styled-components';
import SeoHead from '../../../components/seo/SeoHead';
import { useAnimationTier, useTierFlags } from '../../../hooks/useAnimationTier';
import { SectionTransition } from '../../../components/ui/animations';
import { YEARS_EXPERIENCE_CLAIM } from '../../../content/marketingStats';
import { AboutLensFrame } from './aboutManifest';
import { AboutVNextTokens } from './about.tokens';
import { AboutHero } from './hero/AboutHero';
import FounderQuoteSection from '../components/sections/FounderQuoteSection';
import AboutSeanSection from '../components/sections/AboutSeanSection';
import PromiseSection from '../components/sections/PromiseSection';
import StatsSection from '../components/sections/StatsSection';
import TimelineSection from '../components/sections/TimelineSection';
import PhilosophySection from '../components/sections/PhilosophySection';
import CompetitiveEdgeSection from '../components/sections/CompetitiveEdgeSection';
import CTASection from '../components/sections/CTASection';

const MainWrapper = styled.main`
  position: relative;
  background: var(--about-bg);
`;

export default function AboutVNext() {
  const tier = useAnimationTier();
  const { isFull, showGlow } = useTierFlags(tier);

  return (
    <AboutLensFrame>
      <AboutVNextTokens />
      <div className="about-vnext-shell" data-testid="about-vnext-root">
        <SeoHead
          title={`About SwanStudios | ${YEARS_EXPERIENCE_CLAIM} Years of Elite Personal Training + Swan Coach Technology`}
          description={`Meet Sean Swan — NCEP-certified, NASM-protocol trainer with ${YEARS_EXPERIENCE_CLAIM} years experience. SwanStudios combines elite personal training with Swan Coach technology for truly personalized fitness.`}
          path="/about"
          type="profile"
        />
        <MainWrapper>
          <AboutHero />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <FounderQuoteSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <AboutSeanSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <PromiseSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <StatsSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <TimelineSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <PhilosophySection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <CompetitiveEdgeSection tier={tier} />
          <SectionTransition animate={isFull} showGlow={showGlow} />
          <CTASection tier={tier} />
        </MainWrapper>
      </div>
    </AboutLensFrame>
  );
}
