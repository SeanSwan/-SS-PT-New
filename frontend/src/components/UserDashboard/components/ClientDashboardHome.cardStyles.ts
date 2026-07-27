/**
 * FILE: ClientDashboardHome.cardStyles.ts
 * PURPOSE: Card, form, feed, and dashboard widget styles.
 */
import styled from 'styled-components';

/* Sapphire glass — design.md §9 elevation recipe #1. Replaces the flat 8px
   card + gray-black shadow: 20px radius, sapphire depth gradient, cyan-alpha
   facet border, tinted cyan glow + inset top-light highlight, backdrop blur.
   Re-skins every card on the surface at once. */
export const PanelCard = styled.section`
  position: relative;
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--client-teal) 22%, transparent);
  border-radius: 20px;
  background:
    linear-gradient(160deg,
      color-mix(in srgb, var(--client-panel-strong) 62%, transparent),
      color-mix(in srgb, var(--client-panel) 88%, var(--client-black)));
  box-shadow:
    0 8px 32px color-mix(in srgb, var(--client-teal) 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--client-text) 6%, transparent);
  backdrop-filter: blur(14px);
  overflow: hidden;
`;

export const CardBody = styled.div`
  padding: 16px;
`;

export const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 0;
`;

export const Kicker = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--client-mint);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const CardTitle = styled.h3`
  margin: 6px 0 0;
  color: var(--client-text);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 1.06rem;
  line-height: 1.18;
`;

export const MutedText = styled.p`
  margin: 0;
  color: var(--client-muted);
  font-size: 0.82rem;
  line-height: 1.5;
`;

export const TinyText = styled.span`
  color: var(--client-faint);
  font-size: 0.72rem;
  line-height: 1.35;
`;

export const ProgressTrack = styled.div`
  height: 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--client-line) 48%, transparent);
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => `${Math.max(0, Math.min(100, $pct))}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--client-mint), var(--client-blue));
  box-shadow: 0 0 16px color-mix(in srgb, var(--client-mint) 58%, transparent);
`;

/* Weighted, not equal-N (design.md §10: repeat(4,1fr) is the generic-AI tell).
   The primary action (first child, $primary) spans two tracks so hierarchy
   survives the grayscale test; count-agnostic via auto-fit so a variable
   quick-action array never leaves an orphaned rigid column. */
/* Weighted, not equal-N (design.md §10: repeat(4,1fr) is the generic-AI tell).
   The primary action (first child, $primary) spans two tracks so hierarchy
   survives the grayscale test; auto-fit with a real min keeps it responsive
   for a variable-length quick-action array without an orphaned rigid column. */
export const QuickActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  grid-auto-flow: dense;
  gap: 9px;

  > *:first-child {
    grid-column: span 2;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;

    > *:first-child {
      grid-column: span 1;
    }
  }
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : 'var(--client-line)')};
  border-radius: 12px;
  /* §6/§11 Primary: Midnight Sapphire fill (Frost White ≈12.7:1) → Wing Purple
     glow. The prior Ice-Wing→Lavender gradient failed WCAG (~4.1:1) at its dark
     end no matter the text color — a solid sapphire fill is the canon Primary. */
  background: ${({ $primary }) => (
    $primary ? 'var(--midnight-sapphire, #002060)' : 'color-mix(in srgb, var(--client-panel-soft) 72%, transparent)'
  )};
  color: var(--client-text);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 900;
  cursor: pointer;
  /* SNAP response — design.md §8. transform+shadow only, GPU-safe. */
  transition: transform var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1)),
    border-color var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1));
  /* Dual-Button Glow (§6): blue/cyan primary bg → Wing Purple halo. */
  box-shadow: ${({ $primary }) => ($primary
    ? '0 0 18px color-mix(in srgb, var(--client-purple) 45%, transparent)'
    : 'none')};

  &:hover,
  &:focus-visible {
    transform: translateY(-1px);
    border-color: var(--client-line-strong);
    outline: none;
    box-shadow: ${({ $primary }) => ($primary
      ? '0 0 26px color-mix(in srgb, var(--client-purple) 60%, transparent)'
      : '0 0 16px color-mix(in srgb, var(--client-teal) 24%, transparent)')};
  }

  &:focus-visible {
    outline: 2px solid var(--client-purple);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
    transform: none;
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:focus-visible {
      transform: none;
    }
  }
`;

export const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 14px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

export const ThreeColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 600px) {
    order: -1;
  }
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
`;

export const MetricTile = styled.div`
  min-height: 74px;
  padding: 11px;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--client-panel-soft) 72%, transparent);
`;

export const ListStack = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
`;

export const RowItem = styled.div`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--client-line) 58%, transparent);

  &:last-child {
    border-bottom: 0;
  }
`;

export const StatusDot = styled.span<{ $complete?: boolean }>`
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: ${({ $complete }) => ($complete ? 'var(--client-success)' : 'var(--client-teal)')};
  border: 1px solid currentColor;
`;
