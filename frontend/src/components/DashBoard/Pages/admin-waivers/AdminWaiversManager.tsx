/**
 * ============================================================================
 * FILE: AdminWaiversManager.tsx
 * PURPOSE: Admin waiver management — list, filter, detail, match/link/revoke
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the waiver management surface for admin ops.
 * Presentation only — the list query, detail fetches and the four mutating
 * actions live in `useAdminWaiversController`, which reports every failure to
 * the admin through `useAdminWaiverFeedback`. This surface has no silent
 * catches.
 *
 * HOW IT FITS IN THE APP:
 *   UniversalDashboardLayout → /dashboard/admin/waivers → AdminWaiversManager
 *   Nav registration: `frontend/src/config/dashboard-tabs.ts:175` (id
 *   `waivers`, section `clients`, prefix `/dashboard/admin/waivers`). It is
 *   NOT registered in AdminStellarSidebar.tsx — that file contains zero waiver
 *   references; an earlier version of this header claimed otherwise.
 *
 *
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: AdminWaiversManager                               ║
 * ║  PURPOSE: Waiver ops panel — list + filter + detail + actions ║
 * ║  OWNER: Claude Sonnet 4.6                                     ║
 * ║  LAST VALIDATED: 2026-08-05                                   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import apiService from '../../../../services/api';
import { WAIVER_UNCHANGED } from './adminWaiverFeedback';
import {
  Container, Header, Title, FilterBar, SearchInput,
  PaginationRow, PageButton, LoadingState, ErrorState,
  QuickFilters, QuickFilterChip, StatsRow, StatItem, RefreshBtn,
} from './adminWaivers.styles';
import AdminWaiverAlerts from './AdminWaiverAlerts';
import AdminWaiversTable from './AdminWaiversTable';
import AdminWaiverDetailModal from './AdminWaiverDetailModal';
import AdminManualLinkModal from './AdminManualLinkModal';
import AdminWaiverConfirmDialog from './AdminWaiverConfirmDialog';
import { QUICK_FILTERS } from './AdminWaiversManager.logic';
import { useAdminWaiversController } from './useAdminWaiversController';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const AdminWaiversManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
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
  } = useAdminWaiversController(searchParams);

  // The list is empty AND the request that produced it failed — an empty
  // table here would be a lie (see WaiverSummaryWidget's warning).
  const listUnavailable = listFailed && records.length === 0;

  /*
   * Revocation stays in this file on purpose: AdminWaiversManager.
   * confirmationContract.test.ts reads this source and asserts the revoke call
   * sits beside the branded confirmation layer, so it can never regress to a
   * browser-native confirm. Keep the endpoint and `setConfirmRequest` here.
   */
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
          reportSuccess('Waiver revoked — it is no longer in operational use.');
          fetchRecords();
          closeDetail();
        } catch (err) {
          reportError(err, 'Revoke waiver', WAIVER_UNCHANGED.revoke);
          // Rethrow so the confirm dialog stays open on the failed action.
          throw err;
        }
      },
    });
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <Container>
      <Header>
        <StyledBox as="div" $style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Title>Waiver Management</Title>
          {!loading && totalRecords > 0 && (
            <StatsRow>
              <StatItem>{totalRecords} total</StatItem>
              {showPendingAlert && (
                <StatItem $urgent>{pendingCount} pending</StatItem>
              )}
            </StatsRow>
          )}
        </StyledBox>
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

      <AdminWaiverAlerts alerts={alerts} onDismiss={dismissAlert} />

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

      {loading && <LoadingState>Loading waiver records...</LoadingState>}

      {!loading && listUnavailable && (
        <ErrorState>
          Waiver records could not be loaded, so this list is empty because the
          request failed — not because there are no waivers. Use Refresh to try
          again.
        </ErrorState>
      )}

      {!loading && !listUnavailable && (
        <AdminWaiversTable records={records} onView={openDetail} />
      )}

      {totalPages > 1 && (
        <PaginationRow>
          <PageButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </PageButton>
          <StyledBox as="span" $style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))', fontSize: '0.85rem' }}>
            Page {page} of {totalPages}
          </StyledBox>
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
