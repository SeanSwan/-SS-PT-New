import styled from 'styled-components';

/*
 * Slim identity bar (Kimi K3, 2026-07-23 de-dup). Not a 430px champion hero -
 * the old stats grid, action rail, lens rail, and artwork panel duplicated the
 * KPI strip, NextActionCard, and Quick Actions below, and their fixed heights
 * were a prime cause of the 4K dead gap. This surface now carries ONLY the
 * unique identity strip: who you are, your level, and today's day-progress.
 */
export const HeroCard = styled.section`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 70%, transparent), transparent 60%),
    linear-gradient(145deg, var(--bg-elevated, #141419) 0%, var(--bg-base, #0A0A0F) 82%);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--bg-base, #0A0A0F) 66%, transparent), inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
`;

export const IdentityBar = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, auto);
  align-items: center;
  gap: 1.5rem;
  padding: 1.1rem 1.5rem;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
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
     unitless (1.4) so it scales with font/zoom instead of a brittle px calc. */
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

export const IdentityMeta = styled.div`
  min-width: 0;
  display: grid;
  gap: 0.5rem;
  justify-items: end;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  font: 750 0.8rem/1.3 'Sora', sans-serif;
  @media (max-width: 720px) { justify-items: start; }
`;

export const IdentityProgressTrack = styled.div`
  width: min(240px, 100%);
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-graphite, #1A1A24) 88%, var(--accent-primary, #60C0F0));
`;

export const IdentityProgressFill = styled.span<{ $value: number }>`
  display: block;
  width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
`;
