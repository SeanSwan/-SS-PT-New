/**
 * MyClientsView.layoutStyles.ts
 * -----------------------------
 * Layout-only styled components for the canonical trainer /clients surface.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import { swanSectionBackdrop } from '../../DashBoard/workspaces/clients-team/clientCardSystem';

export const ClientsContainer = styled(motion.div)`
  ${swanSectionBackdrop}
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  border-radius: 18px;

  @media (max-width: 768px) {
    padding: 0.5rem;
    border-radius: 0;
  }
`;

export const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--surface-elevated, #1A1A24);
  border: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
  border-radius: 16px;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

export const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary, #E0ECF4);
    margin: 0;
    background: linear-gradient(
      135deg,
      var(--accent-purple-strong, #8B5CF6) 0%,
      var(--accent-purple, #8b5cf6) 50%,
      var(--accent-primary, #60C0F0) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    @media (forced-colors: active) {
      background: none;
      -webkit-text-fill-color: revert;
      color: CanvasText;
    }
  }

  .client-count {
    background: linear-gradient(
      135deg,
      var(--accent-purple-strong, #8B5CF6),
      var(--accent-purple, #8b5cf6)
    );
    color: var(--text-primary, #E0ECF4);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .client-intent-note {
    max-width: 34rem;
    margin: 0.65rem 0 0;
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, var(--bg-elevated, #141419)));
    font-size: 0.95rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  @media (max-width: 768px) {
    flex-direction: column;

    h1 {
      font-size: 1.5rem;
    }
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
  }
`;

export const FilterSection = styled(motion.div)`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

export const SearchContainer = styled.div`
  position: relative;
  flex: 1 1 250px;
  min-width: min(250px, 100%);

  .search-input {
    width: 100%;
    min-height: 44px;
    background: var(--surface-elevated, #1A1A24);
    border: 1px solid var(--border-accent-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
    border-radius: 12px;
    padding: 0.75rem 1rem 0.75rem 3rem;
    color: var(--text-primary, #E0ECF4);
    font-size: 0.95rem;
    transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

    &::placeholder {
      color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, var(--bg-elevated, #141419)));
    }

    &:focus {
      outline: none;
      border-color: var(--accent-purple, #8b5cf6);
      box-shadow: 0 0 20px var(--accent-purple-shadow, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
    }
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, var(--bg-elevated, #141419)));
  }
`;

export const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  background: ${props =>
    props.$active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060))'
      : 'var(--surface-elevated, #1A1A24)'
  };
  border: 1px solid ${props =>
    props.$active
      ? 'transparent'
      : 'var(--border-accent-soft, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent))'
  };
  border-radius: 8px;
  min-height: 44px;
  padding: 0.5rem 1rem;
  color: var(--text-primary, #E0ECF4);
  text-shadow: ${props => (props.$active ? '0 1px 2px color-mix(in srgb, var(--bg-base, #0A0A0F) 35%, transparent)' : 'none')};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;

  &:hover {
    background: ${props =>
      props.$active
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, var(--brand-primary, #002060))'
        : 'var(--surface-hover, #222230)'
    };
    transform: translateY(-2px);
    box-shadow: 0 0 20px var(--accent-purple-shadow, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent));
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

export const StatsRow = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

export const StatCard = styled.div<{
  $color: string;
  $colorSoft?: string;
  $colorStrong?: string;
}>`
  background: var(--surface-elevated, #1A1A24);
  border: 1px solid ${props => props.$colorSoft ?? `${props.$color}30`};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;

  &:hover {
    border-color: ${props => props.$colorStrong ?? `${props.$color}60`};
    box-shadow: 0 0 20px ${props => props.$colorSoft ?? `${props.$color}30`};
    transform: translateY(-2px);
  }

  .stat-icon {
    color: ${props => props.$color};
    margin-bottom: 0.5rem;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 0.25rem;
  }

  .stat-label {
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, var(--bg-elevated, #141419)));
    font-size: 0.9rem;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

export const ClientsGrid = styled(motion.div)`
  --client-card-desktop-row: 520px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  grid-auto-rows: var(--client-card-desktop-row);
  align-items: stretch;
  gap: 1.5rem;

  @media (min-width: 2560px) { --client-card-desktop-row: 560px; }
  @media (min-width: 3840px) { --client-card-desktop-row: 620px; }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
    gap: 1rem;
  }
`;

export const EmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, var(--bg-elevated, #141419)));

  .empty-icon {
    color: var(--accent-purple-muted, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent));
    margin-bottom: 1.5rem;
  }

  h3 {
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 0.5rem;
  }

  p {
    margin-bottom: 2rem;
    max-width: 400px;
    line-height: 1.6;
  }
`;
