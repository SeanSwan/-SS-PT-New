import styled from 'styled-components';

export const WidgetsStack = styled.aside`
  display: grid;
  gap: 0.8rem;
`;

export const WidgetCard = styled.section`
  min-width: 0;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, var(--primary-blue, #002060)) 0%, var(--bg-elevated, #141419) 72%),
    var(--bg-elevated, #141419);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 64%, transparent);
`;

export const WidgetKicker = styled.p`
  margin: 0 0 0.35rem;
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--accent-gold, #C6A84B);
`;

export const WidgetTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  line-height: 1.25;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
`;

export const WidgetMeta = styled.p`
  margin: 0.45rem 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;

export const WidgetButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.8rem;

  @media (max-width: 380px) { grid-template-columns: 1fr; }
`;

export const WidgetButton = styled.button<{ $primary?: boolean }>`
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0.72rem;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)'
    : 'color-mix(in srgb, var(--swan-lavender, #4070C0) 24%, transparent)'};
  background: ${({ $primary }) => $primary
    ? 'linear-gradient(135deg, var(--primary-blue, #002060), var(--accent-secondary, #8B5CF6))'
    : 'color-mix(in srgb, var(--bg-base, #030712) 66%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
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

export const WidgetStatList = styled.div`
  display: grid;
  gap: 0.55rem;
  margin-top: 0.8rem;
`;

export const WidgetStat = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 64%, transparent);
`;

export const WidgetStatLabel = styled.span`
  min-width: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419)));
`;

export const WidgetStatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--text-primary, #E0ECF4);
`;

export const TrainerMobileDock = styled.nav`
  display: none;

  @media (max-width: 720px) {
    position: sticky;
    bottom: 0.75rem;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.35rem;
    padding: 0.45rem;
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-elevated, #141419) 94%, var(--primary-blue, #002060));
    box-shadow: 0 12px 30px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 70%, transparent);
  }

  @media (max-width: 380px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
`;

export const MobileDockButton = styled.button<{ $primary?: boolean }>`
  min-width: 0;
  min-height: 44px;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  padding: 0.4rem 0.28rem;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)'
    : 'transparent'};
  background: ${({ $primary }) => $primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
    : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  cursor: pointer;

  span { color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419))); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;