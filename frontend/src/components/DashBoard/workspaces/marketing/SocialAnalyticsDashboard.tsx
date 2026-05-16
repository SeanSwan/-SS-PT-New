/**
 * PANEL: Social Analytics Dashboard
 * PARENT: MarketingWorkspace
 * PURPOSE: Connected social accounts and post history.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  BarChart3, Link2, Unlink, Clock, Send, Eye, Heart, Share2,
} from 'lucide-react';
import { hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  PillTabs, PillTab, EmptyState,
} from './marketing.styles';

const PLATFORMS: Record<string, { name: string; color: string }> = {
  instagram: { name: 'Instagram', color: '#E4405F' },
  facebook: { name: 'Facebook', color: '#1877F2' },
  youtube: { name: 'YouTube', color: '#FF0000' },
  bluesky: { name: 'BlueSky', color: '#0085FF' },
  tiktok: { name: 'TikTok', color: '#00F2EA' },
  nextdoor: { name: 'Nextdoor', color: '#00B246' },
};

// ─── Styled Components ─────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const AccountCard = styled.div<{ $color: string; $connected: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $connected, $color }) =>
    $connected ? hexAlpha($color, 0.3) : 'rgba(96, 192, 240, 0.08)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
`;

const AccountInfo = styled.div`display: flex; align-items: center; gap: 10px;`;

const PlatformDot = styled.div<{ $color: string }>`
  width: 10px; height: 10px; border-radius: 50%; background: ${({ $color }) => $color};
`;

const AccountName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const AccountStatus = styled.span<{ $connected: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: ${({ $connected }) => $connected ? '#10B981' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
`;

const ConnectBtn = styled.button<{ $color: string }>`
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $color }) => hexAlpha($color, 0.3)};
  background: ${({ $color }) => hexAlpha($color, 0.08)};
  color: ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover { background: ${({ $color }) => hexAlpha($color, 0.15)}; }
`;

const PostList = styled.div`display: flex; flex-direction: column; gap: 8px;`;

const PostItem = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08);
`;

const PostContent = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  flex-wrap: wrap;
`;

const MetricChip = styled.span`display: flex; align-items: center; gap: 4px;`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $status }) =>
    $status === 'published' ? 'rgba(16, 185, 129, 0.12)' :
    $status === 'scheduled' ? 'rgba(96, 192, 240, 0.12)' :
    $status === 'failed' ? 'rgba(239, 68, 68, 0.12)' :
    'rgba(245, 158, 11, 0.12)'};
  color: ${({ $status }) =>
    $status === 'published' ? '#10B981' :
    $status === 'scheduled' ? '#60C0F0' :
    $status === 'failed' ? '#EF4444' :
    '#F59E0B'};
`;

// ─── Component ─────────────────────────────────────────────────
const SocialAnalyticsDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [postHistory, setPostHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'accounts' | 'history'>('accounts');

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  useEffect(() => {
    let active = true;

    const loadSocialPublishingData = async () => {
      try {
        const healthResponse = await fetch('/api/admin/social-publishing/health', { headers });
        const healthData = await healthResponse.json();
        const configured = healthData.data?.configured === true;
        if (!active) return;
        if (!configured) return;

        const [acctData, histData] = await Promise.all([
          fetch('/api/admin/social-publishing/accounts', { headers }).then(r => r.json()),
          fetch('/api/admin/social-publishing/history', { headers }).then(r => r.json()),
        ]);
        if (!active) return;
        if (acctData.success && Array.isArray(acctData.data)) setAccounts(acctData.data);
        if (histData.success && Array.isArray(histData.data)) setPostHistory(histData.data);
      } catch { /* best-effort */ }
    };

    loadSocialPublishingData();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = useCallback(async (platform: string) => {
    try {
      const res = await fetch(`/api/admin/social-publishing/connect/${platform}`, {
        method: 'POST',
        headers,
      });
      const d = await res.json();
      if (d.success && d.data?.url) {
        window.open(d.data.url, '_blank', 'width=600,height=700');
      }
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = useCallback(async (integrationId: string) => {
    try {
      const res = await fetch(`/api/admin/social-publishing/accounts/${integrationId}`, {
        method: 'DELETE',
        headers,
      });
      const d = await res.json();
      if (d.success) {
        setAccounts(prev => prev.filter((a: any) => a.id !== integrationId));
      }
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectedPlatforms = new Set(accounts.map((a: any) => a.platform));

  return (
    <>
      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg="rgba(96, 192, 240, 0.12)" $color="#60C0F0">
              <BarChart3 size={18} />
            </IconWrap>
            <div>
              <CardTitle>Social Media Hub</CardTitle>
              <CardSubtitle>{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        <PillTabs>
          <PillTab $active={tab === 'accounts'} onClick={() => setTab('accounts')}>
            <Link2 size={14} style={{ marginRight: 4 }} /> Accounts
          </PillTab>
          <PillTab $active={tab === 'history'} onClick={() => setTab('history')}>
            <Clock size={14} style={{ marginRight: 4 }} /> Post History
          </PillTab>
        </PillTabs>

        {tab === 'accounts' && (
          <Grid>
            {Object.entries(PLATFORMS).map(([id, p]) => {
              const connected = connectedPlatforms.has(id);
              const acct = accounts.find((a: any) => a.platform === id);
              return (
                <AccountCard key={id} $color={p.color} $connected={connected}>
                  <AccountInfo>
                    <PlatformDot $color={p.color} />
                    <div>
                      <AccountName>{p.name}</AccountName>
                      <br />
                      <AccountStatus $connected={connected}>
                        {connected ? `Connected: ${acct?.name || 'Active'}` : 'Not connected'}
                      </AccountStatus>
                    </div>
                  </AccountInfo>
                  {connected ? (
                    <ConnectBtn $color="#EF4444" onClick={() => handleDisconnect(acct?.id)}>
                      <Unlink size={12} /> Disconnect
                    </ConnectBtn>
                  ) : (
                    <ConnectBtn $color={p.color} onClick={() => handleConnect(id)}>
                      <Link2 size={12} /> Connect
                    </ConnectBtn>
                  )}
                </AccountCard>
              );
            })}
          </Grid>
        )}

        {tab === 'history' && (
          <PostList>
            {postHistory.length === 0 ? (
              <EmptyState>
                <Send size={32} style={{ opacity: 0.4 }} />
                No posts published yet. Compose your first post above.
              </EmptyState>
            ) : (
              postHistory.map((post: any, i: number) => (
                <PostItem key={post.id || i}>
                  <PostContent>{post.content || post.caption || 'Post'}</PostContent>
                  <PostMeta>
                    <StatusBadge $status={post.status || 'published'}>
                      {post.status || 'published'}
                    </StatusBadge>
                    {post.platform && (
                      <MetricChip>
                        <PlatformDot $color={PLATFORMS[post.platform]?.color || '#60C0F0'} />
                        {PLATFORMS[post.platform]?.name || post.platform}
                      </MetricChip>
                    )}
                    {post.reach != null && <MetricChip><Eye size={12} /> {post.reach}</MetricChip>}
                    {post.likes != null && <MetricChip><Heart size={12} /> {post.likes}</MetricChip>}
                    {post.shares != null && <MetricChip><Share2 size={12} /> {post.shares}</MetricChip>}
                    {post.scheduledAt && (
                      <MetricChip><Clock size={12} /> Scheduled: {new Date(post.scheduledAt).toLocaleDateString()}</MetricChip>
                    )}
                  </PostMeta>
                </PostItem>
              ))
            )}
          </PostList>
        )}
      </MarketingCard>
    </>
  );
};

export default SocialAnalyticsDashboard;
