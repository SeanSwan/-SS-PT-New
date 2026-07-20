/**
 * Home V-next — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve +
 * `[data-style-lens-shell]` exists for the gate's contract check) + the `.home-vnext-shell` token scope.
 * The transformative move (Kimi (d)) is the HeroOptics signature moment + the demoted CapsuleRail; the
 * below-hero sections are REUSED verbatim from the shipped Home (copy + intent frozen, Kimi's "all other
 * sections rest at essential tier") and simply re-skin under the `--home-*` tokens. Money/data untouched —
 * the only live call is NewsletterSection's existing POST. Same SeoHead + OrientationForm as V4.
 */
import { useState } from 'react';
import styled from 'styled-components';
import SeoHead from '../../../components/seo/SeoHead';
import { useAnimationTier, useTierFlags } from '../../../hooks/useAnimationTier';
import { SectionTransition } from '../../../components/ui/animations';
import OrientationForm from '../../../components/OrientationForm/orientationForm';
import { YEARS_EXPERIENCE_CLAIM } from '../../../content/marketingStats';
import { HomeLensFrame } from './homeManifest';
import { HomeVNextTokens } from './home.tokens';
import { HeroOptics } from './hero/HeroOptics';
import { CapsuleRail } from './CapsuleRail';
// GATE RULE: PrismCapture must be mounted in BOTH branches of HomeGate (here and HomePage.V4) — otherwise the
// lead-capture silently disappears the moment HOME_VNEXT_ENABLED flips. Enforced by prismGateParity.test.ts.
import { PrismCapture } from '../../../components/marketing/PrismCapture';
import MissionSection from '../components/sections/MissionSection';
import TrainersSection from '../components/sections/TrainersSection';
import ArsenalSection from '../components/sections/ArsenalSection';
import ProgramsSection from '../components/sections/ProgramsSection';
import GolfSection from '../components/sections/GolfSection';
import AboutSection from '../components/sections/AboutSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import StatsSection from '../components/sections/StatsSection';
import SocialSection from '../components/sections/SocialSection';
import NewsletterSection from '../components/sections/NewsletterSection';
import CTASection from '../components/sections/CTASection';

// Restores V4's <main> landmark + page background, but token-driven (--home-bg → --world-bg), not the
// legacy --bg-base — so no transparent gaps between the reused sections and it re-skins with the world.
const MainWrapper = styled.main`
  position: relative;
  background: var(--home-bg);
`;

export default function HomeVNext() {
  const tier = useAnimationTier();
  const { isFull, showGlow } = useTierFlags(tier);
  const [showOrientation, setShowOrientation] = useState(false);

  return (
    <HomeLensFrame>
      <HomeVNextTokens />
      <div className="home-vnext-shell" data-testid="home-vnext-root">
        <SeoHead
          title="SwanStudios | Elite Performance Training — Where Human Excellence Meets AI Precision"
          description={`Transform your fitness with SwanStudios' elite personal training. NASM-protocol coaching with ${YEARS_EXPERIENCE_CLAIM} years experience, Swan Coach programming, serving Orange County and LA.`}
          path="/"
        />

        <MainWrapper>
        <HeroOptics onOpenOrientation={() => setShowOrientation(true)} />
        <CapsuleRail />
        {/* PRISM speed-to-lead capture — self-gates to null when its own flag is off (zero impact).
            Mounted here AND in HomePage.V4 per the Gate Rule (see prismGateParity.test.ts). */}
        <PrismCapture />
        <SectionTransition animate={isFull} showGlow={showGlow} />

        <MissionSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <TrainersSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <ArsenalSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <ProgramsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <GolfSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <AboutSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <TestimonialsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <StatsSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <SocialSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <NewsletterSection tier={tier} />
        <SectionTransition animate={isFull} showGlow={showGlow} />
        <CTASection tier={tier} />
        </MainWrapper>

        {showOrientation && <OrientationForm onClose={() => setShowOrientation(false)} />}
      </div>
    </HomeLensFrame>
  );
}
