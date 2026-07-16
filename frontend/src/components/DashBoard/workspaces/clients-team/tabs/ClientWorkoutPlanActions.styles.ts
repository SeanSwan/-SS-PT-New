/** Staff plan-card action and derivative-state styles. */
import styled from 'styled-components';
import { swanClientActionButton, swanMetricTile, swanPill } from '../clientCardSystem';

export const PdfStateCard = styled.div<{ $state: string }>`
  ${swanMetricTile}
  display: grid;
  gap: 4px;
  padding: 10px;
  border-color: ${({ $state }) => (
    $state === 'failed'
      ? 'var(--status-error, #F87171)'
      : $state === 'custom-review' || $state === 'stale'
        ? 'var(--accent-gold, #C6A84B)'
        : 'var(--border-soft, rgba(96, 192, 240, 0.18))'
  )};
`;

export const PdfStateLabel = styled.strong`
  ${swanPill}
  width: fit-content;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, var(--accent-primary, #60C0F0) 8%);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
`;

export const PdfStateDetail = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.45;
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const actionCss = `
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 11px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  ${swanClientActionButton}
  ${actionCss}
  --swan-action-bg: ${({ $primary }) => ($primary
    ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-tertiary, #4070C0))'
    : 'transparent')};
  --swan-action-border: ${({ $primary }) => ($primary
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)')};
`;

export const ActionLink = styled.a`
  ${swanClientActionButton}
  ${actionCss}
`;

export const PlanDetails = styled.div`
  ${swanMetricTile}
  display: grid;
  gap: 8px;
  padding: 11px;
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 8px;
  margin: 0;

  div { display: grid; gap: 2px; }
  dt {
    color: var(--text-muted, rgba(224, 236, 244, 0.72));
    font: 700 10px/1.3 'Fira Code', monospace;
    text-transform: uppercase;
  }
  dd {
    margin: 0;
    color: var(--text-primary, #E0ECF4);
    font: 700 12px/1.4 'Sora', sans-serif;
  }
`;

export const ActionMenu = styled.details`
  position: relative;

  summary {
    ${swanClientActionButton}
    ${actionCss}
    list-style: none;
    cursor: pointer;
  }
  summary::-webkit-details-marker { display: none; }
`;

export const ActionMenuPanel = styled.div`
  position: absolute;
  z-index: 4;
  right: 0;
  top: calc(100% + 6px);
  width: min(210px, 80vw);
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 10px;
  background: var(--bg-elevated, #1A1A24);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
`;

export const MenuButton = styled.button<{ $danger?: boolean }>`
  ${swanClientActionButton}
  min-height: 44px;
  width: 100%;
  justify-content: flex-start;
  color: ${({ $danger }) => ($danger
    ? 'var(--status-error, #F87171)'
    : 'var(--text-primary, #E0ECF4)')};
  font: 800 11px/1.2 'Sora', sans-serif;
`;