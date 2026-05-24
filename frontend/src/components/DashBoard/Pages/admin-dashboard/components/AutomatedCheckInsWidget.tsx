/**
 * AutomatedCheckInsWidget — Scheduled Client Check-In System
 * ───────────────────────────────────────────────────────────
 * Competitive feature inspired by TrueCoach/PT Distinction automated
 * check-ins, triggered messages, and habit tracking.
 * Allows trainers to schedule recurring check-ins, set up milestone
 * triggers, and track daily habits per client.
 *
 * Theme: Crystalline Swan (Ice Wing cyan accents)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, CalendarCheck, Repeat, Zap,
  Droplets, Footprints, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Bell, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../admin-dashboard-view';

/* ─── Types ─────────────────────────────────────────── */

interface ScheduledCheckIn {
  id: number;
  clientName: string;
  clientId: number;
  type: 'weekly' | 'biweekly' | 'monthly' | 'milestone';
  template: string;
  nextDue: string; // ISO date
  lastSent?: string;
  status: 'upcoming' | 'overdue' | 'sent';
}

interface HabitSummary {
  habit: string;
  icon?: React.ReactNode;
  avgCompletion: number;
  activeClients: number;
  streakLeader: string;
  streakDays: number;
}

interface AutoTrigger {
  id: number;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  firedCount: number;
}

type TabType = 'check-ins' | 'habits' | 'triggers';

/* ─── Component ─────────────────────────────────────── */

const AutomatedCheckInsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [tab, setTab] = useState<TabType>('check-ins');
  const [checkIns, setCheckIns] = useState<ScheduledCheckIn[]>([]);
  const [habits, setHabits] = useState<HabitSummary[]>([]);
  const [triggers, setTriggers] = useState<AutoTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrigger, setExpandedTrigger] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAxios.get('/api/admin/check-ins/dashboard');
      if (res.data) {
        setCheckIns(res.data.checkIns ?? []);
        setHabits(res.data.habits ?? []);
        setTriggers(res.data.triggers ?? []);
      }
    } catch {
      setCheckIns([]);
      setHabits([]);
      setTriggers([]);
      setError('Check-in automation data unavailable.');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overdue = checkIns.filter(c => c.status === 'overdue').length;
  const upcoming = checkIns.filter(c => c.status === 'upcoming').length;

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <Bell size={20} color="#60C0F0" />
          <Title>Automated Check-Ins & Habits</Title>
        </HeaderLeft>
        {overdue > 0 && <OverdueBadge>{overdue} overdue</OverdueBadge>}
      </Header>

      {/* Quick Stats */}
      <QuickStats>
        <QStat>
          <QStatIcon $color="#60C0F0"><CalendarCheck size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{upcoming}</QStatVal>
            <QStatLbl>Upcoming</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color="#ef4444"><Clock size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{overdue}</QStatVal>
            <QStatLbl>Overdue</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color="#8B5CF6"><Repeat size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{triggers.filter(t => t.enabled).length}</QStatVal>
            <QStatLbl>Active Triggers</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color="#10b981"><Footprints size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{habits.length}</QStatVal>
            <QStatLbl>Tracked Habits</QStatLbl>
          </QStatInfo>
        </QStat>
      </QuickStats>

      {/* Tab Switcher */}
      <TabBar>
        {([
          { id: 'check-ins' as const, label: 'Check-Ins', icon: <MessageSquare size={14} /> },
          { id: 'habits' as const, label: 'Habits', icon: <Droplets size={14} /> },
          { id: 'triggers' as const, label: 'Triggers', icon: <Zap size={14} /> },
        ]).map(t => (
          <TabBtn key={t.id} $active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </TabBtn>
        ))}
      </TabBar>

      {/* Content */}
      <Content>
        {error && (
          <ErrorMsg role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <RetryInline type="button" onClick={fetchData}>
              <RefreshCw size={14} />
              Retry
            </RetryInline>
          </ErrorMsg>
        )}
        <AnimatePresence mode="wait">
          {!error && tab === 'check-ins' && (
            <motion.div key="ci" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? <LoadingRows /> : checkIns.length === 0 ? (
                <EmptyMsg>No check-ins scheduled. Set up recurring check-ins for your clients.</EmptyMsg>
              ) : (
                checkIns.map(ci => (
                  <CheckInRow key={ci.id} $status={ci.status}>
                    <CIStatus $status={ci.status}>
                      {ci.status === 'overdue' ? <Clock size={14} /> : ci.status === 'sent' ? <CheckCircle2 size={14} /> : <CalendarCheck size={14} />}
                    </CIStatus>
                    <CIInfo>
                      <CIClient>{ci.clientName}</CIClient>
                      <CITemplate>{ci.template}</CITemplate>
                      <CIMeta>
                        <Repeat size={10} /> {ci.type} &bull; Due {formatDate(ci.nextDue)}
                      </CIMeta>
                    </CIInfo>
                  </CheckInRow>
                ))
              )}
            </motion.div>
          )}

          {!error && tab === 'habits' && (
            <motion.div key="hb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? <LoadingRows /> : habits.length === 0 ? (
                <EmptyMsg>No tracked habits returned yet.</EmptyMsg>
              ) : habits.map((h, i) => (
                <HabitRow key={i}>
                  <HabitIcon>{h.icon ?? <Footprints size={16} color="#10b981" />}</HabitIcon>
                  <HabitInfo>
                    <HabitName>{h.habit}</HabitName>
                    <HabitMeta>{h.activeClients} clients tracking</HabitMeta>
                  </HabitInfo>
                  <HabitStats>
                    <HabitBar>
                      <HabitBarFill $pct={h.avgCompletion} />
                    </HabitBar>
                    <HabitPct>{h.avgCompletion}%</HabitPct>
                  </HabitStats>
                  <StreakBadge>
                    <Zap size={10} /> {h.streakLeader}: {h.streakDays}d
                  </StreakBadge>
                </HabitRow>
              ))}
            </motion.div>
          )}

          {!error && tab === 'triggers' && (
            <motion.div key="tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? <LoadingRows /> : triggers.length === 0 ? (
                <EmptyMsg>No automation triggers returned yet.</EmptyMsg>
              ) : triggers.map(t => (
                <TriggerRow key={t.id}>
                  <TriggerHeader onClick={() => setExpandedTrigger(expandedTrigger === t.id ? null : t.id)}>
                    <TriggerDot $active={t.enabled} />
                    <TriggerInfo>
                      <TriggerName>{t.name}</TriggerName>
                      <TriggerMeta>Fired {t.firedCount} times</TriggerMeta>
                    </TriggerInfo>
                    {expandedTrigger === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </TriggerHeader>
                  {expandedTrigger === t.id && (
                    <TriggerDetail>
                      <TriggerLine><strong>When:</strong> {t.condition}</TriggerLine>
                      <TriggerLine><strong>Then:</strong> {t.action}</TriggerLine>
                    </TriggerDetail>
                  )}
                </TriggerRow>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Content>
    </CommandCard>
  );
};

/* ─── Helpers ───────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

const LoadingRows = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </>
);

export default AutomatedCheckInsWidget;

/* ─── Styled Components ─────────────────────────────── */

const pulse = keyframes`0%,100%{opacity:0.5}50%{opacity:1}`;

const Header = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;`;
const HeaderLeft = styled.div`display: flex; align-items: center; gap: 10px;`;
const Title = styled.h3`font-size: 16px; font-weight: 700; color: #f0f0ff; margin: 0;
  @media (max-width: 430px) { font-size: 14px; }
`;
const OverdueBadge = styled.span`
  font-size: 11px; font-weight: 700; color: #ef4444; padding: 4px 10px;
  border-radius: 10px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
`;

const QuickStats = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
const QStat = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: rgba(0,32,96,0.3); border-radius: 10px; border: 1px solid rgba(255,255,255,0.04);
`;
const QStatIcon = styled.div<{ $color: string }>`
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; background: ${p => p.$color}1A; color: ${p => p.$color};
`;
const QStatInfo = styled.div``;
const QStatVal = styled.div`font-size: 18px; font-weight: 700; color: #f0f0ff; font-family: 'Fira Code', monospace;`;
const QStatLbl = styled.div`font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase;`;

const TabBar = styled.div`
  display: flex; gap: 4px; margin-bottom: 16px; background: rgba(0,32,96,0.3);
  border-radius: 10px; padding: 3px;
`;
const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; min-height: 44px; transition: all 0.15s;
  background: ${p => p.$active ? 'rgba(96,192,240,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#60C0F0' : 'rgba(255,255,255,0.5)'};
  &:hover { color: #60C0F0; }
`;

const Content = styled.div`max-height: 400px; overflow-y: auto; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 3px; }
`;

/* Check-ins */
const CheckInRow = styled.div<{ $status: string }>`
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; }
`;
const CIStatus = styled.div<{ $status: string }>`
  width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
  background: ${p => p.$status === 'overdue' ? 'rgba(239,68,68,0.15)' : p.$status === 'sent' ? 'rgba(16,185,129,0.15)' : 'rgba(96,192,240,0.15)'};
  color: ${p => p.$status === 'overdue' ? '#ef4444' : p.$status === 'sent' ? '#10b981' : '#60C0F0'};
`;
const CIInfo = styled.div`flex: 1; min-width: 0;`;
const CIClient = styled.div`font-size: 13px; font-weight: 600; color: #e2e8f0;`;
const CITemplate = styled.div`font-size: 12px; color: rgba(255,255,255,0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  @media (max-width: 430px) { white-space: normal; }
`;
const CIMeta = styled.div`
  display: flex; align-items: center; gap: 4px; font-size: 10px;
  color: rgba(255,255,255,0.35); margin-top: 2px;
`;
/* Habits */
const HabitRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; }
`;
const HabitIcon = styled.div`flex-shrink: 0;`;
const HabitInfo = styled.div`flex: 1; min-width: 0;`;
const HabitName = styled.div`font-size: 13px; font-weight: 600; color: #e2e8f0;`;
const HabitMeta = styled.div`font-size: 11px; color: rgba(255,255,255,0.4);`;
const HabitStats = styled.div`display: flex; align-items: center; gap: 8px; flex-shrink: 0;`;
const HabitBar = styled.div`width: 80px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;`;
const HabitBarFill = styled.div<{ $pct: number }>`
  height: 100%; border-radius: 3px; width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #60C0F0, #8B5CF6);
`;
const HabitPct = styled.span`font-size: 12px; font-weight: 600; color: #60C0F0; width: 32px; text-align: right;`;
const StreakBadge = styled.span`
  display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600;
  color: #C6A84B; padding: 3px 8px; border-radius: 8px; background: rgba(198,168,75,0.1);
  white-space: nowrap; flex-shrink: 0;
`;

