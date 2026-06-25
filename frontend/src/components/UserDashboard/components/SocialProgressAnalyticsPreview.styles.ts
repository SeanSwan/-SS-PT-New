/**
 * STYLES: SocialProgressAnalyticsPreview
 * PURPOSE: User-dashboard gateway into real client progress analytics.
 */
import styled from 'styled-components';

export const PreviewStack = styled.section`
  display: grid;
  gap: 12px;
  min-width: 0;
`;

export const EmptyPanel = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid var(--client-line, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent));
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--client-panel-strong, #003080) 62%, transparent), transparent),
    color-mix(in srgb, var(--client-panel-soft, #141419) 86%, transparent);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const CopyBlock = styled.div`
  min-width: 0;
  display: grid;
  gap: 6px;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const Title = styled.h3`
  margin: 0;
  color: var(--client-text, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  overflow-wrap: anywhere;
`;

export const Muted = styled.p`
  margin: 0;
  color: var(--client-muted, color-mix(in srgb, var(--client-text, #E0ECF4) 68%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  line-height: 1.45;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

export const PreviewButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid ${({ $primary }) => (
    $primary
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'var(--client-line, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent))'
  )};
  border-radius: 8px;
  background: ${({ $primary }) => (
    $primary
      ? 'var(--button-primary-bg, #002060)'
      : 'color-mix(in srgb, var(--client-panel-soft, #141419) 76%, transparent)'
  )};
  color: var(--client-text, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
  box-shadow: ${({ $primary }) => (
    $primary
      ? '0 0 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent)'
      : 'none'
  )};

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;
