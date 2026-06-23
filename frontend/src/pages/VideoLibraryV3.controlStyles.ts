import styled, { css } from 'styled-components';

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #60C0F0);
    outline-offset: 3px;
  }
`;

const commandButton = css`
  min-height: 48px;
  min-width: 48px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
  ${focusRing}
  ${reducedMotion}

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { cursor: not-allowed; opacity: 0.58; }
  @media (max-width: 430px) { width: 100%; }
`;

export const SearchButton = styled.button`
  ${commandButton}
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  background: var(--button-bg, #002060);
  color: var(--button-text, #FFFFFF);

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  }
`;

export const ClearFiltersButton = styled.button`
  ${commandButton}
  border: ${({ theme }) => theme.borders.card};
  background: color-mix(in srgb, var(--surface-primary, #003080) 34%, transparent);
  color: ${({ theme }) => theme.text.secondary};

  &:hover:not(:disabled) {
    border: ${({ theme }) => theme.borders.elegant};
    color: ${({ theme }) => theme.text.primary};
  }
`;

export const ActiveFilterSummary = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.text.muted};
  font-size: 0.82rem;
  line-height: 1.5;
`;

export const PaginationStatus = styled.div`
  min-width: 100%;
  text-align: center;
  color: ${({ theme }) => theme.text.muted};
  font-size: 0.82rem;
  margin-bottom: 0.5rem;
`;

export const PaginationRow = styled.nav`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 2.5rem;
  flex-wrap: wrap;
`;

export const PageButton = styled.button<{ $active?: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  border: ${({ $active, theme }) => ($active ? theme.borders.focus : theme.borders.card)};
  background: ${({ $active, theme }) => ($active ? theme.gradients.glass : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.text.secondary)};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  ${focusRing}
  ${reducedMotion}

  &:hover:not(:disabled) {
    border: ${({ theme }) => theme.borders.elegant};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled { cursor: not-allowed; opacity: ${({ $active }) => ($active ? 1 : 0.48)}; }
`;
