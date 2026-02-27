import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../../../services/api';
import type {
  WaiverRecordSummary, WaiverRecordDetail, BadgeLabel, WaiverStatus,
} from './adminWaivers.types';
import {
  Container, Header, Title, FilterBar, FilterSelect, SearchInput,
  PaginationRow, PageButton, LoadingState,
} from './adminWaivers.styles';
import AdminWaiversTable from './AdminWaiversTable';
import AdminWaiverDetailModal from './AdminWaiverDetailModal';
import AdminManualLinkModal from './AdminManualLinkModal';

const AdminWaiversManager: React.FC = () => {
  const [records, setRecords] = useState<WaiverRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<WaiverStatus | ''>('');
  const [search, setSearch] = useState('');

  // Detail modal
  const [detailRecord, setDetailRecord] = useState<WaiverRecordDetail | null>(null);
  const [detailBadges, setDetailBadges] = useState<BadgeLabel[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  // Manual link modal
  const [linkRecordId, setLinkRecordId] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiService.get(`/api/admin/waivers?${params}`);
      const data = res.data?.data;
      setRecords(data?.records || []);
      setTotalPages(data?.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to fetch waiver records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

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

  const handleApproveMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/approve`);
      fetchRecords();
      if (detailRecord) {
        // Re-fetch detail to update
        const res = await apiService.get(`/api/admin/waivers/${detailRecord.id}`);
        setDetailRecord(res.data?.data?.record || null);
        setDetailBadges(res.data?.data?.badges || []);
      }
    } catch (err) {
      console.error('Failed to approve match:', err);
    }
  };

  const handleRejectMatch = async (matchId: number) => {
    try {
      await apiService.post(`/api/admin/waivers/matches/${matchId}/reject`);
      fetchRecords();
      if (detailRecord) {
        const res = await apiService.get(`/api/admin/waivers/${detailRecord.id}`);
        setDetailRecord(res.data?.data?.record || null);
        setDetailBadges(res.data?.data?.badges || []);
      }
    } catch (err) {
      console.error('Failed to reject match:', err);
    }
  };

  const handleRevoke = async (recordId: number) => {
    if (!window.confirm('Are you sure you want to revoke this waiver? This cannot be undone.')) return;
    try {
      await apiService.post(`/api/admin/waivers/${recordId}/revoke`);
      fetchRecords();
      closeDetail();
    } catch (err) {
      console.error('Failed to revoke waiver:', err);
    }
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

  return (
    <Container>
      <Header>
        <Title>Waiver Management</Title>
        <FilterBar>
          <SearchInput
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WaiverStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="pending_match">Pending Match</option>
            <option value="linked">Linked</option>
            <option value="superseded">Superseded</option>
            <option value="revoked">Revoked</option>
          </FilterSelect>
        </FilterBar>
      </Header>

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
    </Container>
  );
};

export default AdminWaiversManager;
