/**
 * SwatchSpecimen.tsx
 * ==================
 * Kimi's highest-impact idea: each colorway swatch is a tiny LIVE mini-UI painted from
 * THAT theme's real tokens — not a flat color dot. The user previews their app wearing
 * each skin, at thumbnail scale, for all 38 at once. This also reinforces "the styles
 * feel different" because the picker itself demonstrates token-level difference.
 *
 * A11y (Kimi R2 §6): the specimen is PURELY PRESENTATIONAL — div/span only, aria-hidden,
 * pointer-events:none on the whole subtree. The parent <button> owns the semantics +
 * aria-label. No nested interactive elements. Per-swatch CSS vars are set via one inline
 * style prop (NOT a nested ThemeProvider — Kimi R3 §c.3, so 38 swatches don't mount 38
 * context subtrees). React.memo keeps re-renders cheap.
 */
import React from 'react';
import styled from 'styled-components';
import { themes, type ThemeId } from '../UniversalThemeContext';
import { StyledBox } from '@/components/ui/StyledBox';

type Theme = (typeof themes)[ThemeId];

const Frame = styled.span`
  width: 100%;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--sw-text) 18%, transparent);
  background: var(--sw-bg);
  display: grid;
  grid-template-columns: 14px 1fr;
`;

const Rail = styled.span`
  display: block;
  height: 100%;
  background: color-mix(in srgb, var(--sw-surface) 80%, var(--sw-bg));
  border-right: 1px solid color-mix(in srgb, var(--sw-primary) 40%, transparent);
`;

const Body = styled.span`
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 3px;
  padding: 5px 6px;
  min-width: 0;
`;

const Line = styled.span`
  display: block;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sw-text) 55%, transparent);
  &:first-child { width: 70%; background: var(--sw-primary); height: 5px; }
`;

const Chip = styled.span`
  display: inline-block;
  height: 9px;
  width: 46%;
  border-radius: 4px;
  background: var(--sw-primary);
  box-shadow: 0 0 8px color-mix(in srgb, var(--sw-accent) 55%, transparent);
`;

interface SwatchSpecimenProps {
  theme: Theme;
}

const SwatchSpecimen: React.FC<SwatchSpecimenProps> = ({ theme }) => (
  <StyledBox
    as={Frame}
    aria-hidden='true'
    $style={{
      // Per-swatch CSS vars via the sanctioned StyledBox $style bridge (NOT inline
      // style attribute — house rule) and NOT a nested ThemeProvider (Kimi R3 §c.3).
      '--sw-bg': theme.background.primary,
      '--sw-surface': theme.background.surface,
      '--sw-primary': theme.colors.primary,
      '--sw-accent': theme.colors.accent,
      '--sw-text': theme.text.primary,
    } as React.CSSProperties}
  >
    <Rail />
    <Body>
      <span>
        <Line />
        <Line />
      </span>
      <Chip />
    </Body>
  </StyledBox>
);

export default React.memo(SwatchSpecimen);
