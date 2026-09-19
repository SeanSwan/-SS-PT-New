/**
 * FILE: ProofCard.styles.ts
 * PURPOSE: Chrome-edge proof card styling for the S2 Proof Card
 *          (MEGA-BLUEPRINT.md §4.4 + §5 design language).
 *
 * Design language: house card standard — sapphire gradient, 1px ice-cyan chrome edge,
 * Frost White text, 44px controls. Ice-cyan is the "system/editorial" chrome token;
 * gold stays reserved for earned recognition (Coach Signal) and purple for AI coach.
 *
 * EXPORT SURFACE: third-party share targets (image encoders, messaging clients) strip
 * CSS custom properties, so the export node uses LITERAL colors with >=16px fonts and
 * 16px padding — adopted from the HY3 design seat's catch (MEGA-BLUEPRINT §10).
 */
import styled from 'styled-components';

export const ProofCardShell = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 16px;
  background: linear-gradient(
    160deg,
    var(--bg-surface, #0A0A0F) 0%,
    color-mix(in srgb, var(--midnight-sapphire, #002060) 55%, var(--bg-surface, #0A0A0F)) 100%
  );
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    pointer-events: none;
    box-shadow: inset 0 0 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  }
`;

export const ProofKicker = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const ProofTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
`;

export const ProofMeta = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

export const StatStrip = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 10px;
  margin: 0;
`;

export const StatCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 45%, transparent);
`;

export const StatValue = styled.dd`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const StatLabel = styled.dt`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const ChartFrame = styled.div`
  min-height: 96px;
  padding: 4px 0 0;
`;

export const ChartCaption = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ProofButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 16px;
  border: 1px solid
    ${({ $primary }) =>
      $primary
        ? 'transparent'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent)'};
  border-radius: 12px;
  background: ${({ $primary }) =>
    $primary
      ? 'linear-gradient(135deg, var(--accent-primary, #60C0F0), color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, var(--midnight-sapphire, #002060)))'
      : 'transparent'};
  color: ${({ $primary }) =>
    $primary ? 'var(--bg-base, #030712)' : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  transition: transform 0.16s ease, opacity 0.16s ease;

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const StatusLine = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

export const ErrorLine = styled(StatusLine)`
  color: var(--gold-accent, #C6A84B);
`;

/**
 * Export surface — captured to an image for the native share sheet.
 * LITERAL colors, 16px padding, >=16px type: no CSS variables may survive here
 * because third-party consumers re-render this outside the app's cascade.
 */
export const ExportSurface = styled.div`
  position: absolute;
  left: -10000px;
  top: 0;
  width: 420px;
  padding: 16px;
  background: #030712;
  color: #e0ecf4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  border: 1px solid #60c0f0;
  border-radius: 16px;

  .export-kicker {
    margin: 0 0 4px;
    color: #60c0f0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .export-title {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.3;
  }

  .export-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(96, 192, 240, 0.2);
    font-size: 16px;
  }

  .export-foot {
    margin: 12px 0 0;
    color: #c6a84b;
    font-size: 16px;
    font-weight: 600;
  }
`;
