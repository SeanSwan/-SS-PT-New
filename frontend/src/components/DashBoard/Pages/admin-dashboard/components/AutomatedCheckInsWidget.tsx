/**
 * AutomatedCheckInsWidget - Scheduled Client Check-In System
 *
 * Read-only admin overview telemetry for scheduled check-ins, habit adherence,
 * and automation triggers. Write controls stay out of this widget until the
 * matching backend handlers are mounted.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CalendarCheck, CheckCircle2, ChevronDown, ChevronUp, Clock, Droplets, Footprints, MessageSquare, RefreshCw, Repeat, Zap } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../AdminDashboardCards';
import {
  CHECKIN_DANGER, CHECKIN_ICE, CHECKIN_PURPLE, CHECKIN_SUCCESS,
  CheckInRow, CIClient, CIInfo, CIMeta, CIStatus, CITemplate, Content, EmptyMsg, ErrorMsg,
  HabitBar, HabitBarFill, HabitIcon, HabitInfo, HabitMeta, HabitName, HabitPct, HabitRow, HabitStats,
  Header, HeaderLeft, OverdueBadge, QStat, QStatIcon, QStatInfo, QStatLbl, QStatVal, QuickStats,
  RetryInline, SkeletonRow, StreakBadge, TabBar, TabBtn, Title,
  TriggerDetail, TriggerDot, TriggerHeader, TriggerInfo, TriggerLine, TriggerMeta, TriggerName, TriggerRow,
} from './AutomatedCheckInsWidget.styles';

interface ScheduledCheckIn {
  id: number;
  clientName: string;
  clientId: number;
  type: 'weekly' | 'biweekly' | 'monthly' | 'milestone';
  template: string;
  nextDue: string;
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overdue = checkIns.filter((checkIn) => checkIn.status === 'overdue').length;
  const upcoming = checkIns.filter((checkIn) => checkIn.status === 'upcoming').length;

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <Bell size={20} color={CHECKIN_ICE} />
          <Title>Automated Check-Ins & Habits</Title>
        </HeaderLeft>
        {overdue > 0 && <OverdueBadge>{overdue} overdue</OverdueBadge>}
      </Header>

      <QuickStats>
        <QStat>
          <QStatIcon $color={CHECKIN_ICE}><CalendarCheck size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{upcoming}</QStatVal>
            <QStatLbl>Upcoming</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color={CHECKIN_DANGER}><Clock size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{overdue}</QStatVal>
            <QStatLbl>Overdue</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color={CHECKIN_PURPLE}><Repeat size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{triggers.filter((trigger) => trigger.enabled).length}</QStatVal>
            <QStatLbl>Active Triggers</QStatLbl>
          </QStatInfo>
        </QStat>
        <QStat>
          <QStatIcon $color={CHECKIN_SUCCESS}><Footprints size={16} /></QStatIcon>
          <QStatInfo>
            <QStatVal>{habits.length}</QStatVal>
            <QStatLbl>Tracked Habits</QStatLbl>
          </QStatInfo>
        </QStat>
      </QuickStats>

      <TabBar>
        {([
          { id: 'check-ins' as const, label: 'Check-Ins', icon: <MessageSquare size={14} /> },
          { id: 'habits' as const, label: 'Habits', icon: <Droplets size={14} /> },
          { id: 'triggers' as const, label: 'Triggers', icon: <Zap size={14} /> },
        ]).map((item) => (
          <TabBtn key={item.id} $active={tab === item.id} onClick={() => setTab(item.id)}>
            {item.icon} {item.label}
          </TabBtn>
        ))}
      </TabBar>

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
                checkIns.map((checkIn) => (
                  <CheckInRow key={checkIn.id} $status={checkIn.status}>
                    <CIStatus $status={checkIn.status}>
                      {checkIn.status === 'overdue'
                        ? <Clock size={14} />
                        : checkIn.status === 'sent'
                          ? <CheckCircle2 size={14} />
                          : <CalendarCheck size={14} />}
                    </CIStatus>
                    <CIInfo>
                      <CIClient>{checkIn.clientName}</CIClient>
                      <CITemplate>{checkIn.template}</CITemplate>
                      <CIMeta>
                        <Repeat size={10} /> {checkIn.type} &bull; Due {formatDate(checkIn.nextDue)}
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
              ) : habits.map((habit, index) => (
                <HabitRow key={`${habit.habit}-${index}`}>
                  <HabitIcon>{habit.icon ?? <Footprints size={16} />}</HabitIcon>
                  <HabitInfo>
                    <HabitName>{habit.habit}</HabitName>
                    <HabitMeta>{habit.activeClients} clients tracking</HabitMeta>
                  </HabitInfo>
                  <HabitStats>
                    <HabitBar>
                      <HabitBarFill $pct={habit.avgCompletion} />
                    </HabitBar>
                    <HabitPct>{habit.avgCompletion}%</HabitPct>
                  </HabitStats>
                  <StreakBadge>
                    <Zap size={10} /> {habit.streakLeader}: {habit.streakDays}d
                  </StreakBadge>
                </HabitRow>
              ))}
            </motion.div>
          )}

          {!error && tab === 'triggers' && (
            <motion.div key="tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? <LoadingRows /> : triggers.length === 0 ? (
                <EmptyMsg>No automation triggers returned yet.</EmptyMsg>
              ) : triggers.map((trigger) => (
                <TriggerRow key={trigger.id}>
                  <TriggerHeader onClick={() => setExpandedTrigger(expandedTrigger === trigger.id ? null : trigger.id)}>
                    <TriggerDot $active={trigger.enabled} />
                    <TriggerInfo>
                      <TriggerName>{trigger.name}</TriggerName>
                      <TriggerMeta>Fired {trigger.firedCount} times</TriggerMeta>
                    </TriggerInfo>
                    {expandedTrigger === trigger.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </TriggerHeader>
                  {expandedTrigger === trigger.id && (
                    <TriggerDetail>
                      <TriggerLine><strong>When:</strong> {trigger.condition}</TriggerLine>
                      <TriggerLine><strong>Then:</strong> {trigger.action}</TriggerLine>
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

function formatDate(iso: string): string {
  const targetDate = new Date(iso);
  const now = new Date();
  const diff = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

const LoadingRows = () => (
  <>
    {Array.from({ length: 3 }).map((_, index) => (
      <SkeletonRow key={index} />
    ))}
  </>
);

export default AutomatedCheckInsWidget;
