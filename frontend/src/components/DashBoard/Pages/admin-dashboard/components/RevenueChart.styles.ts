import styled from 'styled-components';
import {
  CHART_COLORS,
  hexAlpha,
} from '../../../../Charts/chartTheme';

export const Wrapper = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const IconWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${hexAlpha(CHART_COLORS.gildedFern, 0.15)};
  color: ${CHART_COLORS.gildedFern};
`;

export const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: 12px;
  margin: 2px 0 0;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-family: 'Fira Code', monospace;
`;

export const Controls = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const RangeBtn = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s;
  background: ${p => p.$active ? hexAlpha(CHART_COLORS.gildedFern, 0.2) : 'transparent'};
  color: ${p => p.$active ? CHART_COLORS.gildedFern : 'var(--text-muted, rgba(255,255,255,0.5))'};

  &:hover {
    color: ${CHART_COLORS.gildedFern};
  }
`;

export const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, rgba(224,236,244,0.5));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { color: ${CHART_COLORS.iceWing}; background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent); }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const ChartWrap = styled.div`
  width: 100%;
  min-height: 220px;

  @media (prefers-reduced-motion: reduce) {
    svg * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

export const ErrorState = styled.div`
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 18px;
  text-align: center;
  color: var(--warning, #C6A84B);
  background: var(--surface-muted, rgba(198, 168, 75, 0.08));
  border: 1px solid var(--border-warning, rgba(198, 168, 75, 0.2));
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
`;

export const RetryInline = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-warning, rgba(198, 168, 75, 0.28));
  border-radius: 10px;
  padding: 8px 14px;
  color: var(--warning, #C6A84B);
  background: var(--surface-muted, rgba(198, 168, 75, 0.12));
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
`;

export const EmptyState = styled.div`
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  border: 1px dashed var(--border-subtle, rgba(96, 192, 240, 0.16));
  border-radius: 12px;
  font-size: 13px;
`;