/* Triggers */
const TriggerRow = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`;
const TriggerHeader = styled.button`
  display: flex; align-items: center; gap: 10px; padding: 14px 0; width: 100%;
  background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7);
  text-align: left; min-height: 44px;
`;
const TriggerDot = styled.div<{ $active: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${p => p.$active ? '#10b981' : '#64748b'};
  box-shadow: ${p => p.$active ? '0 0 6px #10b98166' : 'none'};
`;
const TriggerInfo = styled.div`flex: 1;`;
const TriggerName = styled.div`font-size: 13px; font-weight: 600; color: #e2e8f0;`;
const TriggerMeta = styled.div`font-size: 10px; color: rgba(255,255,255,0.4);`;
const TriggerDetail = styled.div`
  padding: 8px 0 12px 18px; font-size: 12px; color: rgba(255,255,255,0.5);
  strong { color: rgba(255,255,255,0.7); }
`;
const TriggerLine = styled.div`margin-bottom: 4px;`;
const SkeletonRow = styled.div`
  height: 56px; background: rgba(255,255,255,0.03); border-radius: 8px;
  margin-bottom: 8px; animation: ${pulse} 1.5s infinite;
`;
const ErrorMsg = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  min-height: 56px; padding: 12px 14px; border-radius: 10px;
  background: rgba(198,168,75,0.1); border: 1px solid rgba(198,168,75,0.24);
  color: var(--text-primary, #E0ECF4); font-size: 13px;
  @media (max-width: 430px) { grid-template-columns: auto 1fr; }
`;
const RetryInline = styled.button`
  min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid rgba(96,192,240,0.35); border-radius: 8px; padding: 0 12px;
  background: rgba(0,32,96,0.45); color: var(--text-primary, #E0ECF4);
  font-size: 12px; font-weight: 700; cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (max-width: 430px) { grid-column: 1 / -1; width: 100%; }
`;
const EmptyMsg = styled.div`
  text-align: center; padding: 32px; color: rgba(255,255,255,0.5); font-size: 13px;
`;
