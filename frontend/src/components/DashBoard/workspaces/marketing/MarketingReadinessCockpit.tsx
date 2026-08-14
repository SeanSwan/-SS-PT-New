/**
 * FILE: MarketingReadinessCockpit.tsx
 * BLUEPRINT: Read-only truth surface for the admin Marketing Command Center.
 *   Renders the real operational state of every marketing subsystem (social,
 *   automation, email, lead capture, calendar) + an honest labs/demo flag for
 *   the not-yet-wired content tools. Replaces "demo theater" with honest status.
 * DATA: GET /api/admin/marketing-readiness (protect + adminOnly, counts/booleans only).
 * MOTION: low-motion data card (no pointer tracking / loops), reduced-motion safe.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CalendarDays, GaugeCircle, Mail, RefreshCw, Share2, Users, Zap, FlaskConical, Loader2, Megaphone, Send,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import * as S from './MarketingReadinessCockpit.styles';
import type { ReadinessStatus } from './MarketingReadinessCockpit.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface ProviderInfo {
  id: string; name: string; implementationStatus: string; usable: boolean; connected: number;
}
interface Subsystem {
  status: ReadinessStatus;
  note?: string;
  nextAction?: string | null;
  error?: string;
  // social
  encryptionConfigured?: boolean; connectedAccounts?: number; schedulerEnabled?: boolean; providers?: ProviderInfo[];
  // automation
  armed?: boolean; cronEnvConfigured?: boolean; activeSequences?: number; leadNurtureActive?: boolean; pendingScheduled?: number; emailSenderBuilt?: boolean;
  // email
  sendgridConfigured?: boolean; confirmedSubscribers?: number; pendingSubscribers?: number; unsubscribed?: number; broadcastBuilt?: boolean;
  // speed-to-lead (booleans only — never a credential value)
  enabled?: boolean; fromEmailConfigured?: boolean; fromEmailOnBrandDomain?: boolean;
  businessAddressConfigured?: boolean; consultUrlConfigured?: boolean; replyPoints?: Record<string, boolean>;
  // lead
  totalLeads?: number; capturePoints?: Record<string, boolean>;
  // calendar
  totalItems?: number; upcoming?: number;
  // campaigns
  totalCampaigns?: number; activeCampaigns?: number;
  // content tools
  tools?: { id: string; label: string; mode: string }[];
}
interface Readiness {
  overall: ReadinessStatus;
  generatedAt: string;
  subsystems: {
    socialPublishing: Subsystem; automation: Subsystem; email: Subsystem;
    speedToLead: Subsystem;
    leadCapture: Subsystem; calendar: Subsystem; campaigns: Subsystem; contentTools: Subsystem;
  };
}

const STATUS_LABEL: Record<ReadinessStatus, string> = {
  ready: 'Ready', degraded: 'Degraded', blocked: 'Blocked', demo: 'Labs / Demo',
};

const num = (v?: number) => (typeof v === 'number' ? v : 0);

type Metric = { k: string; v: string; tone?: 'good' | 'warn' | 'bad' | 'muted' };

interface CardModel {
  key: string;
  name: string;
  icon: React.ReactNode;
  sub: Subsystem;
  metrics: Metric[];
  providers?: ProviderInfo[];
  tools?: { id: string; label: string; mode: string }[];
}

const buildCards = (s: Readiness['subsystems']): CardModel[] => {
  const social = s.socialPublishing;
  const auto = s.automation;
  const email = s.email;
  const s2l = s.speedToLead;
  const lead = s.leadCapture;
  const cal = s.calendar;
  const camp = s.campaigns;
  const tools = s.contentTools;

  // Count only the surfaces that genuinely send the instant reply, so the card
  // states real coverage instead of implying every capture point replies.
  const replyPointCount = Object.values(s2l?.replyPoints ?? {}).filter(Boolean).length;

  return [
    {
      key: 'social', name: 'Social Publishing', icon: <Share2 size={16} />, sub: social,
      providers: social.providers,
      metrics: [
        { k: 'Credential encryption', v: social.encryptionConfigured ? 'Configured' : 'Missing', tone: social.encryptionConfigured ? 'good' : 'bad' },
        { k: 'Connected accounts', v: String(num(social.connectedAccounts)), tone: num(social.connectedAccounts) > 0 ? 'good' : 'warn' },
        { k: 'Publisher worker', v: social.schedulerEnabled ? 'On' : 'Off', tone: social.schedulerEnabled ? 'good' : 'muted' },
      ],
    },
    {
      key: 'automation', name: 'Outbound Automation', icon: <Zap size={16} />, sub: auto,
      metrics: [
        { k: 'Send engine', v: auto.armed ? 'ARMED' : 'Disarmed (safe)', tone: auto.armed ? 'warn' : 'good' },
        { k: 'Active sequences', v: String(num(auto.activeSequences)), tone: 'muted' },
        { k: 'lead_nurture', v: auto.leadNurtureActive ? 'Active' : 'Inactive (intended)', tone: auto.leadNurtureActive ? 'warn' : 'muted' },
        { k: 'Pending scheduled', v: String(num(auto.pendingScheduled)), tone: 'muted' },
        { k: 'Email-channel sender', v: auto.emailSenderBuilt ? 'Built' : 'Not built', tone: auto.emailSenderBuilt ? 'good' : 'muted' },
      ],
    },
    {
      key: 'email', name: 'Email / Newsletter', icon: <Mail size={16} />, sub: email,
      metrics: [
        { k: 'SendGrid', v: email.sendgridConfigured ? 'Configured' : 'Missing', tone: email.sendgridConfigured ? 'good' : 'bad' },
        { k: 'Confirmed subscribers', v: String(num(email.confirmedSubscribers)), tone: 'good' },
        { k: 'Pending', v: String(num(email.pendingSubscribers)), tone: 'muted' },
        { k: 'Unsubscribed', v: String(num(email.unsubscribed)), tone: 'muted' },
        { k: 'Broadcast send', v: email.broadcastBuilt ? 'Built' : 'Not built', tone: email.broadcastBuilt ? 'good' : 'muted' },
      ],
    },
    {
      // The revenue-first card: whether a prospect who just raised their hand
      // actually hears back. Dark is a legitimate resting state, so it reads
      // "Dark (safe)" in muted tone rather than as a failure.
      key: 'speedToLead', name: 'Speed-to-Lead Reply', icon: <Send size={16} />, sub: s2l,
      metrics: [
        { k: 'Instant reply', v: s2l.enabled ? 'LIVE' : 'Dark (safe)', tone: s2l.enabled ? 'good' : 'muted' },
        { k: 'Sender', v: s2l.sendgridConfigured && s2l.fromEmailConfigured ? 'Configured' : 'Incomplete', tone: s2l.sendgridConfigured && s2l.fromEmailConfigured ? 'good' : (s2l.enabled ? 'bad' : 'warn') },
        // Alignment only matters once mail is actually flowing.
        { k: 'From-address alignment', v: s2l.fromEmailOnBrandDomain ? 'On brand domain' : 'Off domain', tone: s2l.fromEmailOnBrandDomain ? 'good' : (s2l.enabled ? 'bad' : 'muted') },
        { k: 'Replying surfaces', v: `${replyPointCount} of ${Object.keys(s2l.replyPoints ?? {}).length}`, tone: 'muted' },
        { k: 'Footer postal address', v: s2l.businessAddressConfigured ? 'Set' : 'Placeholder', tone: s2l.businessAddressConfigured ? 'good' : 'warn' },
      ],
    },
    {
      key: 'lead', name: 'Lead Capture', icon: <Users size={16} />, sub: lead,
      metrics: [
        { k: 'Total leads', v: String(num(lead.totalLeads)), tone: 'good' },
        { k: 'Capture points', v: `${Object.values(lead.capturePoints || {}).filter(Boolean).length}/4 wired`, tone: 'good' },
      ],
    },
    {
      key: 'calendar', name: 'Marketing Calendar', icon: <CalendarDays size={16} />, sub: cal,
      metrics: [
        { k: 'Total items', v: String(num(cal.totalItems)), tone: 'muted' },
        { k: 'Upcoming scheduled', v: String(num(cal.upcoming)), tone: 'good' },
      ],
    },
    {
      key: 'campaigns', name: 'Campaigns', icon: <Megaphone size={16} />, sub: camp,
      metrics: [
        { k: 'Total', v: String(num(camp.totalCampaigns)), tone: 'muted' },
        { k: 'Active', v: String(num(camp.activeCampaigns)), tone: 'good' },
      ],
    },
    {
      key: 'content', name: 'Content Tools', icon: <FlaskConical size={16} />, sub: tools,
      tools: tools.tools,
      metrics: [],
    },
  ];
};

const MarketingReadinessCockpit: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<Readiness | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    let cancelled = false;
    setState('loading');
    authAxios.get('/api/admin/marketing-readiness')
      .then((res) => {
        if (cancelled) return;
        setData(res.data?.data ?? null);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [authAxios]);

  useEffect(() => load(), [load]);

  const overall = data?.overall ?? 'degraded';
  const cards = data ? buildCards(data.subsystems) : [];

  return (
    <S.Section aria-label="Marketing system readiness">
      <S.HeaderRow>
        <S.HeaderLeft>
          <S.HeaderIcon><GaugeCircle size={18} /></S.HeaderIcon>
          <div>
            <S.Title>Marketing System Readiness</S.Title>
            <S.Subtitle>What is live, what is safe-off, and what is still demo — no theater.</S.Subtitle>
          </div>
        </S.HeaderLeft>
        <StyledBox as="div" $style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {state === 'ready' && <S.OverallPill $status={overall}>{STATUS_LABEL[overall]}</S.OverallPill>}
          <S.RefreshButton type="button" onClick={load} disabled={state === 'loading'} aria-label="Refresh readiness">
            <RefreshCw size={15} /> Refresh
          </S.RefreshButton>
        </StyledBox>
      </S.HeaderRow>

      {state === 'loading' && (
        <S.StateBlock><Loader2 size={16} /> Reading live subsystem state…</S.StateBlock>
      )}

      {state === 'error' && (
        <S.StateBlock>
          <AlertTriangle size={16} /> Readiness route unavailable — check admin auth or backend health, then Refresh.
        </S.StateBlock>
      )}

      {state === 'ready' && data && (
        <S.Grid>
          {cards.map((card) => (
            <S.Card key={card.key} $status={card.sub.status}>
              <S.CardTop>
                <S.CardHead>
                  <S.CardIcon $status={card.sub.status}>{card.icon}</S.CardIcon>
                  <S.CardName title={card.name}>{card.name}</S.CardName>
                </S.CardHead>
                <S.Badge $status={card.sub.status}>{STATUS_LABEL[card.sub.status]}</S.Badge>
              </S.CardTop>

              {card.metrics.length > 0 && (
                <S.MetricList>
                  {card.metrics.map((mrow) => (
                    <S.MetricRow key={mrow.k}>
                      <S.MetricKey>{mrow.k}</S.MetricKey>
                      <S.MetricVal $tone={mrow.tone}>{mrow.v}</S.MetricVal>
                    </S.MetricRow>
                  ))}
                </S.MetricList>
              )}

              {card.providers && card.providers.length > 0 && (
                <S.ChipRow>
                  {card.providers.map((p) => (
                    <S.Chip key={p.id} $tone={p.connected > 0 ? 'good' : p.usable ? 'muted' : 'muted'} title={p.implementationStatus}>
                      {p.name}{p.connected > 0 ? ` ·${p.connected}` : p.usable ? '' : ' · gated'}
                    </S.Chip>
                  ))}
                </S.ChipRow>
              )}

              {card.tools && card.tools.length > 0 && (
                <S.ChipRow>
                  {card.tools.map((t) => (
                    <S.Chip key={t.id} $tone="demo">{t.label}</S.Chip>
                  ))}
                </S.ChipRow>
              )}

              {card.sub.note && <S.Note>{card.sub.note}</S.Note>}

              {card.sub.nextAction && (
                <S.NextAction><AlertTriangle size={13} /> {card.sub.nextAction}</S.NextAction>
              )}
            </S.Card>
          ))}
        </S.Grid>
      )}
    </S.Section>
  );
};

export default MarketingReadinessCockpit;
