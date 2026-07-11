import styled, { css } from 'styled-components';

const focusRing = css`
  outline: 2px solid var(--accent-primary, #60C0F0);
  outline-offset: 2px;
`;

export const DiaryTimeline = styled.section`
  flex: 1 1 100%;
  min-width: 0;
  display: grid;
  gap: 12px;
  padding-top: 4px;
`;

export const DiaryTimelineHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const DiaryTimelineTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);

  svg { color: var(--accent-primary, #60C0F0); }
`;

export const DiaryTimelineMeta = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, #94a3b8);
  font: 700 0.76rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const DiaryList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 10px;
`;

export const DiaryCard = styled.article`
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 9px;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 82%, var(--bg-base, #0A0A0F));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;

export const DiaryCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

export const DiaryMeal = styled.span`
  color: var(--accent-luxury, #C6A84B);
  font: 900 0.7rem/1 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
`;

export const DiaryDescription = styled.h4`
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary, #E0ECF4);
  font: 900 0.92rem/1.3 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const DiaryMacroLine = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  font: 700 0.78rem/1.4 var(--font-data, 'Fira Code', monospace);
`;

export const DiaryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const DiaryChip = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 999px;
  color: var(--text-secondary, #94a3b8);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  font: 700 0.68rem/1.25 var(--font-ui, 'Sora', sans-serif);
  overflow-wrap: anywhere;

  svg { flex: 0 0 auto; color: var(--accent-primary, #60C0F0); }
`;

const actionBase = css`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  font: 800 0.76rem/1.2 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;

  &:focus-visible { ${focusRing} }
`;

export const DiaryRepeatButton = styled.button`
  ${actionBase}
  margin-top: auto;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent);
  background: var(--primary, #002060);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
`;

export const DiaryState = styled.div<{ $error?: boolean }>`
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 11px 12px;
  border-left: 3px solid ${({ $error }) => ($error
    ? 'var(--accent-error, #ff8585)'
    : 'var(--accent-primary, #60C0F0)')};
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.8rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const RetryButton = styled.button`
  ${actionBase}
  margin-left: auto;
  padding: 0 13px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
`;
