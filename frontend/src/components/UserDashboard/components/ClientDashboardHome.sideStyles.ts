/**
 * FILE: ClientDashboardHome.sideStyles.ts
 * PURPOSE: Left-rail navigation and promo styles for the client dashboard.
 */
import styled from 'styled-components';

export const LeftRail = styled.aside`
  position: sticky;
  top: 58px;
  align-self: start;
  min-height: calc(100vh - 58px);
  padding: 18px 16px 22px;
  border-right: 1px solid var(--client-line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--client-bg) 92%, transparent), var(--client-bg));

  @media (max-width: 980px) {
    position: static;
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--client-line);
  }
`;

export const RailSection = styled.section`
  display: grid;
  gap: 6px;
  margin-bottom: 22px;
`;

export const RailLabel = styled.h2`
  margin: 0 0 4px;
  color: var(--client-teal);
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const RailButton = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  width: 100%;
  padding: 0 10px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--client-line-strong)' : 'transparent')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'linear-gradient(90deg, var(--client-panel-strong), transparent)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--client-text)' : 'var(--client-muted)')};
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: var(--client-text);
    border-color: var(--client-line-strong);
    outline: none;
  }
`;

export const StorePromo = styled.button`
  display: grid;
  align-content: end;
  gap: 12px;
  min-height: 184px;
  width: 100%;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background:
    linear-gradient(180deg, transparent, color-mix(in srgb, var(--client-bg) 92%, transparent)),
    url('/images/parallax/video-library-bg.png') center / cover;
  color: var(--client-text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  overflow: hidden;
`;
