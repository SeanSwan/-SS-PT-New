/**
 * ============================================================================
 * FILE: WaiverSummaryWidget.tsx
 * PURPOSE: Admin dashboard bento widget — recent waivers + pending count
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-12
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays the 5 most recent waiver records with
 * status pills and a pending-match count badge. Clicking any row or
 * "View All Waivers" navigates to the full waiver manager.
 *
 * HOW IT FITS IN THE APP:
 *   AdminOverviewPanel (BentoThird) → WaiverSummaryWidget
 *   Full manager lives at /dashboard/admin/waivers
 *
 * API: GET /api/admin/waivers?page=1&limit=5
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, RefreshCw, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import styled from 'styled-components';
import { CommandCard } from '../AdminDashboardCards';
import apiService from '../../../../../services/api';
import type { WaiverRecordSummary } from '../../admin-waivers/adminWaivers.types';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Widget = styled(CommandCard)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 280px;
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WidgetTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const PendingBadge = styled.span<{ $urgent: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  background: ${({ $urgent }) =>
    $urgent ? 'rgba(198, 168, 75, 0.15)' : 'rgba(96, 192, 240, 0.12)'};
  color: ${({ $urgent }) => ($urgent ? '#E5C76B' : '#7DD3FC')};
  border: 1px solid ${({ $urgent }) =>
    $urgent ? 'rgba(198, 168, 75, 0.3)' : 'rgba(96, 192, 240, 0.25)'};
  white-space: nowrap;

  & > svg {
    width: 11px;
    height: 11px;
    stroke-width: 2.5px;
  }
`;

const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: #4070C0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: #60C0F0;
    background: rgba(96, 192, 240, 0.05);
    border-color: rgba(96, 192, 240, 0.2);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const RecordList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
`;

const RecordRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.025);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.07);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const RecordName = styled.span`
  font-size: 0.84rem;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
`;

const RecordRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const RecordDate = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: rgba(255, 255, 255, 0.38);
  white-space: nowrap;
`;

const StatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.64rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 9px;
  white-space: nowrap;
  background: ${({ $status }) =>
    $status === 'pending_match' ? 'rgba(198, 168, 75, 0.12)' :
    $status === 'linked' ? 'rgba(96, 192, 240, 0.12)' :
    'rgba(139, 92, 246, 0.12)'};
  color: ${({ $status }) =>
    $status === 'pending_match' ? '#E5C76B' :
    $status === 'linked' ? '#7DD3FC' :
    '#A78BFA'};
  border: 1px solid ${({ $status }) =>
    $status === 'pending_match' ? 'rgba(198, 168, 75, 0.2)' :
    $status === 'linked' ? 'rgba(96, 192, 240, 0.2)' :
    'rgba(139, 92, 246, 0.2)'};

  & > svg {
    width: 10px;
    height: 10px;
    stroke-width: 2.5px;
  }
`;

const ViewAllBtn = styled.button`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 10px;
  background: #002060;
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #E0ECF4;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    background: #1a3a7a;
    background: color-mix(in srgb, #002060 80%, #8B5CF6 20%);
    border-color: #8B5CF6;
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

const CenteredMsg = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.28);
  font-size: 0.84rem;
`;

const ErrorMsg = styled(CenteredMsg)`
  color: var(--warning, #E5C76B);
  text-align: center;
  line-height: 1.4;
  padding: 0.5rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const WaiverSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<WaiverRecordSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const res = await apiService.get('/api/admin/waivers?page=1&limit=5');
      const data = res.data?.data;
      setRecords(data?.records || []);
      setTotal(data?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch waiver summary:', err);
      setRecords([]);
      setTotal(0);
      setLoadError('Waiver data unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const pendingCount = records.filter((r) => r.status === 'pending_match').length;
  const goToWaivers = () => navigate('/dashboard/admin/waivers');

  return (
    <Widget>
      <WidgetHeader>
        <TitleRow>
          <FileSignature size={16} color="var(--accent-primary, #60C0F0)" />
          <WidgetTitle>Waivers</WidgetTitle>
          <PendingBadge $urgent={pendingCount > 0}>
            {pendingCount > 0 ? <Clock /> : <CheckCircle2 />}
            {pendingCount > 0 ? `${pendingCount} pending` : `${total} total`}
          </PendingBadge>
        </TitleRow>
        <RefreshBtn
          onClick={fetchRecent}
          disabled={loading}
          aria-label="Refresh waivers"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </RefreshBtn>
      </WidgetHeader>

      {loading ? (
        <CenteredMsg>Loading...</CenteredMsg>
      ) : loadError ? (
        <ErrorMsg role="alert">
          Waiver data unavailable. Open the full manager before assuming there are no waivers.
        </ErrorMsg>
      ) : records.length === 0 ? (
        <CenteredMsg>No waivers yet</CenteredMsg>
      ) : (
        <RecordList>
          {records.map((r) => (
            <RecordRow key={r.id} onClick={goToWaivers} aria-label={`Open waivers — ${r.fullName}`}>
              <RecordName>{r.fullName}</RecordName>
              <RecordRight>
                <RecordDate>{fmtDate(r.signedAt)}</RecordDate>
                <StatusPill $status={r.status}>
                  {r.status === 'pending_match' ? <Clock /> :
                   r.status === 'linked' ? <CheckCircle2 /> :
                   <AlertCircle />}
                  {r.status === 'pending_match' ? 'Pending' :
                   r.status === 'linked' ? 'Linked' :
                   r.status}
                </StatusPill>
              </RecordRight>
            </RecordRow>
          ))}
        </RecordList>
      )}

      <ViewAllBtn onClick={goToWaivers} aria-label="View all waivers">
        <span>View All Waivers</span>
        <ChevronRight size={14} />
      </ViewAllBtn>
    </Widget>
  );
};

export default WaiverSummaryWidget;
