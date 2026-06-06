import styled from 'styled-components';

export const HistorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 20px 0 24px;
`;

export const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const HistoryTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.125rem;
  font-weight: 700;
`;

export const HistoryCount = styled.span`
  color: var(--text-secondary, #A9B7C8);
  font-size: 0.8125rem;
`;

export const HistoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

export const HistoryCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 132px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent);
  box-shadow: var(--shadow-subtle, 0 10px 28px color-mix(in srgb, var(--bg-base, #0A0A0F) 30%, transparent));
`;

export const HistoryCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

export const HistoryType = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;
`;

export const HistoryDate = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  font-size: 0.75rem;
  white-space: nowrap;
`;

export const HistoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const HistoryPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 8px;
  border-radius: 999px;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  font-size: 0.75rem;
  font-weight: 600;
`;

export const HistoryText = styled.p`
  margin: 0;
  color: var(--text-secondary, #A9B7C8);
  font-size: 0.8125rem;
  line-height: 1.5;
`;

export const HistoryEmpty = styled.div`
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  color: var(--text-secondary, #A9B7C8);
  background: color-mix(in srgb, var(--bg-elevated, #1A1A24) 72%, transparent);
`;
