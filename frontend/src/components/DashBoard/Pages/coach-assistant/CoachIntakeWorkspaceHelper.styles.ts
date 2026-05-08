/**
 * CoachIntakeWorkspaceHelper.styles.ts
 * ====================================
 * Helper rail styles for the embedded Swan Coach intake workspace.
 */
import styled from 'styled-components';

export const HelperRail = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Helper = styled.div`
  display: flex;
  gap: 8px;
  min-height: 58px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 6%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.35;

  svg {
    flex: 0 0 auto;
    color: var(--accent-gold, #C6A84B);
  }
`;
