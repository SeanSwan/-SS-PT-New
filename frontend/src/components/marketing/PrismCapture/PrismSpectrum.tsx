/**
 * PrismSpectrum — the "spectrum out" decoration: a beam that refracts into a fan of caustic rays behind the
 * capture card. Purely decorative (`aria-hidden`). GPU-safe: animates transform/opacity ONLY (never
 * box-shadow/filter/background-position). Under reduced motion the rays render in their final, settled position
 * with no animation (the decision is made in JS by the parent and passed as `animate`). Idle = a single quiet
 * beam; refracted = the full fan blooms once.
 */
import styled, { css, keyframes } from 'styled-components';

const bloom = keyframes`
  from { opacity: 0; transform: scaleX(0.4) translateX(-6%); }
  to   { opacity: 1; transform: scaleX(1) translateX(0); }
`;

const Stage = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
`;

interface RayProps {
  $i: number;
  $active: boolean;
  $animate: boolean;
}

const Ray = styled.span<RayProps>`
  position: absolute;
  top: 50%;
  left: -8%;
  width: 116%;
  height: 2px;
  transform-origin: left center;
  transform: rotate(${(p) => (p.$i - 2) * 5}deg) scaleX(${(p) => (p.$active ? 1 : 0.4)});
  opacity: ${(p) => (p.$active ? 0.5 - Math.abs(p.$i - 2) * 0.08 : 0.12)};
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--prism-ice) 40%,
    ${(p) => (p.$i % 2 ? 'var(--prism-wing)' : 'var(--prism-gold)')} 70%,
    transparent 100%
  );
  transition: transform var(--prism-settle-ms) var(--prism-ease), opacity var(--prism-settle-ms) var(--prism-ease);

  ${(p) =>
    p.$active && p.$animate
      ? css`
          animation: ${bloom} var(--prism-charge-ms) var(--prism-ease) ${p.$i * 60}ms both;
        `
      : ''}
`;

const Core = styled.span<{ $active: boolean }>`
  position: absolute;
  top: 50%;
  left: 8%;
  width: 10px;
  height: 10px;
  margin-top: -5px;
  border-radius: 50%;
  background: var(--prism-ice);
  opacity: ${(p) => (p.$active ? 0.9 : 0.5)};
  transition: opacity var(--prism-settle-ms) var(--prism-ease);
`;

interface PrismSpectrumProps {
  active: boolean;
  animate: boolean;
}

export function PrismSpectrum({ active, animate }: PrismSpectrumProps) {
  return (
    <Stage aria-hidden="true">
      <Core $active={active} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Ray key={i} $i={i} $active={active} $animate={animate} />
      ))}
    </Stage>
  );
}
