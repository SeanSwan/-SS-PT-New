/**
 * CoachIntakeWorkspaceTarget.styles.ts
 * ====================================
 * Active review-target strip for the Swan Coach intake workspace.
 */
import styled from 'styled-components';

export const TargetPanel = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin: 0 0 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 7%, var(--bg-base, #030712));
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const TargetBody = styled.div`
  min-width: 0;

  h3 {
    margin: 4px 0 3px;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    line-height: 1.25;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }
`;

export const TargetEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
`;

export const TargetActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;
