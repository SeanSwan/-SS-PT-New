/**
 * Styled components for FarmFinderTab
 * Extracted to keep FarmFinderTab.tsx under 300 lines (CLAUDE.md rule).
 */
import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const Subtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const ZipInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  min-height: 44px;
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

export const SearchBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 600;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const ErrorMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border-left: 3px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

export const InfoMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.15);
  border: 1px solid rgba(96, 192, 240, 0.4);
  color: var(--accent-primary, #60C0F0);
  font-size: 13px;
`;

export const MapWrapper = styled.div`
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.1);

  @media (max-width: 768px) {
    height: 220px;
  }
`;

export const ResultCount = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const MarketList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MarketCard = styled.button<{ $selected: boolean }>`
  border-radius: 12px;
  border: 1px solid ${(p) => p.$selected
    ? 'rgba(96, 192, 240, 0.3)'
    : 'rgba(96, 192, 240, 0.08)'};
  background: ${(p) => p.$selected
    ? 'rgba(96, 192, 240, 0.04)'
    : 'var(--bg-surface, #1A1A24)'};
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: left;
  width: 100%;
  padding: 0;
  &:hover { border-color: rgba(96, 192, 240, 0.25); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const MarketHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  min-height: 44px;
`;

export const MarketName = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const DistBadge = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(96, 192, 240, 0.08);
`;

export const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 14px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const MarketDetails = styled.div`
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(96, 192, 240, 0.06);
`;

export const DetailItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  line-height: 1.4;
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; margin-top: 2px; }
`;

export const DirectionsLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.08);
  width: fit-content;
  min-height: 44px;
  &:hover { background: rgba(96, 192, 240, 0.15); }
`;

export const Attribution = styled.div`
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  text-align: center;
  padding-top: 8px;
`;
