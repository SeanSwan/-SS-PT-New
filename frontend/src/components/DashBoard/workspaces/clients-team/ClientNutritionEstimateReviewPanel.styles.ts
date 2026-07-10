import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile } from './clientCardSystem';

const alpha = (token: string, fallback: string, amount: number) =>
  `color-mix(in srgb, var(${token}, ${fallback}) ${amount}%, transparent)`;

export const EstimateReviewShell = styled.section`
  --swan-card-padding: 14px;
  ${swanDataCardShell}
  margin: 0 20px 12px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    margin: 0 12px 10px;
  }
`;

export const EstimateReviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

export const EstimateReviewTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 800;
`;

export const EstimateReviewMeta = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 72)});
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
`;

export const EstimateReviewList = styled.div`
  display: grid;
  gap: 9px;
`;

export const EstimateReviewCard = styled.article`
  ${swanMetricTile}
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const EstimateReviewBody = styled.div`
  min-width: 0;
  display: grid;
  gap: 5px;
`;

export const EstimateReviewClient = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

export const EstimateReviewMeal = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;
`;

export const EstimateReviewDescription = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

export const EstimateReviewFacts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const EstimateReviewFact = styled.span`
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 75)});
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 800;
`;

export const EstimateReviewButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  color: var(--button-primary-text, #FFFFFF);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--button-primary-bg, #002060) 88%, transparent),
    color-mix(in srgb, var(--accent-purple, #8B5CF6) 18%, var(--surface-elevated, #003080))
  );
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 900;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: progress;
    opacity: 0.68;
  }

  @media (max-width: 680px) {
    width: 100%;
  }
`;

export const EstimateReviewMoreButton = styled(EstimateReviewButton)`
  width: 100%;
  margin-top: 10px;
  background: var(--button-secondary-bg, #003080);
`;

export const EstimateReviewState = styled.div`
  ${swanMetricTile}
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  color: var(--text-muted, ${alpha('--swan-frost-white', '#E0ECF4', 78)});
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
`;
