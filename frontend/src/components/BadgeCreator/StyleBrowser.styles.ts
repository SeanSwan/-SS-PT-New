import styled, { css } from 'styled-components';

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const Wrapper = styled.div`
  margin-bottom: 20px;
`;

export const CategoryTabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

export const CatTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
      : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #B9C6D2)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  ${focusRing}

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;

export const StyleCard = styled.button<{ $selected: boolean }>`
  padding: 12px;
  border-radius: 10px;
  border: 2px solid ${({ $selected }) =>
    $selected
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $selected }) =>
    $selected
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'
      : 'var(--bg-elevated, #141419)'};
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  min-height: 44px;
  ${focusRing}

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

export const StyleIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px;
  color: var(--accent-primary, #60C0F0);
`;

export const StyleName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;
