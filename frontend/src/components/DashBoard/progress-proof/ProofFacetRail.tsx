/**
 * COMPONENT: ProofFacetRail
 * PURPOSE: The client's progress-proof journey as a row of crystalline facets that light
 *   as each REAL proof tier is earned (Spark -> Momentum -> Apex -> Legendary). The
 *   "trophy shelf" companion to NextMilestoneGravity's single next target.
 * DATA POLICY: every lit facet is backed by verified populated-chart count (proofFacetRail
 *   core). At zero it renders honestly — all facets dim, "log a workout to spark your first
 *   tier". Never pre-lights.
 * A11Y: an ordered list; each facet announces its label + earned/locked state (+ charts
 *   needed). Gems are decorative (aria-hidden). Shimmer is transform/opacity only and is
 *   suppressed under prefers-reduced-motion (Rule 25). All color via --token,#fallback (Rule 6).
 */

import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Gem } from 'lucide-react';
import { buildProofFacetRail, type ProofFacet } from './proofFacetLadder';

interface Props {
  /** Verified count of populated canonical charts (nonEmptyChartCount). */
  populated: number;
}

const shimmer = keyframes`
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
`;

const tierFill: Record<ProofFacet['tier'], string> = {
  facet: 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))',
  prism: 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-gold, #C6A84B))',
  crown: 'linear-gradient(135deg, var(--accent-gold, #C6A84B), var(--warning, #F59E0B))',
};

const Panel = styled.section`
  margin: 1rem 0;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background:
    radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent), transparent 42%),
    var(--bg-elevated, #141419);
`;

const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.9rem/1.2 'Sora', sans-serif;
  svg { color: var(--accent-gold, #C6A84B); flex: 0 0 auto; }
`;

const Standing = styled.span`
  margin-left: auto;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 700 0.68rem/1 'Sora', sans-serif;
`;

const Rail = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
`;

const Facet = styled.li<{ $earned: boolean; $current: boolean }>`
  flex: 1 1 4.5rem;
  min-width: 4.5rem;
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.4rem;
  border-radius: 12px;
  border: 1px solid ${({ $current }) => ($current
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent)')};
  background: ${({ $current }) => ($current
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent)'
    : 'transparent')};
  opacity: ${({ $earned }) => ($earned ? 1 : 0.5)};
`;

const Gemstone = styled.span<{ $earned: boolean; $tier: ProofFacet['tier'] }>`
  width: 26px;
  height: 26px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  background: ${({ $earned, $tier }) => ($earned
    ? tierFill[$tier]
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent)')};
  box-shadow: ${({ $earned }) => ($earned
    ? '0 0 10px -2px color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent)'
    : 'none')};
  animation: ${({ $earned }) => ($earned ? shimmer : 'none')} 3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const FacetLabel = styled.span<{ $earned: boolean }>`
  color: ${({ $earned }) => ($earned
    ? 'var(--text-primary, #E0ECF4)'
    : 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent))')};
  font: 700 0.68rem/1 'Sora', sans-serif;
`;

const FacetHint = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent));
  font: 650 0.58rem/1 'Sora', sans-serif;
`;

const Caption = styled.p`
  margin: 0.7rem 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent));
  font: 650 0.7rem/1.4 'Sora', sans-serif;
`;

const SrText = styled.span`
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
`;

const chartsWord = (n: number) => (n === 1 ? 'chart' : 'charts');

const ProofFacetRail: React.FC<Props> = ({ populated }) => {
  const rail = useMemo(() => buildProofFacetRail(populated), [populated]);

  const caption = rail.nextLabel === null
    ? 'Full deck earned — Legendary proof.'
    : rail.currentLabel === 'Locked'
      ? 'Log a workout to spark your first tier.'
      : `${rail.chartsToNext} more ${chartsWord(rail.chartsToNext ?? 0)} to ${rail.nextLabel}.`;

  return (
    <Panel data-testid="proof-facet-rail" aria-label="Progress proof tiers">
      <Head>
        <Gem size={16} aria-hidden="true" />
        Proof tiers
        <Standing>{rail.currentLabel === 'Locked' ? 'Not yet earned' : `${rail.currentLabel} tier`}</Standing>
      </Head>
      <Rail>
        {rail.facets.map((f) => (
          <Facet key={f.key} $earned={f.earned} $current={f.isCurrent} aria-current={f.isCurrent || undefined}>
            <Gemstone $earned={f.earned} $tier={f.tier} aria-hidden="true" />
            <FacetLabel $earned={f.earned}>{f.label}</FacetLabel>
            <FacetHint>{f.threshold} {chartsWord(f.threshold)}</FacetHint>
            <SrText>{f.label} tier: {f.earned ? (f.isCurrent ? 'current, earned' : 'earned') : `locked, needs ${f.threshold} ${chartsWord(f.threshold)}`}</SrText>
          </Facet>
        ))}
      </Rail>
      <Caption>{caption}</Caption>
    </Panel>
  );
};

export default React.memo(ProofFacetRail);
