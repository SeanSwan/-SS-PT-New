import styled from 'styled-components';

export const BannerStickyToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;

  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary, #60C0F0);
    cursor: pointer;
  }
`;

export const BannerPresetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const BannerPresetRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 8px;
`;

export const BannerPresetApplyButton = styled.button`
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  pointer-events: auto;
  font-size: 0.74rem;
  font-weight: 700;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const BannerPresetRemoveButton = styled.button`
  min-height: 44px;
  width: 44px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 26%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  color: var(--accent-gold, #C6A84B);
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    border-color: var(--accent-gold, #C6A84B);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;
