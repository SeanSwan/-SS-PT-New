/**
 * FILE: MarketingCommandOverview.tsx
 * BLUEPRINT: Founder command overview for queue, calendar, leads, and analytics.
 * DATA: Pulls lead stats from the existing CRM lead route.
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, CalendarDays, CheckCircle2, Megaphone, Send, TrendingUp, Users,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
} from './marketing.styles';
import {
  BoundaryCopy, BoundaryGrid, BoundaryItem, BoundaryTitle, CommandButton,
  MetricBlock, MetricGrid, MetricLabel, MetricValue, OverviewGrid,
  SignalIcon, SignalList, SignalMeta, SignalRow, SignalTitle, Stack, StatusLine,
  ChannelList, ChannelRow, ChannelName, ChannelTrack, ChannelFill, ChannelCount, ChannelEmpty,
  ChannelMeta, ChannelWon,
} from './MarketingCommandOverview.styles';
import MarketingReadinessCockpit from './MarketingReadinessCockpit';
import CampaignManager from './CampaignManager';
import { StyledBox } from '@/components/ui/StyledBox';

type CommandTarget = 'queue' | 'calendar' | 'leads' | 'analytics';

interface MarketingCommandOverviewProps {
  onSelectTab: (tab: CommandTarget) => void;
  /** Deep-link straight to a filtered Leads view ("hot" / "followups"). */
  onOpenLeads?: (filter: 'hot' | 'followups') => void;
}

interface ChannelStat {
  channel: string;
  count: number;
  converted?: number;
}

/** Who brings leads via shared milestone links (ids + first name only — rule 8). */
interface ReferrerStat {
  referrerId: number;
  firstName?: string | null;
  count: number;
  converted?: number;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  scheduled: number;
  converted: number;
  lost: number;
  conversionRate: number;
  needsFollowUp: number;
  hotLeads: number;
  byChannel: ChannelStat[];
  byReferrer?: ReferrerStat[];
}

const DEFAULT_STATS: LeadStats = {
  total: 0, new: 0, contacted: 0, qualified: 0, scheduled: 0,
  converted: 0, lost: 0, conversionRate: 0, needsFollowUp: 0, hotLeads: 0, byChannel: [],
};

