/**
 * ============================================================================
 * FILE: useAdminWaiversController.ts
 * PURPOSE: All state, data fetching and mutating actions for the admin waiver
 *          surface — extracted so AdminWaiversManager.tsx stays presentational
 *          and both files hold the 300-line cap (CLAUDE.md rule 4).
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Owns the list query (paging / status filter / debounced
 * search / activation deep-link), the detail modal fetches, and the approve
 * match / reject match / attach user mutations. Revoke stays in the manager —
 * see the note beside `handleRejectMatch` for why.
 *
 * ERROR CONTRACT — the reason this file exists in its current shape:
 * every one of the six request paths below reports to the admin through
 * `useAdminWaiverFeedback`. Before 2026-08-05 six of them caught their
 * rejection into `console.error` and returned, so a failed approve was
 * indistinguishable from a no-op. There are no silent catches here; if you add
 * a request, it reports.
 *
 * BACKEND: backend/routes/adminWaiverRoutes.mjs (all endpoints behind
 * `adminLimiter`, 50 req / 5 min → 429). Response contract and status→copy
 * mapping live in `adminWaiverFeedback.ts`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { useSearchParams } from 'react-router-dom';
import apiService from '../../../../services/api';
import type {
  WaiverRecordSummary, WaiverRecordDetail, BadgeLabel, WaiverStatus,
} from './adminWaivers.types';
import type { AdminWaiverConfirmRequest } from './AdminWaiverConfirmDialog';
import { useAdminWaiverFeedback } from './useAdminWaiverFeedback';
import { WAIVER_UNCHANGED } from './adminWaiverFeedback';
import { getWaiverActivationClientId, SEARCH_DEBOUNCE_MS } from './AdminWaiversManager.logic';

type SearchParams = ReturnType<typeof useSearchParams>[0];

export const useAdminWaiversController = (searchParams: SearchParams) => {
  const [records, setRecords] = useState<WaiverRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusFilter, setStatusFilter] = useState<WaiverStatus | ''>('');
  const [listFailed, setListFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationClientId = getWaiverActivationClientId(searchParams);

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<WaiverRecordDetail | null>(null);
  const [detailBadges, setDetailBadges] = useState<BadgeLabel[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  // Manual link + confirm
  const [linkRecordId, setLinkRecordId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<AdminWaiverConfirmRequest | null>(null);

  const { alerts, reportError, reportSuccess, dismissAlert } = useAdminWaiverFeedback();
  const listErrorAlertId = useRef<string | null>(null);

  // ── Search debounce ──────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  // ── Data fetch ───────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (activationClientId) params.set('clientId', activationClientId);

      const res = await apiService.get(`/api/admin/waivers?${params}`);
      const data = res.data?.data;
      setRecords(data?.records || []);
      setTotalPages(data?.pagination?.pages || 1);
      setTotalRecords(data?.pagination?.total || 0);
      setListFailed(false);
      // A successful reload makes the previous "could not load" banner false —
      // retract it rather than leaving a stale contradiction on screen.
      if (listErrorAlertId.current) {
        dismissAlert(listErrorAlertId.current);
        listErrorAlertId.current = null;
      }
    } catch (err) {
      // Do NOT blank the list here. Wiping records on failure renders the
      // "No waiver records found." empty state, which is exactly the false
      // reassurance WaiverSummaryWidget warns admins about. Keep whatever was
      // last known good, flag the failure, and say so on screen.
      setListFailed(true);
      listErrorAlertId.current = reportError(err, 'Load waiver records', WAIVER_UNCHANGED.list);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, activationClientId, reportError, dismissAlert]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  // ── Detail modal ─────────────────────────────────────────
  const openDetail = async (record: WaiverRecordSummary) => {
    try {
      const res = await apiService.get(`/api/admin/waivers/${record.id}`);
      setDetailRecord(res.data?.data?.record || null);
      setDetailBadges(res.data?.data?.badges || []);
      setShowDetail(true);
    } catch (err) {
      reportError(err, 'Open waiver detail', WAIVER_UNCHANGED.detail);
    }
  };

  const closeDetail = () => {
    setShowDetail(false);
    setDetailRecord(null);
  };

  const refreshDetail = async (id: number) => {
    try {
      const res = await apiService.get(`/api/admin/waivers/${id}`);
      setDetailRecord(res.data?.data?.record || null);
      setDetailBadges(res.data?.data?.badges || []);
    } catch (err) {
      reportError(err, 'Refresh waiver detail', WAIVER_UNCHANGED.detailRefresh);
    }
  };

  // ── Actions ──────────────────────────────────────────────
  const handleApproveMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/approve`);
      reportSuccess('Match approved — the waiver is now linked to that user.');
      fetchRecords();
      if (detailRecord) await refreshDetail(detailRecord.id);
    } catch (err) {
      reportError(err, 'Approve match', WAIVER_UNCHANGED.approve);
    }
  };

  const handleRejectMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/reject`);
      reportSuccess('Match rejected — the waiver was not linked to that user.');
      fetchRecords();
      if (detailRecord) await refreshDetail(detailRecord.id);
    } catch (err) {
      reportError(err, 'Reject match', WAIVER_UNCHANGED.reject);
    }
  };

  /*
   * NOTE: `handleRevoke` deliberately lives in AdminWaiversManager.tsx, not
   * here. `AdminWaiversManager.confirmationContract.test.ts` reads that file's
   * source and asserts the revoke endpoint sits next to the branded
   * confirmation dialog — the guarantee being that revocation can never
   * regress to a browser-native confirm. Moving it here would void that
   * contract test. This hook supplies the pieces it needs instead.
   */

  const handleManualLink = async (recordId: number, userId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/${recordId}/attach-user`, { userId });
      reportSuccess('User attached — the waiver is now linked to that client.');
      setLinkRecordId(null);
      fetchRecords();
      closeDetail();
    } catch (err) {
      // The link modal stays open on failure so the admin can retry or pick
      // a different user without re-navigating.
      reportError(err, 'Attach user to waiver', WAIVER_UNCHANGED.attach);
    }
  };

  // ── Derived ──────────────────────────────────────────────
  const pendingCount = records.filter((r) => r.status === 'pending_match').length;
  const showPendingAlert = statusFilter === '' && pendingCount > 0;

  return {
    records, loading, page, setPage, totalPages, totalRecords,
    statusFilter, setStatusFilter, listFailed,
    search, handleSearchChange,
    detailRecord, detailBadges, showDetail, closeDetail, openDetail,
    linkRecordId, setLinkRecordId,
    confirmRequest, setConfirmRequest,
    alerts, dismissAlert, reportError, reportSuccess,
    fetchRecords,
    handleApproveMatch, handleRejectMatch, handleManualLink,
    pendingCount, showPendingAlert,
  };
};

export default useAdminWaiversController;
