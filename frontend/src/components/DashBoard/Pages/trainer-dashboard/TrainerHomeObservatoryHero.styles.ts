import styled from 'styled-components';

export const HeroCommandPanel = styled.article`
  min-width: 0;
  display: grid;
  align-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-primary, #60C0F0)) 0%, var(--bg-elevated, #141419) 58%),
    var(--bg-elevated, #141419);
  box-shadow: 0 18px 44px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 72%, transparent);
  overflow: hidden;
`;

export const HeroCopy = styled.div`
  display: grid;
  gap: 0.55rem;
`;

export const HeroKicker = styled.p`
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
`;

export const HeroTitle = styled.h1`
  margin: 0;
  max-width: 42rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 2.15rem;
  line-height: 1.04;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);

  @media (max-width: 720px) { font-size: 1.8rem; }
  @media (max-width: 430px) { font-size: 1.55rem; }
`;

export const HeroMeta = styled.p`
  margin: 0;
  max-width: 44rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;

export const HeroStatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

export const HeroMetric = styled.div`
  min-width: 0;
  padding: 0.85rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 54%, transparent);
`;

export const HeroMetricValue = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'Fira Code', monospace;
  font-size: 1.18rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
`;

export const HeroMetricLabel = styled.div`
  margin-top: 0.35rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;

export const HeroActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
`;

export const HeroActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.68rem 1rem;
  border-radius: 11px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent)'
    : 'color-mix(in srgb, var(--swan-lavender, #4070C0) 28%, transparent)'};
  background: ${({ $primary }) => $primary
    ? 'linear-gradient(135deg, var(--primary-blue, #002060), var(--accent-secondary, #8B5CF6))'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 76%, var(--swan-lavender, #4070C0))'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 56%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const LensRail = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;

  @media (max-width: 720px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 380px) { grid-template-columns: 1fr; }
`;

export const LensButton = styled.button`
  min-width: 0;
  min-height: 44px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.55rem;
  align-items: center;
  padding: 0.68rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 62%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, var(--bg-base, #030712));
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const LensIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

export const LensLabel = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
`;

export const LensDetail = styled.span`
  display: block;
  margin-top: 0.14rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  line-height: 1.35;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;