const MarketingCommandOverview: React.FC<MarketingCommandOverviewProps> = ({ onSelectTab, onOpenLeads }) => {
  const { authAxios } = useAuth();
  const [stats, setStats] = useState<LeadStats>(DEFAULT_STATS);
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');

  useEffect(() => {
    let mounted = true;

    authAxios.get('/api/leads/stats')
      .then((res) => {
        if (!mounted) return;
        setStats({ ...DEFAULT_STATS, ...(res.data?.stats || {}) });
        setStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('offline');
      });

    return () => { mounted = false; };
  }, [authAxios]);

  const loop = [
    { tab: 'queue' as const, icon: <Send size={19} />, title: 'Approve or schedule posts', meta: 'Human-reviewed output before anything public goes live.' },
    { tab: 'calendar' as const, icon: <CalendarDays size={19} />, title: 'Lock the week plan', meta: 'Keep YouTube, short-form, email, and blog beats in one cadence.' },
    { tab: 'leads' as const, icon: <Users size={19} />, title: 'Work hot leads first', meta: `${stats.hotLeads} hot, ${stats.needsFollowUp} due for follow-up.` },
    { tab: 'analytics' as const, icon: <BarChart3 size={19} />, title: 'Read what is converting', meta: 'Use channel performance to decide what gets repeated.' },
  ];

  const topChannelCount = stats.byChannel[0]?.count || 0; // list is sorted desc

  return (
    <Stack>
      <MarketingReadinessCockpit />

      <CampaignManager />

      <OverviewGrid>
        <MarketingCard>
          <CardHeader>
            <HeaderLeft>
              <IconWrap>
                <Megaphone size={18} />
              </IconWrap>
              <div>
                <CardTitle>Daily Marketing Loop</CardTitle>
                <CardSubtitle>One operator flow for getting attention into booked follow-up</CardSubtitle>
              </div>
            </HeaderLeft>
          </CardHeader>

          <SignalList>
            {loop.map((item) => (
              <SignalRow key={item.tab}>
                <SignalIcon>{item.icon}</SignalIcon>
                <div>
                  <SignalTitle>{item.title}</SignalTitle>
                  <SignalMeta>{item.meta}</SignalMeta>
                </div>
                <CommandButton
                  type="button"
                  onClick={() => (item.tab === 'leads' && onOpenLeads ? onOpenLeads('hot') : onSelectTab(item.tab))}
                >
                  Open <ArrowRight size={14} />
                </CommandButton>
              </SignalRow>
            ))}
          </SignalList>
        </MarketingCard>

        <MarketingCard>
          <CardHeader>
            <HeaderLeft>
              <IconWrap>
                <Users size={18} />
              </IconWrap>
              <div>
                <CardTitle>Lead Engine</CardTitle>
                <CardSubtitle>Existing CRM spine surfaced for revenue work</CardSubtitle>
              </div>
            </HeaderLeft>
            <StatusLine>
              <CheckCircle2 size={14} />
              {status === 'loading' ? 'loading' : status === 'ready' ? 'live route' : 'route unavailable'}
            </StatusLine>
          </CardHeader>

          <MetricGrid>
            <MetricBlock>
              <MetricValue>{stats.total}</MetricValue>
              <MetricLabel>Total leads</MetricLabel>
            </MetricBlock>
            <StyledBox as={MetricBlock}
              role="button"
              tabIndex={0}
              $style={{ cursor: 'pointer' }}
              aria-label={`${stats.hotLeads} hot leads — open filtered list`}
              onClick={() => onOpenLeads?.('hot')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenLeads?.('hot'); } }}
            >
              <MetricValue $tone="purple">{stats.hotLeads}</MetricValue>
              <MetricLabel>Hot leads ›</MetricLabel>
            </StyledBox>
            <StyledBox as={MetricBlock}
              role="button"
              tabIndex={0}
              $style={{ cursor: 'pointer' }}
              aria-label={`${stats.needsFollowUp} follow-ups due — open filtered list`}
              onClick={() => onOpenLeads?.('followups')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenLeads?.('followups'); } }}
            >
              <MetricValue $tone="gold">{stats.needsFollowUp}</MetricValue>
              <MetricLabel>Follow-ups due ›</MetricLabel>
            </StyledBox>
            <MetricBlock>
              <MetricValue>{stats.conversionRate}%</MetricValue>
              <MetricLabel>Conversion rate</MetricLabel>
            </MetricBlock>
          </MetricGrid>
        </MarketingCard>
      </OverviewGrid>

      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap>
              <TrendingUp size={18} />
            </IconWrap>
            <div>
              <CardTitle>Leads by Channel</CardTitle>
              <CardSubtitle>Which channel produces leads — and which convert to clients. Invest where it works.</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>
        {stats.byChannel.length === 0 ? (
          <ChannelEmpty>Channels appear here as attributed leads come in — tag your links with utm_source (e.g. ?utm_source=youtube).</ChannelEmpty>
        ) : (
          <ChannelList>
            {stats.byChannel.map((c) => (
              <ChannelRow key={c.channel}>
                <ChannelName>{c.channel}</ChannelName>
                <ChannelTrack>
                  <ChannelFill $pct={topChannelCount ? (c.count / topChannelCount) * 100 : 0} />
                </ChannelTrack>
                <ChannelMeta>
                  <ChannelCount>{c.count}</ChannelCount>
                  {c.converted ? <ChannelWon>{c.converted} won</ChannelWon> : null}
                </ChannelMeta>
              </ChannelRow>
            ))}
          </ChannelList>
        )}
        {(stats.byReferrer?.length ?? 0) > 0 ? (
          <ChannelList aria-label="Top referrers">
            {stats.byReferrer!.map((r) => (
              <ChannelRow key={`ref-${r.referrerId}`}>
                <ChannelName>{r.firstName ? `${r.firstName} (#${r.referrerId})` : `Client #${r.referrerId}`}</ChannelName>
                <ChannelTrack>
                  <ChannelFill $pct={topChannelCount ? Math.min(100, (r.count / topChannelCount) * 100) : 0} />
                </ChannelTrack>
                <ChannelMeta>
                  <ChannelCount>{r.count}</ChannelCount>
                  {r.converted ? <ChannelWon>{r.converted} won</ChannelWon> : null}
                </ChannelMeta>
              </ChannelRow>
            ))}
          </ChannelList>
        ) : null}
      </MarketingCard>

      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap>
              <CheckCircle2 size={18} />
            </IconWrap>
            <div>
              <CardTitle>Workspace Boundaries</CardTitle>
              <CardSubtitle>Creation, distribution, and community now have separate jobs</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>
        <BoundaryGrid>
          <BoundaryItem>
            <BoundaryTitle>Content Studio</BoundaryTitle>
            <BoundaryCopy>Create assets: video library, exercise coverage, templates, badges, and blog drafts.</BoundaryCopy>
          </BoundaryItem>
          <BoundaryItem>
            <BoundaryTitle>Marketing</BoundaryTitle>
            <BoundaryCopy>Distribute approved assets, manage the publishing queue, track leads, and read performance.</BoundaryCopy>
          </BoundaryItem>
          <BoundaryItem>
            <BoundaryTitle>Community</BoundaryTitle>
            <BoundaryCopy>Keep member-facing encouragement and progress sharing away from admin campaign operations.</BoundaryCopy>
          </BoundaryItem>
        </BoundaryGrid>
      </MarketingCard>
    </Stack>
  );
};

export default MarketingCommandOverview;
