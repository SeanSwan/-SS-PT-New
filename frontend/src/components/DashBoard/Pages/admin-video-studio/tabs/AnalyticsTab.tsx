/**
 * AnalyticsTab.tsx
 * ================
 * Video analytics dashboard with overview stats cards,
 * top content table, and YouTube outbound CTR table.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Film,
  Eye,
  FileEdit,
  Archive,
  FolderOpen,
  TrendingUp,
  ExternalLink,
  BarChart3,
  RefreshCw,
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
interface OverviewStats {
  totalVideos: number;
  published: number;
  draft: number;
  archived: number;
  totalViews: number;
  totalCollections: number;
}

interface TopVideo {
  id: number;
  title: string;
  viewCount: number;
  completionRate: number;
  source: string;
}

interface OutboundRow {
  videoId: number;
  title: string;
  outboundClicks: number;
  ctr: number;
  ctaStrategy: string;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
`;

const StatCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${(p) => p.$color || 'rgba(59, 130, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
    color: white;
  }
`;

const StatValue = styled.span`
  font-size: 28px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
`;

const StatLabel = styled.span`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
`;

const Section = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 20px;
    height: 20px;
    color: #00ffff;
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
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
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
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
`;

const ProgressBar = styled.div`
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, #3b82f6, #00ffff);
  border-radius: 3px;
`;

const SourceBadge = styled.span<{ $yt?: boolean }>`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => (p.$yt ? 'rgba(255, 0, 0, 0.6)' : 'rgba(59, 130, 246, 0.6)')};
  color: white;
`;

const StrategyBadge = styled.span`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(120, 81, 169, 0.5);
  color: white;
`;

const EmptyRow = styled.td`
  padding: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
`;

// ─── Component ───────────────────────────────────────
const AnalyticsTab: React.FC = () => {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [outbound, setOutbound] = useState<OutboundRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, topData, outboundData] = await Promise.all([
        fetchWithAuth('/api/v2/admin/video-analytics/overview'),
        fetchWithAuth('/api/v2/admin/video-analytics/top'),
        fetchWithAuth('/api/v2/admin/video-analytics/outbound'),
      ]);
      setOverview(
        overviewData.data || {
          totalVideos: overviewData.totalVideos || 0,
          published: overviewData.published || 0,
          draft: overviewData.draft || 0,
          archived: overviewData.archived || 0,
          totalViews: overviewData.totalViews || 0,
          totalCollections: overviewData.totalCollections || 0,
        }
      );
      setTopVideos(topData.data || topData.videos || []);
      setOutbound(outboundData.data || outboundData.rows || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return <LoadingText>Loading analytics...</LoadingText>;
  }

  const stats = overview || {
    totalVideos: 0,
    published: 0,
    draft: 0,
    archived: 0,
    totalViews: 0,
    totalCollections: 0,
  };

  const statCards = [
    { label: 'Total Videos', value: stats.totalVideos, icon: <Film />, color: 'rgba(59, 130, 246, 0.3)' },
    { label: 'Published', value: stats.published, icon: <Eye />, color: 'rgba(34, 197, 94, 0.3)' },
    { label: 'Draft', value: stats.draft, icon: <FileEdit />, color: 'rgba(234, 179, 8, 0.3)' },
    { label: 'Archived', value: stats.archived, icon: <Archive />, color: 'rgba(107, 114, 128, 0.3)' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: <TrendingUp />, color: 'rgba(0, 255, 255, 0.2)' },
    { label: 'Collections', value: stats.totalCollections, icon: <FolderOpen />, color: 'rgba(120, 81, 169, 0.3)' },
  ];

  return (
    <Container>
      {/* Overview Stats */}
      <StatsGrid>
        {statCards.map((sc, i) => (
          <StatCard
            key={sc.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <StatIcon $color={sc.color}>{sc.icon}</StatIcon>
            <StatValue>{sc.value}</StatValue>
            <StatLabel>{sc.label}</StatLabel>
          </StatCard>
        ))}
      </StatsGrid>

      {/* Top Content */}
      <Section>
        <SectionHeader>
          <SectionTitle>
            <BarChart3 /> Top Content
          </SectionTitle>
          <RefreshButton onClick={fetchAll}>
            <RefreshCw />
          </RefreshButton>
        </SectionHeader>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Video</Th>
                <Th>Source</Th>
                <Th>Views</Th>
                <Th>Completion</Th>
              </tr>
            </thead>
            <tbody>
              {topVideos.length === 0 ? (
                <tr>
                  <EmptyRow colSpan={4}>No data yet. Videos will appear here once viewed.</EmptyRow>
                </tr>
              ) : (
                topVideos.map((v) => (
                  <tr key={v.id}>
                    <Td>{v.title}</Td>
                    <Td>
                      <SourceBadge $yt={v.source === 'youtube'}>
                        {v.source === 'youtube' ? 'YT' : 'UP'}
                      </SourceBadge>
                    </Td>
                    <Td>{v.viewCount.toLocaleString()}</Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar>
                          <ProgressFill $pct={Math.min(100, (v.completionRate || 0) * 100)} />
                        </ProgressBar>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                          {((v.completionRate || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Section>

      {/* Outbound CTR */}
      <Section>
        <SectionHeader>
          <SectionTitle>
            <ExternalLink /> YouTube Outbound CTR
          </SectionTitle>
        </SectionHeader>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Video</Th>
                <Th>CTA Strategy</Th>
                <Th>Outbound Clicks</Th>
                <Th>CTR</Th>
              </tr>
            </thead>
            <tbody>
              {outbound.length === 0 ? (
                <tr>
                  <EmptyRow colSpan={4}>No outbound click data yet.</EmptyRow>
                </tr>
              ) : (
                outbound.map((row) => (
                  <tr key={row.videoId}>
                    <Td>{row.title}</Td>
                    <Td>
                      <StrategyBadge>{row.ctaStrategy}</StrategyBadge>
                    </Td>
                    <Td>{row.outboundClicks.toLocaleString()}</Td>
                    <Td>{(row.ctr * 100).toFixed(1)}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Section>
    </Container>
  );
};

export default AnalyticsTab;
