/**
 * MovementAnalysisListPage.tsx
 * ============================
 * Admin listing page for all movement analyses.
 * Paginated table with search, filters, and pending match indicators.
 *
 * Phase 13 — Movement Analysis System
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Activity, Plus, Search, Clock, CheckCircle, Link2,
  Archive, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { device } from '../../../../styles/breakpoints';

// ── Styled Components ─────────────────────────────────────────────

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  ${device.md} { padding: 24px; }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  svg { color: ${({ theme }) => theme.colors?.accent || '#00FFFF'}; }
`;

const NewButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  background: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  color: #000;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  &:hover { opacity: 0.9; }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.3);
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.2)'};
  border-radius: 12px;
  padding: 0 14px;
  margin-bottom: 20px;
  svg { color: rgba(255,255,255,0.4); flex-shrink: 0; }
  input {
    flex: 1;
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.text?.primary || '#fff'};
    font-size: 15px;
    padding: 12px 0;
    min-height: 44px;
    &:focus { outline: none; }
    &::placeholder { color: rgba(255,255,255,0.3); }
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ $active, theme }) => $active ? (theme.colors?.accent || '#00FFFF') : 'rgba(255,255,255,0.15)'};
  background: ${({ $active }) => $active ? 'rgba(0,255,255,0.15)' : 'transparent'};
  color: ${({ $active }) => $active ? '#fff' : 'rgba(255,255,255,0.6)'};
  font-size: 13px;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Table = styled.div`
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.1)'};
`;

const TableRow = styled.div<{ $header?: boolean }>`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 80px;
  gap: 12px;
  padding: 14px 20px;
  align-items: center;
  background: ${({ $header }) => $header ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'};
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: ${({ $header }) => $header ? '12px' : '14px'};
  font-weight: ${({ $header }) => $header ? '600' : '400'};
  color: ${({ $header }) => $header ? 'rgba(255,255,255,0.5)' : '#fff'};
  text-transform: ${({ $header }) => $header ? 'uppercase' : 'none'};
  letter-spacing: ${({ $header }) => $header ? '0.5px' : '0'};
  cursor: ${({ $header }) => $header ? 'default' : 'pointer'};
  min-height: 44px;
  ${({ $header }) => !$header && `
    &:hover { background: rgba(0,255,255,0.05); }
  `}

  @media (max-width: 768px) {
    grid-template-columns: 1fr 80px 80px;
    & > *:nth-child(4),
    & > *:nth-child(2) { display: none; }
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $status }) =>
    $status === 'draft' ? 'rgba(255,184,51,0.15)' :
    $status === 'completed' ? 'rgba(34,197,94,0.15)' :
    $status === 'linked' ? 'rgba(0,255,255,0.15)' :
    'rgba(255,255,255,0.1)'};
  color: ${({ $status }) =>
    $status === 'draft' ? '#FFB833' :
    $status === 'completed' ? '#22C55E' :
    $status === 'linked' ? '#00FFFF' :
    'rgba(255,255,255,0.5)'};
`;

const MatchBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(255,100,50,0.2);
  color: #FF8844;
  margin-left: 8px;
`;

const ScorePill = styled.span<{ $color: string }>`
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
`;

const PageBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255,255,255,0.5);
  svg { color: rgba(255,255,255,0.2); margin-bottom: 16px; }
`;

// ── Component ─────────────────────────────────────────────────────

interface AnalysisRow {
  id: number;
  fullName: string;
  email: string;
  status: string;
  nasmAssessmentScore: number | null;
  assessmentDate: string;
  conductor?: { firstName: string; lastName: string };
  pendingMatches?: { id: number }[];
}

const MovementAnalysisListPage: React.FC = () => {
  const navigate = useNavigate();
  const { authAxios } = useAuth() as any;
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    if (!authAxios) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await authAxios.get(`/api/movement-analysis?${params}`);
      if (res.data?.success) {
        setAnalyses(res.data.data.analyses);
        setTotalPages(res.data.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setLoading(false);
    }
  }, [authAxios, page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#888';
    if (score >= 80) return '#33CC66';
    if (score >= 60) return '#FFB833';
    return '#FF3333';
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'draft': return <Clock size={12} />;
      case 'completed': return <CheckCircle size={12} />;
      case 'linked': return <Link2 size={12} />;
      case 'archived': return <Archive size={12} />;
      default: return null;
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title><Activity size={24} /> Movement Analyses</Title>
        <NewButton onClick={() => navigate('/dashboard/people/movement-screen/new')}>
          <Plus size={18} /> New Assessment
        </NewButton>
      </Header>

      <SearchBar>
        <Search size={18} />
        <input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </SearchBar>

      <FilterRow>
        {['', 'draft', 'completed', 'linked', 'archived'].map((f) => (
          <FilterChip key={f} $active={statusFilter === f} onClick={() => { setStatusFilter(f); setPage(1); }}>
            {f ? statusIcon(f) : null}
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
          </FilterChip>
        ))}
      </FilterRow>

      <Table>
        <TableRow $header>
          <span>Name</span>
          <span>Date</span>
          <span>Status</span>
          <span>Score</span>
          <span>Conductor</span>
        </TableRow>
        {loading ? (
          <TableRow><span style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Loading...</span></TableRow>
        ) : analyses.length === 0 ? (
          <EmptyState>
            <Activity size={48} />
            <div>No movement analyses found</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Start a new assessment to see it here</div>
          </EmptyState>
        ) : analyses.map((a) => (
          <TableRow key={a.id} onClick={() => navigate(`/dashboard/people/movement-screen/${a.id}`)}>
            <span>
              {a.fullName}
              {(a.pendingMatches?.length || 0) > 0 && (
                <MatchBadge><AlertCircle size={10} /> {a.pendingMatches!.length} match</MatchBadge>
              )}
            </span>
            <span>{new Date(a.assessmentDate).toLocaleDateString()}</span>
            <span><StatusBadge $status={a.status}>{statusIcon(a.status)} {a.status}</StatusBadge></span>
            <span>
              {a.nasmAssessmentScore !== null ? (
                <ScorePill $color={getScoreColor(a.nasmAssessmentScore)}>{a.nasmAssessmentScore}/100</ScorePill>
              ) : '—'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {a.conductor ? `${a.conductor.firstName} ${a.conductor.lastName?.[0] || ''}.` : '—'}
            </span>
          </TableRow>
        ))}
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /></PageBtn>
          <span style={{ fontSize: 14 }}>Page {page} of {totalPages}</span>
          <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={18} /></PageBtn>
        </Pagination>
      )}
    </PageContainer>
  );
};

export default MovementAnalysisListPage;
