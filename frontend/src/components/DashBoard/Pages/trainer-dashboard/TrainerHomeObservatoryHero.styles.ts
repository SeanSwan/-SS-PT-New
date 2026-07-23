import styled from 'styled-components';

const focusRing = `
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 3px; }
`;

export const HeroCard = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 430px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 82%, transparent), transparent 48%),
    linear-gradient(145deg, var(--bg-elevated, #141419) 0%, var(--bg-base, #0A0A0F) 72%);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent), inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 32% 22%, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 32%);
  }
`;

export const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  /* both tracks minmax(0,...) so the 260px artwork floor cannot push the hero
     past the clipped content area on mid-desktop/tablet widths. */
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 0.55fr);
  gap: 1.5rem;
  padding: 1.5rem;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
  @media (max-width: 520px) { padding: 1rem; gap: 1rem; }
`;

export const HeroCopy = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
`;

export const ProfileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  @media (max-width: 520px) { align-items: flex-start; }
`;

export const HeroAvatar = styled.img`
  width: 96px;
  height: 96px;
  flex: 0 0 auto;
  border-radius: 50%;
  object-fit: cover;
  padding: 3px;
  background: conic-gradient(from 180deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0), var(--accent-gold, #C6A84B), var(--accent-secondary, #8B5CF6));
  box-shadow: 0 0 34px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
  @media (max-width: 520px) { width: 76px; height: 76px; }
`;

export const HeroIdentity = styled.div`min-width: 0; display: grid; gap: 0.35rem;`;
export const HeroKicker = styled.p`
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.78rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const HeroTitle = styled.h1`
  margin: 0;
  min-width: 0;
  max-width: 100%;
  color: var(--text-primary, #E0ECF4);
  font: 900 4.1rem/0.94 'Plus Jakarta Sans', sans-serif;
  /* anywhere (not just break-word) so a single very long name can't push the
     hero column past the clipped dashboard content area. */
  overflow-wrap: anywhere;
  @media (max-width: 980px) { font-size: 3.25rem; }
  @media (max-width: 520px) { font-size: 2.2rem; }
  @media (max-width: 360px) { font-size: 1.85rem; }
`;

export const HeroHandle = styled.span`
  width: fit-content;
  max-width: 100%;
  /* inline-block (not inline-flex) so text-overflow:ellipsis actually renders.
     Padding sizes the pill and centers the single line; line-height stays
     unitless (1.4) so it scales with font/zoom instead of a brittle px calc
     (hostile-review P9). */
  display: inline-block;
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  color: var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  font: 800 0.75rem/1.4 'Sora', sans-serif;
  /* A long @handle ellipsises, never pushes the hero column past the viewport. */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const HeroSubline = styled.p`
  margin: 0;
  max-width: 62rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, var(--bg-base, #0A0A0F)));
  font: 650 0.96rem/1.62 'Sora', sans-serif;
`;

export const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  @media (max-width: 660px) { grid-template-columns: 1fr; }
`;

export const HeroStatCard = styled.div`
  min-height: 72px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  padding: 0.85rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--surface-royal-depth, #003080) 34%, var(--bg-base, #0A0A0F));
`;

export const HeroStatValue = styled.strong`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.05rem/1 'Fira Code', monospace;
  svg { color: var(--accent-primary, #60C0F0); }
`;

export const HeroStatLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font: 800 0.72rem/1.25 'Sora', sans-serif;
`;

export const TierRow = styled.div`display: grid; gap: 0.5rem;`;
export const TierMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font: 750 0.78rem/1.3 'Sora', sans-serif;
`;

export const ProgressTrack = styled.div`
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-graphite, #1A1A24) 88%, var(--accent-primary, #60C0F0));
`;

export const ProgressFill = styled.span<{ $value: number }>`
  display: block;
  width: ${({ $value }) => `${$value}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
`;

export const HeroActions = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.6rem;
  @media (max-width: 860px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

export const HeroActionButton = styled.button<{ $primary?: boolean }>`
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid ${({ $primary }) => ($primary ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 44%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)')};
  background: ${({ $primary }) => ($primary ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0))' : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  font: 850 0.78rem/1 'Sora', sans-serif;
  cursor: pointer;
  ${focusRing}
  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 44%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent); }
`;

export const ArtworkPanel = styled.div`
  position: relative;
  min-height: 320px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: var(--bg-base, #0A0A0F);
`;

export const HeroArtwork = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1) contrast(1.05);
`;

export const ArtworkShade = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent), transparent 42%),
    linear-gradient(0deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent), transparent 52%);
`;

export const ArtworkBadge = styled.span`
  width: fit-content;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.42rem 0.72rem;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 74%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  font: 850 0.72rem/1 'Sora', sans-serif;
`;

export const ArtworkTitle = styled.h2`margin: 0 0 0.35rem; color: var(--text-primary, #E0ECF4); font: 900 1.35rem/1.1 'Plus Jakarta Sans', sans-serif;`;
export const ArtworkMeta = styled.p`margin: 0; color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent)); font: 700 0.82rem/1.45 'Sora', sans-serif;`;

export const LensRail = styled.nav`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.55rem;
  padding: 0 1.5rem 1.5rem;
  @media (max-width: 980px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (max-width: 640px) { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; padding: 0 1rem 1rem; }
`;

export const LensButton = styled.button<{ $active?: boolean }>`
  min-width: 0;
  min-height: 74px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  padding: 0.75rem;
  border-radius: 14px;
  border: 1px solid ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)')};
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-base, #0A0A0F))' : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 56%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  ${focusRing}
  @media (max-width: 640px) { flex: 0 0 13rem; scroll-snap-align: start; }
`;

export const LensIcon = styled.span`
  width: 2.35rem;
  height: 2.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
`;
export const LensLabel = styled.span`display: block; color: var(--text-primary, #E0ECF4); font: 850 0.82rem/1.15 'Sora', sans-serif;`;
export const LensDetail = styled.span`
  display: block;
  margin-top: 0.18rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent));
  font: 650 0.68rem/1.35 'Sora', sans-serif;
`;
