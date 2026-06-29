import styled from 'styled-components';

const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent))';
const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent))';

export const SectionBand = styled.section`
  grid-column: 1 / -1;
  display: grid;
  gap: 16px;
  min-width: 0;
  max-width: 100%;
  padding: 10px 0 4px;
`;

export const SectionHeader = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.7fr);
  gap: 18px;
  align-items: end;
  padding: 12px 4px 2px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

export const SectionEyebrow = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.15rem, 1.4vw, 1.75rem);
  line-height: 1.16;
`;

export const SectionLead = styled.p`
  margin: 0;
  color: ${TEXT_SECONDARY};
  font-size: clamp(0.95rem, 0.95vw, 1.05rem);
  line-height: 1.6;
`;

export const SectionCopy = styled.div`
  display: grid;
  gap: 6px;
`;

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-width: 0;

  @media (min-width: 1280px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const SignalBar = styled.nav`
  --signal-accent: var(--accent-primary, #60C0F0);
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 2fr);
  gap: 14px;
  align-items: stretch;
  padding: 16px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--surface-primary, #002060) 62%, transparent),
    color-mix(in srgb, var(--bg-card, #141419) 88%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 18px;
  box-shadow: var(--shadow-elevation, 0 18px 54px color-mix(in srgb, var(--bg-base, #030712) 34%, transparent));

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const SignalIntro = styled.div`
  display: grid;
  align-content: center;
  gap: 8px;
  min-width: 0;
`;

export const SignalEyebrow = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
`;

export const SignalTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.1rem, 1.4vw, 1.65rem);
  line-height: 1.12;
`;

export const SignalSummary = styled.span`
  color: ${TEXT_SECONDARY};
  font-size: 0.92rem;
  line-height: 1.45;
`;

export const SignalRail = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const SignalLink = styled.a`
  --signal-accent: var(--accent-primary, #60C0F0);
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 56px;
  padding: 10px 12px;
  color: var(--text-primary, #E0ECF4);
  text-decoration: none;
  background: color-mix(in srgb, var(--signal-accent) 7%, var(--bg-card, #141419));
  border: 1px solid color-mix(in srgb, var(--signal-accent) 26%, transparent);
  border-radius: 14px;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

  &[data-tone='urgent'] { --signal-accent: var(--accent-gold, #C6A84B); }
  &[data-tone='ops'] { --signal-accent: var(--accent-primary, #60C0F0); }
  &[data-tone='community'] { --signal-accent: var(--accent-secondary, #8B5CF6); }
  &[data-tone='system'] { --signal-accent: var(--swan-lavender, #4070C0); }

  svg {
    color: var(--signal-accent);
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--signal-accent) 52%, transparent);
    box-shadow: 0 16px 36px color-mix(in srgb, var(--signal-accent) 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--signal-accent);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const SignalLinkBody = styled.span`
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    overflow-wrap: anywhere;
    font-size: 0.88rem;
    line-height: 1.18;
  }

  small {
    color: ${TEXT_MUTED};
    font-size: 0.76rem;
    line-height: 1.25;
  }
`;

export const SignalCta = styled.em`
  color: var(--signal-accent);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-style: normal;
  font-weight: 700;
`;
