import styled from 'styled-components';

export const TodayShell = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 1rem;
  min-width: 0;
`;
export const TodayHero = styled.div`
  flex: 999 1 620px;
  min-width: min(100%, 520px);
  display: grid;
  grid-template-columns: minmax(145px, 0.34fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 260px;
  padding: clamp(1rem, 2vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background:
    radial-gradient(circle at 18% 14%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), transparent 32%),
    linear-gradient(145deg, color-mix(in srgb, var(--surface-primary, #003080) 70%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 90%, transparent));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent),
    0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 66%, transparent);
  @media (max-width: 580px) { grid-template-columns: 1fr; min-height: 0; }
`;
export const CalorieRing = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  min-height: 150px;
  svg { width: min(150px, 42vw); max-width: 100%; }
`;

export const RingText = styled.div`
  position: absolute;
  display: grid;
  gap: 0.15rem;
  place-items: center;
  text-align: center;
`;

export const RingValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 2rem;
  font-weight: 900;
`;

export const RingLabel = styled.span`
  color: var(--text-secondary, #94a3b8);
  font: 800 0.72rem/1.1 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
`;

export const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
`;

export const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 900 0.72rem/1 var(--font-ui, 'Sora', sans-serif);
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const HeroTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.55rem;
  line-height: 1.12;
`;

export const HeroText = styled.p`
  margin: 0;
  max-width: 620px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.92rem;
  line-height: 1.55;
`;

export const MilestoneNote = styled.div<{ $tone?: 'cyan' | 'purple' | 'gold' | 'fern' }>`
  display: grid;
  gap: 0.28rem;
  max-width: 620px;
  padding: 0.75rem 0.85rem;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 44%, transparent);
  color: ${({ $tone }) => {
    if ($tone === 'purple') return 'var(--accent-secondary, #8B5CF6)';
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'fern') return 'var(--accent-success, #86EFAC)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;

export const MilestoneLabel = styled.span`
  color: currentColor;
  font: 900 0.68rem/1 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
`;

export const MilestoneTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 900 0.9rem/1.15 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const MilestoneCopy = styled.span`
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8rem;
  line-height: 1.4;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.55rem 0.85rem;
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)')};
  border-radius: 8px;
  background: ${({ $primary }) => ($primary
    ? 'var(--button-primary-bg, #002060)'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent)')};
  color: ${({ $primary }) => ($primary ? 'var(--button-primary-text, #E0ECF4)' : 'var(--text-primary, #E0ECF4)')};
  font: 900 0.8rem/1.15 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  white-space: normal;
  text-align: center;
  overflow-wrap: break-word;
  transition: transform 160ms ease, box-shadow 160ms ease;
  &:hover { transform: translateY(-1px); box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent); }
  &:disabled { cursor: not-allowed; opacity: 0.58; transform: none; box-shadow: none; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: box-shadow 160ms ease; &:hover { transform: none; } }
`;
export const InlineStatus = styled.p<{ $error?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: ${({ $error }) => ($error ? 'var(--accent-error, #C92A54)' : 'var(--accent-primary, #60C0F0)')};
  font-size: 0.82rem;
  font-weight: 800;
`;

export const InsightList = styled.div`
  display: grid;
  gap: 0.65rem;
`;

export const InsightItem = styled.div<{ $tone?: 'cyan' | 'purple' | 'gold' | 'fern' }>`
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent);
  color: ${({ $tone }) => {
    if ($tone === 'purple') return 'var(--accent-secondary, #8B5CF6)';
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'fern') return 'var(--accent-success, #86EFAC)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;
export const InsightTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.85rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 145px), 1fr));
  gap: 0.75rem;
`;
export const MetricPanel = styled.div<{ $tone?: 'cyan' | 'purple' | 'gold' | 'fern' }>`
  min-height: 92px;
  padding: 0.85rem;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 52%, transparent);
  color: ${({ $tone }) => {
    if ($tone === 'purple') return 'var(--accent-secondary, #8B5CF6)';
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'fern') return 'var(--accent-success, #86EFAC)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;

export const MetricValue = styled.strong`
  display: block;
  overflow-wrap: anywhere;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
`;
export const MetricLabel = styled.span`
  display: block;
  overflow-wrap: break-word;
  margin-top: 0.3rem;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.76rem;
  font-weight: 800;
`;
export const SideRail = styled.aside`
  flex: 1 1 320px;
  min-width: min(100%, 300px);
  display: grid;
  align-content: start;
  gap: 0.75rem;
`;
export const RailPanel = styled.div`
  min-width: 0;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 74%, transparent);
`;
export const RailTitle = styled.h3`
  margin: 0 0 0.55rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
`;

export const RailText = styled.p`
  margin: 0;
  overflow-wrap: break-word;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.82rem;
  line-height: 1.5;
`;
export const HydrationMeter = styled.div`
  display: grid;
  gap: 0.45rem;
`;

export const MeterTrack = styled.div`
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
`;

export const MeterFill = styled.div<{ $percent: number; $loading?: boolean }>`
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  height: 100%;
  border-radius: inherit;
  opacity: ${({ $loading }) => ($loading ? 0.68 : 1)};
  background: ${({ $loading }) => ($loading
    ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent), color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent))'
    : 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))')};
`;
