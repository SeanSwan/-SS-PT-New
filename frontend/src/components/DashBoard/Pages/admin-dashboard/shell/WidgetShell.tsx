/**
 * WidgetShell
 * ─────────────────────────────────────────────────────────────
 * SWA-138 S1 — the mandatory chrome for admin Command Center
 * widgets. Kills the false-negative class at the root by forcing
 * three DISTINCT body states plus a stale-data notice:
 *
 *   loading (no data yet)  → skeleton   (never false zeros)
 *   error   (no data yet)  → explicit "Data unavailable" + Retry
 *   error   (stale data)   → children + "refresh failed" notice
 *   empty                  → explicit configurable empty copy
 *   otherwise              → children
 *
 * Header: title · "updated Xm ago" freshness · 44px refresh.
 * Blueprint: ADMIN-DASHBOARD-WIDGET-BLUEPRINT-2026-08-04 §3/§8.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { StyledBox } from '@/components/ui/StyledBox';
import { CommandCard } from '../AdminDashboardCards';
import WidgetSkeleton from '../components/WidgetSkeleton';
import {
  EmptyState,
  ErrorState,
  RefreshButton,
  RetryButton,
  ShellHeader,
  ShellMeta,
  ShellTitle,
  StaleNotice,
} from './WidgetShell.styles';

export interface WidgetShellProps {
  title: string;
  icon?: React.ReactNode;
  /** True only before the first settled fetch (usePolledFetch.loading). */
  loading: boolean;
  /** Failure message of the last attempt, or null. */
  error: string | null;
  /** True when the CURRENT data set has nothing to show. */
  empty: boolean;
  emptyMessage: string;
  /** Present when stale data exists despite `error`. */
  hasData?: boolean;
  lastUpdated?: Date | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  skeletonCount?: number;
  children?: React.ReactNode;
}

export const formatAgo = (from: Date, to: Date = new Date()): string => {
  const secs = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  if (secs < 60) return 'updated just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `updated ${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `updated ${hours}h ago`;
};

const WidgetShell: React.FC<WidgetShellProps> = ({
  title,
  icon,
  loading,
  error,
  empty,
  emptyMessage,
  hasData = false,
  lastUpdated = null,
  refreshing = false,
  onRefresh,
  onRetry,
  skeletonCount = 4,
  children,
}) => {
  const retry = onRetry ?? onRefresh;

  let body: React.ReactNode;
  if (loading && !hasData) {
    body = <WidgetSkeleton count={skeletonCount} />;
  } else if (error && !hasData) {
    body = (
      <ErrorState role="alert" aria-live="polite">
        <span>Data unavailable — {error}</span>
        {retry && (
          <RetryButton type="button" onClick={retry}>
            Retry
          </RetryButton>
        )}
      </ErrorState>
    );
  } else if (empty && !error) {
    body = <EmptyState>{emptyMessage}</EmptyState>;
  } else {
    body = (
      <>
        {error && (
          <StaleNotice role="status">
            Refresh failed — showing last known data. ({error})
          </StaleNotice>
        )}
        {children}
      </>
    );
  }

  return (
    <StyledBox
      as={CommandCard}
      $style={{ padding: '2rem', height: '100%', marginBottom: '1.5rem' }}
    >
      <ShellHeader>
        <ShellTitle>
          {icon}
          {title}
        </ShellTitle>
        {lastUpdated && !loading && (
          <ShellMeta aria-live="off">{formatAgo(lastUpdated)}</ShellMeta>
        )}
        {onRefresh && (
          <RefreshButton
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            aria-label={`Refresh ${title}`}
          >
            <RefreshCw size={18} aria-hidden="true" />
          </RefreshButton>
        )}
      </ShellHeader>
      {body}
    </StyledBox>
  );
};

export default WidgetShell;
