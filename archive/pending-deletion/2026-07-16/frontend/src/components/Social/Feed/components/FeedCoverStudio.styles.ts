import styled, { css, keyframes } from 'styled-components';

const surfaceBorder = css`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  box-shadow:
    0 20px 60px color-mix(in srgb, var(--bg-base, #030712) 55%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
`;

const drift = keyframes`
  0% { transform: translate3d(-4%, -3%, 0) rotate(0deg); }
  50% { transform: translate3d(4%, 3%, 0) rotate(2deg); }
  100% { transform: translate3d(-4%, -3%, 0) rotate(0deg); }
`;

export const StudioShell = styled.section`
  position: relative;
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;
  /* Lighter bottom padding: the metric rail is the last row, so the shell
     doesn't need the full clamp below it — this was the dead-zone Sean
     flagged on desktop AND mobile. */
  padding: clamp(18px, 5vw, 34px) clamp(18px, 5vw, 34px) clamp(12px, 3vw, 20px);
  color: var(--text-primary, #E0ECF4);
  border-radius: 8px;
  background:
    radial-gradient(circle at 12% 12%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent),
      transparent 34%),
    radial-gradient(circle at 88% 14%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent),
      transparent 30%),
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #003080) 78%, var(--bg-base, #030712)),
      var(--bg-base, #030712));
  ${surfaceBorder}

  &::before {
    content: '';
    position: absolute;
    inset: -30%;
    background:
      linear-gradient(115deg,
        transparent 22%,
        color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent) 48%,
        transparent 70%),
      radial-gradient(circle,
        color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent),
        transparent 54%);
    opacity: 0.72;
    pointer-events: none;
    animation: ${drift} 18s ease-in-out infinite;
  }

  @container (min-width: 720px) {
    grid-template-columns: minmax(0, 1.06fr) minmax(280px, 0.94fr);
    align-items: stretch;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

export const StudioCopy = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  min-width: 0;
`;

export const Kicker = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 700 0.74rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 0;
  max-width: 11ch;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  line-height: 0.94;
  letter-spacing: 0;

  @container (min-width: 720px) {
    font-size: 3.25rem;
  }
`;

export const Subtitle = styled.p`
  margin: 0;
  max-width: 44rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
  font: 500 1rem/1.65 'Sora', sans-serif;

  @container (min-width: 720px) {
    font-size: 1.08rem;
  }
`;

export const ModeRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
`;

export const ModeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 10px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  font: 700 0.76rem/1 'Sora', sans-serif;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  cursor: pointer;
  font: 800 0.84rem/1 'Sora', sans-serif;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 22px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const StatusPill = styled.span<{ $live: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 10px 13px;
  color: ${({ $live }) => $live ? 'var(--success, #22C55E)' : 'var(--accent-primary, #60C0F0)'};
  border-radius: 8px;
  background: color-mix(in srgb, ${({ $live }) => $live ? 'var(--success, #22C55E)' : 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $live }) => $live ? 'var(--success, #22C55E)' : 'var(--accent-primary, #60C0F0)'} 28%, transparent);
  font: 800 0.78rem/1 'Sora', sans-serif;
`;

export const Stage = styled.div`
  position: relative;
  z-index: 1;
  /* Responsive stage: the fixed 230px block was the awkward dead zone on
     phones and narrow columns — scale with the container instead. */
  min-height: clamp(150px, 32cqw, 230px);
`;

export const CoverFrame = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: clamp(150px, 32cqw, 230px);
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(150deg,
      color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent),
      color-mix(in srgb, var(--primary, #002060) 64%, var(--bg-base, #030712))),
    radial-gradient(circle at 50% 15%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent),
      transparent 38%);
  ${surfaceBorder}
`;

export const StageHeader = styled.div`
  /* M5b: keep the badge above the absolute banner media layers. */
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  padding: 12px;
`;

export const StageBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 7px 10px;
  color: var(--accent-gold, #C6A84B);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent);
  font: 800 0.7rem/1 'Sora', sans-serif;
  text-transform: uppercase;
`;

export const CoverGrid = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 8px;
  flex: 1;
  padding: 0 12px 12px;
`;

export const CoverPanel = styled.div<{ $tone: 'primary' | 'accent' | 'gold' }>`
  min-height: 74px;
  border-radius: 8px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, ${({ $tone }) => (
        $tone === 'gold'
          ? 'var(--accent-gold, #C6A84B)'
          : $tone === 'accent'
            ? 'var(--accent-secondary, #8B5CF6)'
            : 'var(--accent-primary, #60C0F0)'
      )} 30%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 76%, transparent));
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);

  &:first-child {
    grid-row: span 2;
  }
`;

export const MetricRail = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @container (min-width: 540px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @container (min-width: 720px) {
    grid-column: 1 / -1;
  }
`;

export const MetricTile = styled.div`
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const MetricValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font: 800 1.18rem/1 'Fira Code', monospace;
`;

export const MetricLabel = styled.div`
  margin-top: 5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font: 800 0.66rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;
