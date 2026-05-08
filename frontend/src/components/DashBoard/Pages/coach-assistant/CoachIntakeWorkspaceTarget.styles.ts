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
  align-items: stretch;
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

export const DossierHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`;

export const DossierMeta = styled.span`
  display: block;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
`;

export const DossierGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const GateCard = styled.div`
  min-height: 58px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: flex-start;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 36%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

export const GateLabel = styled.span`
  display: block;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  line-height: 1.3;
  text-transform: uppercase;
`;

export const GateValue = styled.strong`
  display: block;
  margin-top: 2px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.35;
  letter-spacing: 0;
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

export const TargetNotice = styled.span`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 38%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
`;

export const PreparedDraftPanel = styled.section`
  margin: -2px 0 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 11%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 74%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent);
`;

export const PreparedDraftHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h4 {
    margin: 3px 0 2px;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    line-height: 1.3;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

export const PreparedDraftActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;
