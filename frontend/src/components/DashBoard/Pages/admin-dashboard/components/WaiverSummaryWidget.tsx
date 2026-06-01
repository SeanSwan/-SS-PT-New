/**
 * ============================================================================
 * FILE: WaiverSummaryWidget.tsx
 * PURPOSE: Admin dashboard bento widget - recent waivers + pending count
 * ============================================================================
 *
 * Displays the five most recent waiver records with status pills and a
 * pending-match count badge. Clicking a row or "View All Waivers" navigates to
 * the full waiver manager at /dashboard/admin/waivers.
 *
 * API: GET /api/admin/waivers?page=1&limit=5
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, FileSignature, RefreshCw } from 'lucide-react';
import apiService from '../../../../../services/api';
import type { WaiverRecordSummary } from '../../admin-waivers/adminWaivers.types';
import {
  CenteredMsg,
  ErrorMsg,
  PendingBadge,
  RecordDate,
  RecordList,
  RecordName,
  RecordRight,
  RecordRow,
  RefreshBtn,
  StatusPill,
  TitleRow,
  ViewAllBtn,
  Widget,
  WidgetHeader,
  WidgetTitle,
} from './WaiverSummaryWidget.styles';

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

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
            <RecordRow key={r.id} onClick={goToWaivers} aria-label={`Open waivers - ${r.fullName}`}>
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
