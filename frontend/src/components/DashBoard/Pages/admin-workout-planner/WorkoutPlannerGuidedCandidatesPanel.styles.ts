import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

export const GuidedCandidatesWrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 14px 0 18px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: linear-gradient(145deg, var(--bg-surface, #1A1A24), var(--bg-base, #030712));
`;

export const GuidedCandidatesHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const GuidedCandidatesTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
`;

export const GuidedCandidatesMeta = styled.span`
  color: ${PLANNER_GOLD};
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
`;

export const GuidedCandidatesClear = styled.button`
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0 12px;
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 3px; }
`;

export const GuidedSlot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const GuidedSlotInstruction = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
`;

export const GuidedCandidateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
`;

export const GuidedCandidateCard = styled.article`
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  min-width: 0;
`;

export const CandidateName = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  line-height: 1.25;
`;

export const CandidateNote = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  line-height: 1.45;
`;

export const CandidateMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

export const CandidateMetaPill = styled.span`
  border: 1px solid ${plannerGoldAlpha(0.28)};
  border-radius: 999px;
  background: color-mix(in srgb, ${PLANNER_GOLD} 10%, var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  padding: 6px 8px;
`;

export const CandidateEmpty = styled.p`
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.22));
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
`;

export const CandidateAddButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 3px; }
`;