import styled from 'styled-components';

export const CommandCenterShell = styled.section`
  display: grid;
  grid-template-columns: minmax(14rem, 0.85fr) minmax(18rem, 1.6fr);
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 14px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), transparent 34%),
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent));
  box-shadow: 0 18px 44px color-mix(in srgb, var(--bg-base, #0A0A0F) 54%, transparent);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandIntro = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
`;

export const CommandEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #C6A84B);
  font: 700 0.72rem 'Sora', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const CommandTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 1.08rem 'Plus Jakarta Sans', sans-serif;
`;

export const CommandCopy = styled.p`
  margin: 0;
  max-width: 36rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font-size: 0.88rem;
  line-height: 1.5;
`;

export const CommandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 390px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandButton = styled.button<{ $primary?: boolean }>`
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $primary }) => ($primary
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 52%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)')};
  background: ${({ $primary }) => ($primary
    ? 'linear-gradient(135deg, var(--primary, #002060), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, var(--primary, #002060)))'
    : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent)')};
  box-shadow: ${({ $primary }) => ($primary
    ? '0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent)'
    : 'none')};
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const CommandButtonText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const CommandButtonLabel = styled.span`
  font: 800 0.88rem 'Sora', sans-serif;
`;

export const CommandButtonMeta = styled.span`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font-size: 0.72rem;
  line-height: 1.3;
`;
