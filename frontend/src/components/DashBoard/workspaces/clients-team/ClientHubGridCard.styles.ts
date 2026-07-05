/** ClientHubGridCard styles for the canonical Clients Workspace. */

import styled from 'styled-components';
import {
  swanClientAvatar,
  swanDataCardShell,
  swanMetricTile,
  swanPill,
} from './clientCardSystem';
import type { ClientSessionSignalTone } from './clientSessionSignal';
import type { ClientSourceTone } from './clientSourceDisplay';
import type { ClientReadinessTone } from './clientCardReadiness';

export const CardShell = styled.article`
  --swan-card-padding: 16px;
  container: clientcard / inline-size;
  ${swanDataCardShell}
  display: flex;
  flex-direction: column;
  align-self: stretch;
  height: auto;
  max-height: none;
  min-height: 100%;
  overflow: visible;
  box-sizing: border-box;

  > * + * {
    margin-top: 14px;
  }

  [data-swan-card-section='admin-actions'] {
    margin-top: auto;
  }

  @container clientcard (min-width: 420px) {
    --swan-card-padding: 20px;

    > * + * {
      margin-top: 16px;
    }
  }

  @container clientcard (max-width: 300px) {
    --swan-card-padding: 14px;
    min-height: auto;
    max-height: none;
    overflow: visible;
    > * + * { margin-top: 12px; }
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

  @container clientcard (max-width: 300px) {
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

  @container clientcard (max-width: 300px) {
    --swan-avatar-size: 48px;
  }
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
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
  display: -webkit-box; overflow: hidden;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(17px, 3.4cqi, 21px);
  font-weight: 800;
  line-height: 1.18;
  overflow-wrap: anywhere;
`;

export const Pill = styled.span<{ $tone?: 'default' | 'danger' }>`
  ${swanPill}
  border-color: ${({ $tone }) =>
    $tone === 'danger'
      ? 'color-mix(in srgb, var(--status-error, #EF4444) 55%, transparent)'
      : undefined};
  background: ${({ $tone }) =>
    $tone === 'danger'
      ? 'color-mix(in srgb, var(--bg-card, #141419) 76%, var(--status-error, #EF4444) 14%)'
      : undefined};
`;

export const ContactLine = styled.span`
  display: -webkit-box;
  margin: -2px 0 8px;
  overflow: hidden;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--text-muted, rgba(224, 236, 244, 0.76));
  font-family: 'Fira Code', monospace;
  font-size: clamp(11px, 2.3cqi, 13px);
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
  font-size: clamp(13px, 2.6cqi, 15px);
  line-height: 1.35;
`;

export const ReadinessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @container clientcard (max-width: 280px) {
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

export const ReadinessValue = styled.span<{ $tone?: ClientReadinessTone }>`
  min-width: 0;
  color: ${({ $tone = 'default' }) => {
    if ($tone === 'danger') return 'var(--status-error, #F87171)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, var(--accent-secondary, #8B5CF6))';
    return 'var(--text-primary, #E0ECF4)';
  }};
  font-family: 'Sora', sans-serif;
  font-size: clamp(12px, 2.5cqi, 14px);
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @container clientcard (max-width: 280px) {
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

  @container clientcard (max-width: 280px) {
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
  font-size: clamp(12px, 2.5cqi, 14px);
  font-weight: 800;
  text-align: right;

  small {
    color: var(--accent-primary, #60C0F0);
    font-family: 'Fira Code', monospace;
    font-size: 10px;
    font-weight: 700;
  }

  @container clientcard (max-width: 280px) {
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
    if ($tone === 'gold') return 'color-mix(in srgb, var(--bg-card, #141419) 82%, var(--accent-gold, #C6A84B) 8%)';
    if ($tone === 'warning') return 'color-mix(in srgb, var(--bg-card, #141419) 82%, var(--accent-secondary, #8B5CF6) 10%)';
    return 'color-mix(in srgb, var(--bg-card, #141419) 84%, transparent)';
  }};
  font-family: 'Sora', sans-serif;
  font-size: clamp(12px, 2.5cqi, 14px);
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
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, var(--bg-card, #141419));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
`;
