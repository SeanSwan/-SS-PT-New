/**
 * ============================================================================
 * FILE: ClientHubGridCard.styles.ts
 * PURPOSE: Crystalline client-card chrome for the canonical Clients Workspace.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Keeps the premium card shell, avatar, metric, and mobile-responsive layout
 * outside the active client-card data component.
 *
 * HOW IT FITS IN THE APP:
 * ClientsWorkspace -> ClientHubGridCard -> ClientHubGridCard.styles.
 */

import styled from 'styled-components';
import {
  swanClientAvatar,
  swanDataCardShell,
  swanMetricTile,
  swanPill,
} from './clientCardSystem';
import type { ClientSessionSignalTone } from './clientSessionSignal';
import type { ClientSourceTone } from './clientSourceDisplay';

export const CardShell = styled.article`
  --swan-card-padding: 16px;
  ${swanDataCardShell}
  display: flex;
  flex-direction: column;
  align-self: stretch;
  height: 100%;
  min-height: 320px;

  > * + * {
    margin-top: 14px;
  }

  [data-swan-card-section='admin-actions'] {
    margin-top: auto;
  }

  @media (max-width: 430px) {
    --swan-card-padding: 14px;
    min-height: auto;

    > * + * {
      margin-top: 12px;
    }
  }
`;

export const CardButton = styled.button`
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
    border-radius: 12px;
  }
`;

export const IdentityRow = styled.span`
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: start;
  gap: 14px;

  @media (max-width: 430px) {
    gap: 12px;
  }
`;

export const Avatar = styled.span<{ $source?: ClientSourceTone }>`
  ${swanClientAvatar}
  background: ${({ $source }) =>
    $source === 'mf'
      ? 'linear-gradient(135deg, var(--rarity-rare, #C6A84B), var(--accent-secondary, #8B5CF6))'
      : $source === 'external'
        ? 'linear-gradient(135deg, var(--bg-elevated, #141419), var(--tertiary, #4070C0))'
      : 'linear-gradient(135deg, var(--primary, #002060), var(--accent-primary, #60C0F0))'};

  @media (max-width: 430px) {
    --swan-avatar-size: 48px;
  }
`;

export const CardBody = styled.span`
  min-width: 0;
  display: grid;
  align-content: start;
`;

export const TopLine = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  flex-wrap: wrap;
`;

export const Name = styled.span`
  min-width: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.18;
  overflow-wrap: anywhere;
`;

export const Pill = styled.span`
  ${swanPill}
`;

export const ContactLine = styled.span`
  display: block;
  margin: -2px 0 8px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--text-muted, rgba(224, 236, 244, 0.76));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
`;

export const GoalLine = styled.div`
  display: -webkit-box;
  min-height: 36px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.35;
`;

export const ReadinessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const ReadinessItem = styled.div`
  ${swanMetricTile}
  min-height: 50px;
  display: grid;
  align-content: center;
  gap: 3px;
  padding: 8px 10px;
`;

export const ReadinessLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.64));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const ReadinessValue = styled.span`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const ProofPanel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 58px;
  padding: 10px 11px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: color-mix(in srgb, var(--bg-base, #050810) 70%, transparent);

  @media (max-width: 360px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const ProofHeader = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const ProofValue = styled.div`
  min-width: 0;
  display: grid;
  justify-items: end;
  gap: 2px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  text-align: right;

  small {
    color: var(--accent-primary, #60C0F0);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    font-weight: 700;
  }

  @media (max-width: 360px) {
    justify-items: start;
    text-align: left;
  }
`;

export const Metric = styled.span<{ $tone?: ClientSessionSignalTone }>`
  ${swanMetricTile}
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)';
  }};
  background: ${({ $tone = 'default' }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--bg-elevated, #141419) 82%, var(--accent-gold, #C6A84B) 8%)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--bg-elevated, #141419) 82%, var(--accent-secondary, #8B5CF6) 10%)';
    return 'color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent)';
  }};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  min-width: 0;
  overflow-wrap: anywhere;

  svg {
    flex: 0 0 auto;
  }
`;

export const MetricStack = styled.span`
  min-width: 0;
  display: grid;
  gap: 2px;
`;

export const MetricNote = styled.span`
  white-space: normal;
  overflow-wrap: anywhere;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, var(--bg-elevated, #141419));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
`;
