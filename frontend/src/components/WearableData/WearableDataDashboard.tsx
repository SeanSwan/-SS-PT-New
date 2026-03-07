/**
 * WearableDataDashboard
 * =====================
 * Comprehensive wearable health data visualization with Galaxy-Swan theme.
 * Displays steps, heart rate, sleep, swimming, cycling, running metrics.
 * Supports data sync from Fitbit, Apple Health, Garmin, Samsung, Whoop, Oura.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Watch, Heart, Moon, Footprints, Flame, Activity,
  Upload, RefreshCw, TrendingUp, Droplets,
  Timer, Bike, MapPin, Share2,
} from 'lucide-react';
import { wearableDataService, WearableRecord, WearableSummary, WearableDevice } from '../../services/wearableDataService';
import { toast } from 'react-toastify';

// Galaxy-Swan colors
const C = {
  deepSpace: '#0a0a1a',
  cardSurface: 'rgba(20, 24, 48, 0.85)',
  stellarWhite: '#f0f0ff',
  cyberBlue: '#00d4ff',
  cosmicPurple: '#7851A9',
  swanCyan: '#00FFFF',
  mutedText: '#8892b0',
  successGreen: '#10b981',
  dangerRed: '#ef4444',
  warningAmber: '#f59e0b',
  swimBlue: '#3b82f6',
  cyclingGreen: '#22c55e',
  runOrange: '#f97316',
  glassStroke: 'rgba(0, 212, 255, 0.12)',
};

// ---- Styled Components ----

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${C.stellarWhite};
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardGrid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.columns || 4}, 1fr);
  gap: 16px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const GlassCard = styled(motion.div)<{ $accent?: string }>`
  background: ${C.cardSurface};
  backdrop-filter: blur(16px);
  border: 1px solid ${p => p.$accent ? `${p.$accent}20` : C.glassStroke};
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${p => p.$accent || C.cyberBlue};
    opacity: 0.6;
  }
`;

const MetricValue = styled.div<{ $color?: string }>`
  font-size: 28px;
  font-weight: 700;
  color: ${p => p.$color || C.stellarWhite};
  line-height: 1.2;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${C.mutedText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const MetricChange = styled.span<{ $positive?: boolean }>`
  font-size: 12px;
  color: ${p => p.$positive ? C.successGreen : C.dangerRed};
  margin-left: 6px;
`;

const ChartContainer = styled(GlassCard)`
  min-height: 280px;
`;

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $active?: boolean; $color?: string }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: ${p => p.$active ? (p.$color || C.cyberBlue) + '20' : 'transparent'};
  color: ${p => p.$active ? (p.$color || C.cyberBlue) : C.mutedText};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.06); }
  &:focus-visible { outline: 2px solid ${C.cyberBlue}; outline-offset: 2px; }
`;

const SyncButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid ${C.glassStroke};
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: ${C.cyberBlue};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  &:hover { background: rgba(0, 212, 255, 0.08); border-color: ${C.cyberBlue}; }
  &:focus-visible { outline: 2px solid ${C.cyberBlue}; outline-offset: 2px; }
`;

const DeviceChip = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  background: ${p => p.$active ? `${C.successGreen}20` : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? C.successGreen : C.mutedText};
  border: 1px solid ${p => p.$active ? `${C.successGreen}40` : 'transparent'};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${C.mutedText};

  h3 { color: ${C.stellarWhite}; font-size: 18px; margin-bottom: 8px; }
  p { font-size: 14px; max-width: 400px; margin: 0 auto 16px; }
`;

// ---- Chart tooltip ----
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.cardSurface, border: `1px solid ${C.glassStroke}`,
      borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontSize: 12, color: C.mutedText, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 500 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ---- Helper functions ----
const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const metersToMiles = (m: number) => (m / 1609.34).toFixed(1);
const metersToKm = (m: number) => (m / 1000).toFixed(1);
const minsToHrMin = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

// ---- Component ----

interface Props {
  userId?: number; // If provided, shows data for this user (admin/trainer view)
}

const WearableDataDashboard: React.FC<Props> = ({ userId }) => {
  const [summary, setSummary] = useState<WearableSummary | null>(null);
  const [records, setRecords] = useState<WearableRecord[]>([]);
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'heart' | 'sleep' | 'swim' | 'cycle' | 'run'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, recordsData, devicesData] = await Promise.all([
        userId ? wearableDataService.getClientSummary(userId) : wearableDataService.getSummary(),
        userId ? wearableDataService.getClientData(userId, { days: 30 }) : wearableDataService.getData({ days: 30 }),
        wearableDataService.getDevices(),
      ]);
      setSummary(summaryData);
      setRecords(recordsData);
      setDevices(devicesData);
    } catch (err) {
      console.error('Failed to load wearable data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data: Record<string, unknown>[];
      let deviceType: string;

      if (file.name.endsWith('.xml') || text.trimStart().startsWith('<?xml')) {
        // Apple Health XML export
        deviceType = 'apple_health';
        data = wearableDataService.parseAppleHealthExport(text);
      } else {
        // JSON export (Fitbit, Garmin, etc.)
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : [json];
        // Try to detect device type from data structure
        if (items[0]?.summary?.steps !== undefined) {
          deviceType = 'fitbit';
          data = wearableDataService.parseFitbitExport(items);
        } else if (items[0]?.totalSteps !== undefined || items[0]?.calendarDate) {
          deviceType = 'garmin';
          data = wearableDataService.parseGarminExport(items);
        } else {
          deviceType = 'manual';
          data = items;
        }
      }

      const result = await wearableDataService.syncData(deviceType, data);
      toast.success(`Synced ${result.results?.length || 0} records from ${deviceType}`);
      loadData();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShareToFeed = async () => {
    if (!latest) return;
    const metrics: { label: string; value: string }[] = [];

    if (activeTab === 'overview' || activeTab === 'activity') {
      if (latest.steps) metrics.push({ label: 'Steps', value: latest.steps.toLocaleString() });
      if (latest.activeMinutes) metrics.push({ label: 'Active Minutes', value: `${latest.activeMinutes}` });
      if (latest.caloriesBurned) metrics.push({ label: 'Calories', value: latest.caloriesBurned.toLocaleString() });
      if (latest.distanceMeters) metrics.push({ label: 'Distance', value: `${metersToMiles(latest.distanceMeters)} mi` });
    }
    if (activeTab === 'overview' || activeTab === 'heart') {
      if (latest.restingHeartRate) metrics.push({ label: 'Resting HR', value: `${latest.restingHeartRate} bpm` });
      if (latest.heartRateVariability) metrics.push({ label: 'HRV', value: `${latest.heartRateVariability.toFixed(0)} ms` });
    }
    if (activeTab === 'overview' || activeTab === 'sleep') {
      if (latest.sleepDurationMinutes) metrics.push({ label: 'Sleep', value: minsToHrMin(latest.sleepDurationMinutes) });
      if (latest.sleepScore) metrics.push({ label: 'Sleep Score', value: `${latest.sleepScore}` });
    }
    if (activeTab === 'swim') {
      if (latest.swimDistanceMeters) metrics.push({ label: 'Swim Distance', value: `${metersToKm(latest.swimDistanceMeters)} km` });
      if (latest.swimLaps) metrics.push({ label: 'Laps', value: `${latest.swimLaps}` });
      if (latest.swimDurationMinutes) metrics.push({ label: 'Duration', value: minsToHrMin(latest.swimDurationMinutes) });
      if (latest.swimSWOLF) metrics.push({ label: 'SWOLF', value: `${latest.swimSWOLF.toFixed(0)}` });
    }
    if (activeTab === 'cycle') {
      if (latest.cyclingDistanceMeters) metrics.push({ label: 'Ride Distance', value: `${metersToKm(latest.cyclingDistanceMeters)} km` });
      if (latest.cyclingAvgSpeedKmh) metrics.push({ label: 'Avg Speed', value: `${latest.cyclingAvgSpeedKmh.toFixed(1)} km/h` });
      if (latest.cyclingAvgPowerWatts) metrics.push({ label: 'Avg Power', value: `${latest.cyclingAvgPowerWatts.toFixed(0)} W` });
    }
    if (activeTab === 'run') {
      if (latest.runDistanceMeters) metrics.push({ label: 'Run Distance', value: `${metersToKm(latest.runDistanceMeters)} km` });
      if (latest.runAvgPaceMinPerKm) metrics.push({ label: 'Avg Pace', value: `${latest.runAvgPaceMinPerKm.toFixed(2)} min/km` });
      if (latest.runAvgCadence) metrics.push({ label: 'Cadence', value: `${latest.runAvgCadence} spm` });
    }

    if (!metrics.length) {
      toast.info('No metrics to share for this tab');
      return;
    }

    try {
      await wearableDataService.shareToFeed(activeTab, metrics);
      toast.success('Stats shared to your feed!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to share stats');
    }
  };

  // Prepare chart data from records
  const chartData = [...records]
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
    .map(r => ({
      date: formatDate(r.recordDate),
      ...r,
    }));

  const latest = summary?.latest;
  const hasSwimData = records.some(r => r.swimDistanceMeters || r.swimLaps);
  const hasCycleData = records.some(r => r.cyclingDistanceMeters);
  const hasRunData = records.some(r => r.runDistanceMeters);

  if (loading) {
    return (
      <DashboardContainer>
        <GlassCard style={{ textAlign: 'center', padding: 48 }}>
          <RefreshCw size={24} color={C.cyberBlue} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: C.mutedText, marginTop: 12 }}>Loading wearable data...</p>
        </GlassCard>
      </DashboardContainer>
    );
  }

  if (!records.length && !summary?.latest) {
    return (
      <DashboardContainer>
        <EmptyState>
          <Watch size={48} color={C.cyberBlue} style={{ marginBottom: 16 }} />
          <h3>Connect Your Wearable</h3>
          <p>Sync data from Fitbit, Apple Watch, Garmin, Samsung Health, WHOOP, or Oura Ring to see your health metrics here.</p>
          <SyncButton onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Data File
          </SyncButton>
          <input ref={fileInputRef} type="file" accept=".json,.xml,.csv" hidden onChange={handleFileUpload} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {devices.map(d => <DeviceChip key={d.id}>{d.name}</DeviceChip>)}
          </div>
        </EmptyState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      {/* Header */}
      <HeaderRow>
        <div>
          <SectionTitle><Activity size={20} color={C.cyberBlue} /> Wearable Health Data</SectionTitle>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {summary?.connectedDevices.map(d => (
              <DeviceChip key={d} $active>{d.replace('_', ' ')}</DeviceChip>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SyncButton onClick={handleShareToFeed}>
            <Share2 size={16} /> Share to Feed
          </SyncButton>
          <SyncButton onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import
          </SyncButton>
          <SyncButton onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </SyncButton>
          <input ref={fileInputRef} type="file" accept=".json,.xml,.csv" hidden onChange={handleFileUpload} />
        </div>
      </HeaderRow>

      {/* Tabs */}
      <TabBar>
        <Tab $active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}><TrendingUp size={14} /> Overview</Tab>
        <Tab $active={activeTab === 'activity'} $color={C.successGreen} onClick={() => setActiveTab('activity')}><Footprints size={14} /> Activity</Tab>
        <Tab $active={activeTab === 'heart'} $color={C.dangerRed} onClick={() => setActiveTab('heart')}><Heart size={14} /> Heart</Tab>
        <Tab $active={activeTab === 'sleep'} $color={C.cosmicPurple} onClick={() => setActiveTab('sleep')}><Moon size={14} /> Sleep</Tab>
        {hasSwimData && <Tab $active={activeTab === 'swim'} $color={C.swimBlue} onClick={() => setActiveTab('swim')}><Droplets size={14} /> Swim</Tab>}
        {hasCycleData && <Tab $active={activeTab === 'cycle'} $color={C.cyclingGreen} onClick={() => setActiveTab('cycle')}><Bike size={14} /> Cycle</Tab>}
        {hasRunData && <Tab $active={activeTab === 'run'} $color={C.runOrange} onClick={() => setActiveTab('run')}><MapPin size={14} /> Run</Tab>}
      </TabBar>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'overview' && (
            <>
              {/* Quick Stats */}
              <CardGrid columns={4}>
                <GlassCard $accent={C.successGreen}>
                  <MetricLabel>Steps Today</MetricLabel>
                  <MetricValue $color={C.successGreen}>{latest?.steps?.toLocaleString() || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.dangerRed}>
                  <MetricLabel>Resting HR</MetricLabel>
                  <MetricValue $color={C.dangerRed}>{latest?.restingHeartRate || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>bpm</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cosmicPurple}>
                  <MetricLabel>Sleep</MetricLabel>
                  <MetricValue $color={C.cosmicPurple}>{latest?.sleepDurationMinutes ? minsToHrMin(latest.sleepDurationMinutes) : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.warningAmber}>
                  <MetricLabel>Calories</MetricLabel>
                  <MetricValue $color={C.warningAmber}>{latest?.caloriesBurned?.toLocaleString() || '--'}</MetricValue>
                </GlassCard>
              </CardGrid>

              {/* Trend Chart */}
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle>30-Day Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.successGreen} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.successGreen} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="steps" stroke={C.successGreen} fill="url(#stepsGrad)" name="Steps" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'activity' && (
            <>
              <CardGrid columns={3}>
                <GlassCard $accent={C.successGreen}>
                  <MetricLabel>Active Minutes</MetricLabel>
                  <MetricValue $color={C.successGreen}>{latest?.activeMinutes || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>Distance</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.distanceMeters ? `${metersToMiles(latest.distanceMeters)} mi` : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.warningAmber}>
                  <MetricLabel>Active Calories</MetricLabel>
                  <MetricValue $color={C.warningAmber}>{latest?.activeCalories?.toLocaleString() || '--'}</MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle>Daily Activity</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="steps" fill={C.successGreen} name="Steps" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activeMinutes" fill={C.cyberBlue} name="Active Min" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'heart' && (
            <>
              <CardGrid columns={4}>
                <GlassCard $accent={C.dangerRed}>
                  <MetricLabel>Resting HR</MetricLabel>
                  <MetricValue $color={C.dangerRed}>{latest?.restingHeartRate || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.warningAmber}>
                  <MetricLabel>Avg HR</MetricLabel>
                  <MetricValue $color={C.warningAmber}>{latest?.avgHeartRate || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cosmicPurple}>
                  <MetricLabel>HRV</MetricLabel>
                  <MetricValue $color={C.cosmicPurple}>{latest?.heartRateVariability?.toFixed(0) || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>ms</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>SpO2</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.spo2 ? `${latest.spo2.toFixed(0)}%` : '--'}</MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle><Heart size={16} color={C.dangerRed} /> Heart Rate Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="restingHeartRate" stroke={C.dangerRed} name="Resting HR" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="avgHeartRate" stroke={C.warningAmber} name="Avg HR" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="heartRateVariability" stroke={C.cosmicPurple} name="HRV" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'sleep' && (
            <>
              <CardGrid columns={3}>
                <GlassCard $accent={C.cosmicPurple}>
                  <MetricLabel>Sleep Duration</MetricLabel>
                  <MetricValue $color={C.cosmicPurple}>{latest?.sleepDurationMinutes ? minsToHrMin(latest.sleepDurationMinutes) : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>Sleep Score</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.sleepScore || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.successGreen}>
                  <MetricLabel>Recovery</MetricLabel>
                  <MetricValue $color={C.successGreen}>{latest?.bodyBatteryOrRecovery || '--'}</MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle><Moon size={16} color={C.cosmicPurple} /> Sleep Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.cosmicPurple} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.cosmicPurple} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sleepDurationMinutes" stroke={C.cosmicPurple} fill="url(#sleepGrad)" name="Sleep (min)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'swim' && (
            <>
              <CardGrid columns={4}>
                <GlassCard $accent={C.swimBlue}>
                  <MetricLabel>Distance</MetricLabel>
                  <MetricValue $color={C.swimBlue}>{latest?.swimDistanceMeters ? `${metersToKm(latest.swimDistanceMeters)} km` : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>Laps</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.swimLaps || '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cosmicPurple}>
                  <MetricLabel>Duration</MetricLabel>
                  <MetricValue $color={C.cosmicPurple}>{latest?.swimDurationMinutes ? minsToHrMin(latest.swimDurationMinutes) : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.successGreen}>
                  <MetricLabel>SWOLF</MetricLabel>
                  <MetricValue $color={C.successGreen}>{latest?.swimSWOLF?.toFixed(0) || '--'}</MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle><Droplets size={16} color={C.swimBlue} /> Swimming Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData.filter(d => d.swimDistanceMeters)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="swimDistanceMeters" fill={C.swimBlue} name="Distance (m)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="swimLaps" fill={C.cyberBlue} name="Laps" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'cycle' && (
            <>
              <CardGrid columns={4}>
                <GlassCard $accent={C.cyclingGreen}>
                  <MetricLabel>Distance</MetricLabel>
                  <MetricValue $color={C.cyclingGreen}>{latest?.cyclingDistanceMeters ? `${metersToKm(latest.cyclingDistanceMeters)} km` : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>Avg Speed</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.cyclingAvgSpeedKmh?.toFixed(1) || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>km/h</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.warningAmber}>
                  <MetricLabel>Avg Power</MetricLabel>
                  <MetricValue $color={C.warningAmber}>{latest?.cyclingAvgPowerWatts?.toFixed(0) || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>W</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cosmicPurple}>
                  <MetricLabel>Elevation</MetricLabel>
                  <MetricValue $color={C.cosmicPurple}>{latest?.cyclingElevationGainMeters?.toFixed(0) || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>m</span></MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle><Bike size={16} color={C.cyclingGreen} /> Cycling Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData.filter(d => d.cyclingDistanceMeters)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="cyclingDistanceMeters" stroke={C.cyclingGreen} name="Distance (m)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="cyclingAvgSpeedKmh" stroke={C.cyberBlue} name="Speed (km/h)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}

          {activeTab === 'run' && (
            <>
              <CardGrid columns={4}>
                <GlassCard $accent={C.runOrange}>
                  <MetricLabel>Distance</MetricLabel>
                  <MetricValue $color={C.runOrange}>{latest?.runDistanceMeters ? `${metersToKm(latest.runDistanceMeters)} km` : '--'}</MetricValue>
                </GlassCard>
                <GlassCard $accent={C.cyberBlue}>
                  <MetricLabel>Avg Pace</MetricLabel>
                  <MetricValue $color={C.cyberBlue}>{latest?.runAvgPaceMinPerKm?.toFixed(2) || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>min/km</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.successGreen}>
                  <MetricLabel>Cadence</MetricLabel>
                  <MetricValue $color={C.successGreen}>{latest?.runAvgCadence || '--'} <span style={{ fontSize: 14, color: C.mutedText }}>spm</span></MetricValue>
                </GlassCard>
                <GlassCard $accent={C.warningAmber}>
                  <MetricLabel>Training Effect</MetricLabel>
                  <MetricValue $color={C.warningAmber}>{latest?.runTrainingEffect?.toFixed(1) || '--'}</MetricValue>
                </GlassCard>
              </CardGrid>
              <ChartContainer style={{ marginTop: 16 }}>
                <SectionTitle><MapPin size={16} color={C.runOrange} /> Running Trends</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData.filter(d => d.runDistanceMeters)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <YAxis tick={{ fill: C.mutedText, fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="runDistanceMeters" fill={C.runOrange} name="Distance (m)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="runDurationMinutes" fill={C.cyberBlue} name="Duration (min)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </DashboardContainer>
  );
};

export default WearableDataDashboard;
