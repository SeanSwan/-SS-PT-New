import styled, { css } from 'styled-components';

export const BackgroundStudioSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const BackgroundHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const BackgroundTitle = styled.div`
  min-width: 0;

  span {
    display: block;
    margin-bottom: 5px;
    font-family: 'Fira Code', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent-primary, #60C0F0);
  }

  strong {
    display: block;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    color: var(--text-primary, #E0ECF4);
  }
`;

export const ActiveBackgroundPill = styled.div`
  flex: 0 0 auto;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 11%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-gold, #C6A84B) 42%, transparent);
`;

export const BackgroundModeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 5px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--bg-base, #030712) 60%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const BackgroundModeButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ $active }) =>
    $active ? 'var(--button-primary-text, #030712)' : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent)'};
  background: transparent;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  ${({ $active }) =>
    $active &&
    css`
      background: linear-gradient(135deg, var(--button-primary-bg, #60C0F0), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 46%, var(--button-primary-bg, #60C0F0)));
      box-shadow: 0 0 22px -10px color-mix(in srgb, var(--accent-primary, #60C0F0) 70%, transparent);
    `}

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const RotationSelectRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent);

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }

  select {
    flex: 1 1 auto;
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    padding: 0 12px;
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--bg-base, #030712) 70%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }
`;

export const BackgroundGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const BackgroundCard = styled.button<{ $active: boolean }>`
  min-height: 96px;
  border: 0;
  border-radius: 14px;
  padding: 9px;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #030712) 52%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  ${({ $active }) =>
    $active &&
    css`
      box-shadow: inset 0 0 0 1.7px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 86%, transparent),
        0 0 24px -10px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent);
    `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const BackgroundPreview = styled.span`
  width: 74px;
  height: 66px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
`;

export const BackgroundMeta = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const BackgroundName = styled.span`
  overflow-wrap: anywhere;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
`;

export const BackgroundMood = styled.span`
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.35;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

export const BackgroundCheck = styled.span<{ $active: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--button-primary-text, #030712);
  background: var(--button-primary-bg, #60C0F0);
  opacity: ${({ $active }) => ($active ? 1 : 0)};
`;

export const UploadPhotoButton = styled.button`
  min-height: 96px;
  height: 100%;
  border: 0;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--button-primary-text, #030712);
  background: var(--button-primary-bg, #60C0F0);
  box-shadow: 0 0 22px -10px color-mix(in srgb, var(--accent-primary, #60C0F0) 72%, transparent);

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const BackgroundError = styled.div`
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-error, #EF4444) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-error, #EF4444) 42%, transparent);
`;
