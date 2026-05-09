/**
 * Badge showcase styles for the canonical UserDashboard V3 surface.
 * Extracted from DashboardV3Styles.ts without CSS behavior changes.
 */

import styled from 'styled-components';

export const BadgeShowcase = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin-top: 0.75rem;
  padding: 0 1rem;

  @media (max-width: 430px) {
    gap: 0.75rem;
  }
`;

export const BadgeShowcaseItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 60px;
`;

export const BadgeIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: color-mix(in srgb, var(--bg-base, #002060) 60%, transparent);
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
    transform: translateY(-2px);
  }

  @media (max-width: 430px) {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
`;

export const BadgeName = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary, #94a3b8);
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Sora', sans-serif;
`;
