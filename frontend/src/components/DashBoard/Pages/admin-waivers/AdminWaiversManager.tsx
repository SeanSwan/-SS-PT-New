/**
 * ============================================================================
 * FILE: AdminWaiversManager.tsx
 * PURPOSE: Admin waiver management — list, filter, detail, match/link/revoke
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-04-12
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the waiver management surface for admin ops.
 * Fetches waiver records, supports quick-filter chips and debounced search,
 * opens a detail modal (approve/reject matches, revoke, manual link).
 *
 * HOW IT FITS IN THE APP:
 *   UniversalDashboardLayout → /dashboard/admin/waivers → AdminWaiversManager
 *   Also reachable via sidebar "Waivers" workspace item.
 *
 *
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AdminWaiversManager                               ║
 * ║  PURPOSE: Waiver ops panel — list + filter + detail + actions ║
 * ║  OWNER: Claude Sonnet 4.6                                     ║
 * ║  LAST VALIDATED: 2026-04-12                                   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import apiService from '../../../../services/api';
import type {
  WaiverRecordSummary, WaiverRecordDetail, BadgeLabel, WaiverStatus,
} from './adminWaivers.types';
import {
  Container, Header, Title, FilterBar, SearchInput,
  PaginationRow, PageButton, LoadingState,
  QuickFilters, QuickFilterChip, StatsRow, StatItem, RefreshBtn,
} from './adminWaivers.styles';
import AdminWaiversTable from './AdminWaiversTable';
import AdminWaiverDetailModal from './AdminWaiverDetailModal';
import AdminManualLinkModal from './AdminManualLinkModal';
import AdminWaiverConfirmDialog, { type AdminWaiverConfirmRequest } from './AdminWaiverConfirmDialog';
import {
  getWaiverActivationClientId,
  QUICK_FILTERS,
  SEARCH_DEBOUNCE_MS,
} from './AdminWaiversManager.logic';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const AdminWaiversManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<WaiverRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusFilter, setStatusFilter] = useState<WaiverStatus | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activationClientId = getWaiverActivationClientId(searchParams);

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<WaiverRecordDetail | null>(null);
  const [detailBadges, setDetailBadges] = useState<BadgeLabel[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  // Manual link modal
  const [linkRecordId, setLinkRecordId] = useState<number | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<AdminWaiverConfirmRequest | null>(null);

  // ── Search debounce ──────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), SEARCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
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
    } catch (err) {
      console.error('Failed to fetch waiver records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, activationClientId]);

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
      console.error('Failed to fetch waiver detail:', err);
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
      console.error('Failed to refresh waiver detail:', err);
    }
  };

  // ── Actions ──────────────────────────────────────────────
  const handleApproveMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/approve`);
      fetchRecords();
      if (detailRecord) await refreshDetail(detailRecord.id);
    } catch (err) {
      console.error('Failed to approve match:', err);
    }
  };

  const handleRejectMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/reject`);
      fetchRecords();
      if (detailRecord) await refreshDetail(detailRecord.id);
    } catch (err) {
      console.error('Failed to reject match:', err);
    }
  };

  const handleRevoke = (recordId: number) => {
    setConfirmRequest({
      title: 'Revoke this waiver?',
      message: 'This removes the active waiver/consent record from operational use and cannot be undone.',
      confirmLabel: 'Revoke waiver',
      cancelLabel: 'Keep waiver active',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await apiService.post(`/api/admin/waivers/${recordId}/revoke`);
          fetchRecords();
          closeDetail();
        } catch (err) {
          console.error('Failed to revoke waiver:', err);
          throw err;
        }
      },
    });
  };

  const handleManualLink = async (recordId: number, userId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/${recordId}/attach-user`, { userId });
      setLinkRecordId(null);
      fetchRecords();
      closeDetail();
    } catch (err) {
      console.error('Failed to attach user:', err);
    }
  };

  // ── Derived stats ────────────────────────────────────────
  const pendingCount = records.filter((r) => r.status === 'pending_match').length;
  const showPendingAlert = statusFilter === '' && pendingCount > 0;

  // ── Render ───────────────────────────────────────────────
  return (
    <Container>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Title>Waiver Management</Title>
          {!loading && totalRecords > 0 && (
            <StatsRow>
              <StatItem>{totalRecords} total</StatItem>
              {showPendingAlert && (
                <StatItem $urgent>{pendingCount} pending</StatItem>
              )}
            </StatsRow>
          )}
        </div>
        <FilterBar>
          <SearchInput
            placeholder="Search name, email, phone..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Search waivers"
          />
          <RefreshBtn
            onClick={fetchRecords}
            aria-label="Refresh waiver list"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={16} />
          </RefreshBtn>
        </FilterBar>
      </Header>

      <QuickFilters role="group" aria-label="Filter waivers by status">
        {QUICK_FILTERS.map((f) => (
          <QuickFilterChip
            key={f.value}
            $active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
            aria-pressed={statusFilter === f.value}
          >
            {f.label}
          </QuickFilterChip>
        ))}
      </QuickFilters>

      {loading ? (
        <LoadingState>Loading waiver records...</LoadingState>
      ) : (
        <AdminWaiversTable records={records} onView={openDetail} />
      )}

      {totalPages > 1 && (
        <PaginationRow>
          <PageButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </PageButton>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            Page {page} of {totalPages}
          </span>
          <PageButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </PageButton>
        </PaginationRow>
      )}

      {showDetail && (
        <AdminWaiverDetailModal
          record={detailRecord}
          badges={detailBadges}
          onClose={closeDetail}
          onApproveMatch={handleApproveMatch}
          onRejectMatch={handleRejectMatch}
          onRevoke={handleRevoke}
          onOpenManualLink={(id) => {
            closeDetail();
            setLinkRecordId(id);
          }}
        />
      )}

      <AdminManualLinkModal
        recordId={linkRecordId}
        onClose={() => setLinkRecordId(null)}
        onAttach={handleManualLink}
      />

      <AdminWaiverConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
    </Container>
  );
};

export default AdminWaiversManager;
