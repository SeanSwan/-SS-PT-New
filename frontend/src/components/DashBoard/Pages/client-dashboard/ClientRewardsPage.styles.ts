import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { transform: translateX(-40%); opacity: 0.4; }
  100% { transform: translateX(40%); opacity: 0.4; }
`;

export const PageWrap = styled.div`
  --rewards-ice: var(--accent-primary, #60C0F0);
  --rewards-purple: var(--accent-secondary, #8B5CF6);
  --rewards-gold: var(--accent-gold, #C6A84B);
  --rewards-frost: var(--text-primary, #E0ECF4);
  --rewards-ring: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  color: var(--rewards-frost);
  min-height: 100%;
  padding: 1.5rem;

  @media (max-width: 520px) { padding: 1rem; }
`;

export const HeroPanel = styled.section`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--rewards-ring);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--royal-depth, #003080) 72%, transparent), color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent)),
    radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--rewards-purple) 22%, transparent), transparent 34%),
    radial-gradient(circle at 10% 82%, color-mix(in srgb, var(--rewards-ice) 18%, transparent), transparent 36%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--rewards-ice) 18%, transparent) inset,
    0 28px 80px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  padding: 1.75rem;
  margin-bottom: 1rem;

  &::before {
    content: '';
    position: absolute;
    inset: -30% -10%;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rewards-ice) 10%, transparent), transparent);
    animation: ${shimmer} 8s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) { &::before { animation: none; } }
  @media (max-width: 520px) { padding: 1.2rem; }
`;

export const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 1.5rem;
  align-items: stretch;

  @media (max-width: 860px) { grid-template-columns: 1fr; gap: 1.25rem; }
  @media (max-width: 520px) { gap: 1rem; }
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 32px;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--rewards-gold) 32%, transparent);
  color: var(--rewards-gold);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const HeroCopy = styled.div`
  display: grid;
  gap: 0.9rem;
  align-content: center;

  h1 {
    margin: 0;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 3.65rem;
    line-height: 0.95;
    letter-spacing: 0;

    @media (max-width: 860px) { font-size: 2.75rem; }
    @media (max-width: 520px) { font-size: 2.05rem; }
  }

  p {
    max-width: 64ch;
    margin: 0;
    color: var(--text-secondary, #94a3b8);
    line-height: 1.7;
  }
`;

export const RankLine = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.65rem;
`;

export const RankChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 36px;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--rewards-ice) 18%, transparent);
  color: var(--rewards-frost);
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
`;

export const RankConsole = styled.aside`
  display: grid; gap: 0.85rem; align-content: stretch;
`;

export const ConsoleCard = styled.div`
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--rewards-ice) 18%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 84%, transparent), color-mix(in srgb, var(--royal-depth, #003080) 34%, transparent));
  padding: 1rem;
`;

export const ConsoleLabel = styled.span`
  display: block;
  color: var(--text-muted, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0;
  margin-bottom: 0.5rem;
`;

export const ConsoleValue = styled.strong`
  display: block;
  color: var(--rewards-frost);
  font-family: 'Fira Code', monospace;
  font-size: 2.1rem;

  @media (max-width: 520px) { font-size: 1.45rem; }
`;

export const ProgressTrack = styled.div`
  position: relative;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--rewards-ice) 18%, transparent);
`;

export const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: inherit;
  background: linear-gradient(90deg, ${({ $color }) => $color}, var(--rewards-ice));
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const XpLabel = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  color: var(--text-muted, #94a3b8);
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
`;

export const PanelGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(320px, 1.2fr) minmax(220px, 0.75fr);
  gap: 1rem;

  @media (max-width: 1100px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

export const SectionCard = styled.section`
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--rewards-ice) 14%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent), color-mix(in srgb, var(--royal-depth, #003080) 24%, transparent));
  padding: 1rem;
  min-width: 0;

  h2 {
    margin: 0 0 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 1rem;
    letter-spacing: 0;
  }
`;

export const ActivityRow = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.72rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--rewards-ice) 8%, transparent);

  &:last-child { border-bottom: none; }
`;

export const IconSlot = styled.div<{ $rarity?: string }>`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: ${({ $rarity }) => $rarity === 'rare' ? 'var(--rewards-gold)' : $rarity === 'epic' ? 'var(--rewards-purple)' : 'var(--rewards-ice)'};
  background: color-mix(in srgb, currentColor 14%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
`;

export const RowCopy = styled.div`
  min-width: 0;

  strong, span { display: block; overflow-wrap: anywhere; }

  strong { color: var(--rewards-frost); font-size: 0.9rem; }
  span { color: var(--text-muted, #94a3b8); font-size: 0.78rem; line-height: 1.5; }
`;

export const PointsPill = styled.span`
  white-space: nowrap;
  color: var(--rewards-ice);
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
`;

export const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
`;

export const BadgeTile = styled.div`
  min-height: 120px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  gap: 0.35rem;
  text-align: center;
  padding: 0.8rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  border: 1px dashed color-mix(in srgb, var(--rewards-gold) 28%, transparent);
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
`;

export const EmptyState = styled.p`
  margin: 0;
  padding: 1.25rem 0;
  color: var(--text-muted, #94a3b8);
  line-height: 1.6;
`;

export const ErrorBox = styled.div`
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--error-accent, #C92A54) 32%, transparent);
  background: color-mix(in srgb, var(--error-accent, #C92A54) 10%, var(--bg-elevated, #141419));
  color: var(--rewards-frost);
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
`;

export const LoadingShell = styled.div`
  display: grid; gap: 1rem;
`;

export const ShimmerBlock = styled.div<{ $height?: string }>`
  position: relative;
  overflow: hidden;
  min-height: ${({ $height }) => $height || '120px'};
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent);
  border: 1px solid color-mix(in srgb, var(--rewards-ice) 12%, transparent);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rewards-ice) 12%, transparent), transparent);
    animation: ${shimmer} 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) { &::after { animation: none; } }
`;
