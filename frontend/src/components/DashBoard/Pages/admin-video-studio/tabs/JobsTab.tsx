/**
 * JobsTab.tsx
 * ===========
 * BullMQ job status dashboard.
 * Filterable table with auto-refresh toggle (polls every 10s).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Cpu,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

// ─── Types ───────────────────────────────────────────
interface Job {
  id: string | number;
  jobType: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  attempts: number;
  error?: string;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div``;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
`;

const FilterSelect = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 13px;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #0a0a1a;
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.3)')};
  background: ${(p) =>
    p.$active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(30, 58, 138, 0.15)'};
  color: ${(p) => (p.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)')};
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(30, 58, 138, 0.15);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    color: #00ffff;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const TableWrap = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(59, 130, 246, 0.08);
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  background: ${(p) => {
    switch (p.$status) {
      case 'completed':
        return 'rgba(34, 197, 94, 0.2)';
      case 'active':
        return 'rgba(59, 130, 246, 0.2)';
      case 'waiting':
      case 'delayed':
        return 'rgba(234, 179, 8, 0.2)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(107, 114, 128, 0.2)';
    }
  }};
  color: ${(p) => {
    switch (p.$status) {
      case 'completed':
        return '#22c55e';
      case 'active':
        return '#3b82f6';
      case 'waiting':
      case 'delayed':
        return '#eab308';
      case 'failed':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  }};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const JobTypeBadge = styled.span`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(120, 81, 169, 0.4);
  color: white;
`;

const EmptyRow = styled.td`
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
`;

const AutoRefreshIndicator = styled.span`
  font-size: 12px;
  color: rgba(0, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 4px;

  svg {
    width: 12px;
    height: 12px;
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// ─── Status icon helper ─────────────────────────────
const statusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle />;
    case 'active':
      return <Loader2 />;
    case 'waiting':
    case 'delayed':
      return <Clock />;
    case 'failed':
      return <XCircle />;
    default:
      return <AlertTriangle />;
  }
};

const formatDate = (d: string | null) => {
  if (!d) return '--';
  const date = new Date(d);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Component ───────────────────────────────────────
const JobsTab: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (jobTypeFilter) params.set('jobType', jobTypeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      const data = await fetchWithAuth(`/api/v2/admin/video-jobs${qs ? `?${qs}` : ''}`);
      setJobs(data.jobs || data.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [jobTypeFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchJobs, 10_000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchJobs]);

  // Derive unique job types for filter dropdown
  const jobTypes = Array.from(new Set(jobs.map((j) => j.jobType).filter(Boolean)));

  return (
    <Container>
      <TopBar>
        <FilterGroup>
          <FilterSelect value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)}>
            <option value="">All Job Types</option>
            {jobTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            {/* Fallback options if no jobs loaded yet */}
            {jobTypes.length === 0 && (
              <>
                <option value="youtube_import">youtube_import</option>
                <option value="video_transcode">video_transcode</option>
                <option value="thumbnail_generate">thumbnail_generate</option>
                <option value="playlist_import">playlist_import</option>
              </>
            )}
          </FilterSelect>

          <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="waiting">Waiting</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="delayed">Delayed</option>
          </FilterSelect>
        </FilterGroup>

        <ToggleButton $active={autoRefresh} onClick={() => setAutoRefresh((p) => !p)}>
          {autoRefresh ? <ToggleRight /> : <ToggleLeft />}
          Auto-refresh
          {autoRefresh && (
            <AutoRefreshIndicator>
              <RefreshCw />
            </AutoRefreshIndicator>
          )}
        </ToggleButton>

        <RefreshButton onClick={fetchJobs} title="Refresh now">
          <RefreshCw />
        </RefreshButton>
      </TopBar>

      {loading ? (
        <LoadingText>Loading jobs...</LoadingText>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Job Type</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Started</Th>
                <Th>Completed</Th>
                <Th>Attempts</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <EmptyRow colSpan={7}>No jobs found. Import a video or playlist to create jobs.</EmptyRow>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <Td style={{ fontFamily: 'monospace', fontSize: 13 }}>{job.id}</Td>
                    <Td>
                      <JobTypeBadge>{job.jobType}</JobTypeBadge>
                    </Td>
                    <Td>
                      <StatusBadge $status={job.status}>
                        {statusIcon(job.status)}
                        {job.status}
                      </StatusBadge>
                    </Td>
                    <Td>{formatDate(job.createdAt)}</Td>
                    <Td>{formatDate(job.startedAt)}</Td>
                    <Td>{formatDate(job.completedAt)}</Td>
                    <Td>{job.attempts}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Container>
  );
};

export default JobsTab;
