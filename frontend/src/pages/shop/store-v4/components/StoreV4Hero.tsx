/**
 * Store V4 — Hero (KIMI-STORE-CORRECTED D2/D5/D6). Lean: headline + one honest sub + one CTA. NO trust
 * bar (D5: it triple-stated the same proof and pushed the first price ~2 viewports deep on mobile — the
 * case must open early). The CTA smooth-scrolls to the packages AND hands off focus (F7b — a scroll with
 * stranded focus is an AA bug on the primary CTA). Credentials line honors the house rule: "26+ years"
 * and "NASM-protocol" phrasing (never the false NASM certification claim the contract test forbids).
 */
import styled from 'styled-components';

const Hero = styled.header`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(28px, 6vw, 64px) 0 clamp(20px, 4vw, 36px);
  max-width: 760px;
`;
const Kicker = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--store-ice);
`;
const Headline = styled.h1`
  margin: 0;
  font: 800 clamp(30px, 6vw, 54px) / 1.05 var(--store-font-display, inherit);
  color: var(--store-ink);
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.4vw, 18px);
  color: var(--store-ink-2);
  max-width: 58ch;
`;
const CTA = styled.button`
  align-self: flex-start;
  min-height: var(--store-target, 48px);
  margin-top: 6px;
  padding: 0 24px;
  border-radius: 999px;
  border: 1px solid var(--store-chrome-edge);
  background: color-mix(in oklab, var(--store-ice) 18%, transparent);
  color: var(--store-ink);
  font: 700 15px / 1 var(--store-font-display, inherit);
  cursor: pointer;
  transition: filter 160ms var(--store-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
`;

export function StoreV4Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <Hero data-testid="store-hero">
      <Kicker>SwanStudios training blocks</Kicker>
      <Headline>Coaching, made a commitment.</Headline>
      <Sub>
        Private, one-on-one training built on 26+ years of experience and NASM-protocol programming. Choose
        the block that matches how far you want to go — every session is coached, tracked, and yours.
      </Sub>
      <CTA type="button" onClick={onExplore}>
        Explore training blocks
      </CTA>
    </Hero>
  );
}
