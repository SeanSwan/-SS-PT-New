/**
 * PainChartInsightPanel.styles
 * ============================
 * Styled layer for the pain-chart insight panel (extracted in Slice 0.3 to
 * honor the 300-line cap). Crystalline tokens with fallbacks; risk-band
 * color map shared with the panel body.
 */

import styled from 'styled-components';
import type { PainRiskBand } from './painChartInsights';

export const riskColors: Record<PainRiskBand, string> = {
  clear: 'var(--accent-primary, #60C0F0)',
  low: 'var(--accent-primary, #60C0F0)',
  moderate: 'var(--data-accent, #50A0F0)',
  review: 'var(--accent-gold, #C6A84B)',
};

export const Panel = styled.section`
  margin-top: 20px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: linear-gradient(180deg, var(--bg-elevated, rgba(0, 32, 96, 0.42)), var(--bg-surface, rgba(10, 10, 15, 0.62)));
  padding: 14px;
`;

export const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const TitleGroup = styled.div`
  min-width: 220px;
`;

export const Title = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 16px;
  font-weight: 700;
`;

export const Subtitle = styled.p`
  margin: 4px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 13px;
  line-height: 1.45;
`;

export const RiskBadge = styled.span<{ $risk: PainRiskBand }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid ${({ $risk }) => riskColors[$risk]};
  background: rgba(96, 192, 240, 0.08);
  background: color-mix(in srgb, ${({ $risk }) => riskColors[$risk]} 16%, transparent);
  color: ${({ $risk }) => riskColors[$risk]};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  padding: 0 14px;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
  gap: 8px;
  margin-top: 14px;
`;

export const Metric = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.38);
  padding: 10px;
`;

export const MetricValue = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 18px;
  font-weight: 800;
`;

export const MetricLabel = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.62));
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0;
`;

export const AlertList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

export const Alert = styled.div`
  border: 1px solid rgba(198, 168, 75, 0.34);
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.09);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  line-height: 1.45;
  padding: 10px 12px;
`;

export const ConstraintBlock = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

export const ConstraintText = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 13px;
  line-height: 1.5;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 16px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.18))'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.16)' : 'rgba(10, 10, 15, 0.32)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  padding: 0 12px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const EntryList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
`;

export const EntryButton = styled.button`
  min-height: 54px;
  width: 100%;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.32);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const EntryMain = styled.span`
  display: grid;
  min-width: 0;
  gap: 2px;
`;

export const EntryName = styled.span`
  font-weight: 700;
  font-size: 13px;
`;

export const EntryDetail = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.66));
  font-size: 12px;
`;

export const EntryStatus = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  white-space: nowrap;
`;

export const EmptyState = styled.p`
  margin: 12px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.66));
  font-size: 13px;
`;

export const DisclaimerText = styled.p`
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;
