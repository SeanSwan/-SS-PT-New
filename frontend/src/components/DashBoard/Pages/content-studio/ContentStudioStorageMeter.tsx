/**
 * ContentStudioStorageMeter
 * =========================
 * Compact R2 storage + monthly-cost strip for the Content Studio header.
 *
 * Consumes GET /api/content-studio/storage-usage (Codex's lane, admin-only):
 *   { totalBytes, objectCount, estMonthlyUsd }
 *
 * GRACEFUL DEGRADE BY DESIGN: the endpoint may not be deployed yet, or may 403
 * for non-admin trainers. Any non-success (404 / 403 / network / bad shape)
 * self-hides the strip — it never renders a broken meter. So this can ship
 * before the backend endpoint lands and simply light up once it's live.
 *
 * Display only (no writes). Math/formatting lives in storageMeter.logic.ts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { HardDrive, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  parseStorageUsage,
  formatBytes,
  formatUsd,
  costTier,
  headroomHint,
  type StorageUsage,
  type CostTier,
} from './storageMeter.logic';

type Phase = 'loading' | 'ready' | 'hidden';

const ContentStudioStorageMeter: React.FC = () => {
  const { authAxios } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const aliveRef = useRef(true);
  // authAxios identity can change on every parent render; read it via a ref so
  // the mount effect runs exactly once and we don't refetch on every re-render.
  const axiosRef = useRef(authAxios);
  axiosRef.current = authAxios;

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await axiosRef.current.get('/api/content-studio/storage-usage');
      const parsed = parseStorageUsage(res?.data?.data ?? res?.data);
      if (!aliveRef.current) return;
      if (parsed) {
        setUsage(parsed);
        setPhase('ready');
      } else {
        setPhase('hidden'); // endpoint responded but shape is wrong -> don't show a broken meter
      }
    } catch {
      // 404 (not deployed) / 403 (non-admin) / network -> degrade silently
      if (aliveRef.current) setPhase('hidden');
    } finally {
      if (aliveRef.current && manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  if (phase === 'hidden') return null;

  if (phase === 'loading') {
    return <Strip aria-hidden="true" $tier="ok"><Skeleton /></Strip>;
  }

  const u = usage as StorageUsage;
  const tier = costTier(u.estMonthlyUsd);
  const hint = headroomHint(u);

  return (
    <Strip $tier={tier} role="status" aria-label="Content Studio R2 storage usage">
      <Lead>
        <HardDrive size={15} aria-hidden="true" />
        <Heading>R2 storage</Heading>
      </Lead>
      <Facts>
        <Fact>{formatBytes(u.totalBytes)}</Fact>
        <Dot aria-hidden="true">·</Dot>
        <Fact>{u.objectCount.toLocaleString()} clip{u.objectCount === 1 ? '' : 's'}</Fact>
        <Dot aria-hidden="true">·</Dot>
        <Cost $tier={tier}>~{formatUsd(u.estMonthlyUsd)}/mo</Cost>
      </Facts>
      {hint && <Hint>{hint}</Hint>}
      <Refresh
        type="button"
        onClick={() => load(true)}
        disabled={refreshing}
        aria-label="Refresh storage usage"
        title="Refresh storage usage"
      >
        <RefreshCw size={14} aria-hidden="true" className={refreshing ? 'spin' : undefined} />
      </Refresh>
    </Strip>
  );
};

export default ContentStudioStorageMeter;

const tierColor = (tier: CostTier) =>
  tier === 'high'
    ? 'var(--danger-text, #f87171)'
    : tier === 'watch'
      ? 'var(--color-gilded-fern, #C6A84B)'
      : 'var(--accent-primary, #60C0F0)';

const Strip = styled.div<{ $tier: CostTier }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin: 12px 24px 0;
  padding: 8px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid ${({ $tier }) => `color-mix(in srgb, ${tierColor($tier)} 26%, transparent)`};
  font-family: 'Sora', sans-serif;
`;

const Lead = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

const Heading = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const Facts = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
`;

const Fact = styled.span``;

const Dot = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const Cost = styled.span<{ $tier: CostTier }>`
  font-weight: 700;
  color: ${({ $tier }) => tierColor($tier)};
`;

const Hint = styled.span`
  flex: 1 1 100%;
  font-size: 0.68rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));

  @media (min-width: 768px) {
    flex: 0 1 auto;
  }
`;

const Refresh = styled.button`
  margin-left: auto;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  cursor: pointer;

  &:hover:not([disabled]) { color: var(--accent-primary, #60C0F0); }
  &:disabled { opacity: 0.5; cursor: progress; }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }

  .spin { animation: cs-storage-spin 0.8s linear infinite; }
  @keyframes cs-storage-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
`;

const Skeleton = styled.span`
  width: 180px;
  height: 16px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;
