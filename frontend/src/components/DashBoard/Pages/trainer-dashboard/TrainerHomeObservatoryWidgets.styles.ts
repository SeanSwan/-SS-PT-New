import styled from 'styled-components';

export const WidgetsStack = styled.aside`
  display: grid;
  gap: 0.8rem;
`;

export const WidgetCard = styled.section`
  min-width: 0;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-royal-depth, #003080) 28%, transparent), transparent 62%),
    var(--bg-elevated, #141419);
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
`;

export const WidgetKicker = styled.p`
  margin: 0 0 0.35rem;
  color: var(--accent-secondary, #8B5CF6);
  font: 850 0.7rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const WidgetTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1.05rem/1.25 'Plus Jakarta Sans', sans-serif;
`;

export const WidgetMeta = styled.p`
  margin: 0.45rem 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent));
  font: 650 0.78rem/1.5 'Sora', sans-serif;
`;

export const WidgetButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.8rem;

  @media (max-width: 380px) {
    grid-template-columns: 1fr;
  }
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
  border: 1px solid ${({ $primary }) => ($primary
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)')};
  background: ${({ $primary }) => ($primary
    ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--swan-lavender, #4070C0))'
    : 'color-mix(in srgb, var(--bg-base, #030712) 66%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  font: 850 0.74rem/1 'Sora', sans-serif;
  cursor: pointer;
  transition:
    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
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
  min-width: 0;
  min-height: 52px;
  display: grid;
  /* value column is minmax(0, auto) so a long value can shrink+ellipsis rather
     than grow the row past the card (stats-falling-off fix). */
  grid-template-columns: minmax(0, 1fr) minmax(0, auto);
  gap: 0.65rem;
  align-items: center;
  padding: 0.65rem 0.7rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 60%, transparent);
`;

export const WidgetStatLabel = styled.span`
  min-width: 0;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font: 700 0.74rem/1.35 'Sora', sans-serif;
`;

export const WidgetStatValue = styled.span`
  min-width: 0;
  max-width: 100%;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.84rem/1.1 'Fira Code', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
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
    background: color-mix(in srgb, var(--bg-elevated, #141419) 94%, var(--surface-royal-depth, #003080));
    box-shadow: 0 12px 30px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
  }

  @media (max-width: 380px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export const MobileDockButton = styled.button<{ $primary?: boolean }>`
  min-width: 0;
  min-height: 44px;
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  padding: 0.4rem 0.28rem;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => ($primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)'
    : 'transparent')};
  background: ${({ $primary }) => ($primary
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
    : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  font: 850 0.62rem/1 'Sora', sans-serif;
  cursor: pointer;

  span {
    color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
    font-weight: 650;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
