/**
 * MyClientsView.logic.ts
 * ----------------------
 * Pure helpers for the canonical trainer /clients surface.
 */

import type { CSSProperties } from 'react';
import { normalizeClientSource } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import type { TrainerClientIntent } from './MyClientsView.types';

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const formatTimeAgo = (dateString?: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return null;

  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

export const formatShortDate = (dateString?: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const getNextSessionLabel = (dateString?: string | null): string => {
  const nextSessionDate = formatShortDate(dateString);
  return nextSessionDate ? `Next session: ${nextSessionDate}` : 'Next session unavailable';
};

export const getClientSourceLabel = (source?: string | null): string => {
  switch (normalizeClientSource(source)) {
    case 'move_fitness':
      return 'Move Fitness tracking';
    case 'external':
      return 'External tracking';
    default:
      return 'SwanStudios paid';
  }
};

export const getMembershipColor = (level: string): string => {
  switch (level) {
    case 'elite':
      return 'var(--tier-elite, #FFD700)';
    case 'premium':
      return 'var(--tier-premium, #8b5cf6)';
    case 'basic':
      return 'var(--tier-basic, #3b82f6)';
    default:
      return 'var(--tier-default, #6b7280)';
  }
};

export const getMembershipBadgeStyle = (level: string): CSSProperties => {
  switch (level) {
    case 'elite':
      return {
        background: 'linear-gradient(135deg, var(--tier-elite, #FFD700), var(--tier-elite-secondary, #FFA500))',
        color: 'var(--text-on-gold, #000)',
      };
    case 'premium':
      return {
        background: 'linear-gradient(135deg, var(--tier-premium, #8b5cf6), var(--tier-premium-secondary, #a855f7))',
        color: 'var(--text-primary, #fff)',
      };
    case 'basic':
      return {
        background: 'linear-gradient(135deg, var(--tier-basic, #3b82f6), var(--tier-basic-secondary, #60a5fa))',
        color: 'var(--text-primary, #fff)',
      };
    default:
      return {
        background: 'var(--tier-default-bg, rgba(107, 114, 128, 0.8))',
        color: 'var(--text-primary, #fff)',
      };
  }
};

export const getTrainerClientIntent = (
  searchParams: URLSearchParams,
): TrainerClientIntent => {
  const intent = searchParams.get('intent');
  return intent === 'log_workout' ? intent : null;
};

export const parseTrainerClientManagementId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
