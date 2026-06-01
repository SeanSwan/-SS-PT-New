/**
 * MyClientsView.layoutStyles.ts
 * -----------------------------
 * Layout-only styled components for the canonical trainer /clients surface.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';

export const ClientsContainer = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

export const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--surface-elevated, rgba(30, 30, 60, 0.6));
  border: 1px solid var(--border-accent-soft, rgba(139, 92, 246, 0.3));
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
    color: var(--text-primary, #ffffff);
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
  }

  .client-count {
    background: linear-gradient(
      135deg,
      var(--accent-purple-strong, #8B5CF6),
      var(--accent-purple, #8b5cf6)
    );
    color: var(--text-primary, #ffffff);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
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
  flex: 1;
  min-width: 250px;

  .search-input {
    width: 100%;
    background: var(--surface-elevated, rgba(30, 30, 60, 0.6));
    border: 1px solid var(--border-accent-soft, rgba(139, 92, 246, 0.3));
    border-radius: 12px;
    padding: 0.75rem 1rem 0.75rem 3rem;
    color: var(--text-primary, #ffffff);
    font-size: 0.95rem;
    transition: all 0.3s ease;

    &::placeholder {
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    &:focus {
      outline: none;
      border-color: var(--accent-purple, #8b5cf6);
      box-shadow: 0 0 20px var(--accent-purple-shadow, rgba(139, 92, 246, 0.3));
    }
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted, rgba(255, 255, 255, 0.5));
  }
`;

export const FilterButton = styled(motion.button)<{ active?: boolean }>`
  background: ${props =>
    props.active
      ? 'linear-gradient(135deg, var(--accent-purple-strong, #8B5CF6), var(--accent-purple, #8b5cf6))'
      : 'var(--surface-elevated, rgba(30, 30, 60, 0.6))'
  };
  border: 1px solid ${props =>
    props.active
      ? 'transparent'
      : 'var(--border-accent-soft, rgba(139, 92, 246, 0.3))'
  };
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: var(--text-primary, #ffffff);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    background: ${props =>
      props.active
        ? 'linear-gradient(135deg, var(--accent-purple-strong, #8B5CF6), var(--accent-purple, #8b5cf6))'
        : 'var(--surface-hover, rgba(50, 50, 80, 0.4))'
    };
    transform: translateY(-2px);
    box-shadow: 0 0 20px var(--accent-purple-shadow, rgba(139, 92, 246, 0.3));
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
  background: var(--surface-elevated, rgba(30, 30, 60, 0.6));
  border: 1px solid ${props => props.$colorSoft ?? `${props.$color}30`};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  transition: all 0.3s ease;

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
    color: var(--text-primary, #ffffff);
    margin-bottom: 0.25rem;
  }

  .stat-label {
    color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    font-size: 0.9rem;
  }
`;

export const ClientsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
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
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));

  .empty-icon {
    color: var(--accent-purple-muted, rgba(139, 92, 246, 0.5));
    margin-bottom: 1.5rem;
  }

  h3 {
    color: var(--text-primary, #ffffff);
    margin-bottom: 0.5rem;
  }

  p {
    margin-bottom: 2rem;
    max-width: 400px;
    line-height: 1.6;
  }
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-primary, #ffffff);
`;
