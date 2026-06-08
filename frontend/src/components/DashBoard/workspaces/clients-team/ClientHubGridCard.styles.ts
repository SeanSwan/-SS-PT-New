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
import type { ClientSessionSignalTone } from './clientSessionSignal';
import type { ClientSourceTone } from './clientSourceDisplay';

export const CardShell = styled.article`
  position: relative;
  display: grid;
  gap: 14px;
  min-height: 168px;
  padding: 16px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background:
    radial-gradient(circle at top left,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent),
      transparent 38%),
    linear-gradient(145deg,
      color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, var(--accent-primary, #60C0F0) 8%),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, var(--accent-secondary, #8B5CF6) 12%));
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  box-shadow: 0 16px 34px var(--shadow-ambient, rgba(0, 0, 0, 0.32));
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 0%, var(--sheen-highlight, rgba(255, 255, 255, 0.08)) 44%, transparent 58%);
    transform: translateX(-120%);
    transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  &:hover {
    transform: translateY(-2px);
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 20px 44px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }

  &:hover::after {
    transform: translateX(120%);
  }

  @media (max-width: 430px) {
    min-height: 156px;
    padding: 14px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }

    &::after {
      transition: none;
    }
  }
`;

export const CardButton = styled.button`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
    border-radius: 12px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 48px minmax(0, 1fr);
  }
`;

export const Avatar = styled.div<{ $source?: ClientSourceTone }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--button-text, #FFFFFF);
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 800;
  background: ${({ $source }) =>
    $source === 'mf'
      ? 'linear-gradient(135deg, var(--rarity-rare, #C6A84B), var(--accent-secondary, #8B5CF6))'
      : $source === 'external'
        ? 'linear-gradient(135deg, var(--bg-elevated, #141419), var(--tertiary, #4070C0))'
      : 'linear-gradient(135deg, var(--primary, #002060), var(--accent-primary, #60C0F0))'};
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  @media (max-width: 430px) {
    width: 48px;
    height: 48px;
  }
`;

export const CardBody = styled.div`
  min-width: 0;
`;

export const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  flex-wrap: wrap;
`;

export const Name = styled.div`
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.18;
`;

export const Pill = styled.span`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 80%, transparent);
  color: var(--text-muted, rgba(224, 236, 244, 0.84));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
`;

export const GoalLine = styled.div`
  display: -webkit-box;
  min-height: 36px;
  margin-bottom: 12px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-muted, rgba(224, 236, 244, 0.82));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.35;
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const Metric = styled.span<{ $tone?: ClientSessionSignalTone }>`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border-radius: 10px;
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
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

export const MetricStack = styled.span`
  min-width: 0;
  display: grid;
  gap: 2px;
`;

export const MetricNote = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
`;
