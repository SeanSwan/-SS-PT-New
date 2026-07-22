import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import BodyMapSVG from './BodyMapSVG';
import BodyMapToolbar, { type AnatomyGender, type LabelMode } from './BodyMapToolbar';
import BodyMapEvidenceSection from './BodyMapEvidenceSection';
import BodyMapClientTargetSelector from './BodyMapClientTargetSelector';
import PainEntryPanel from './PainEntryPanel';
import PainChartInsightPanel from './PainChartInsightPanel';
import PainChartCoachDockMount from '../CoachDock/PainChartCoachDockMount';
import { getSeverityColor } from './bodyRegions';
import { createPainEntryService, type PainEntry, type CreatePainEntryPayload } from '../../services/painEntryService';
import { useAuth } from '../../context/AuthContext';
import GlobalClientContext from '../../context/GlobalClientContext';
import { device } from '../../styles/breakpoints';
import { StyledBox } from '@/components/ui/StyledBox';

const BodyMapSection = styled.div`
  background: ${({ theme }) => theme.background?.card || 'rgba(0, 32, 96, 0.4)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(139, 92, 246, 0.1)'};
  border-radius: 20px;
  backdrop-filter: blur(8px);
  padding: 16px;
  margin-bottom: 24px;
  overflow-x: hidden;
  max-width: 100%;
  box-sizing: border-box;
  ${device.sm} { padding: 24px; }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.text?.primary || 'var(--text-primary, #fff)'};
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const SummaryBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  /* color-mix, not hex-concat: $color is now a var(--token, #fallback) expression (Rule 6),
     and "var(...)1A" is invalid CSS — concat only worked when $color was a raw hex. */
  background: ${({ $color }) => `color-mix(in srgb, ${$color} 10%, transparent)`};
  border: 1px solid ${({ $color }) => `color-mix(in srgb, ${$color} 27%, transparent)`};
  color: ${({ $color }) => $color};
`;

const ActiveEntriesList = styled.div` margin-top: 20px; `;

const ActiveEntryRow = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid ${({ $color }) => `${$color}33`};
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 44px;
  &:hover { border-color: ${({ $color }) => $color}; }
`;

const DotIndicator = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => $color};
  flex-shrink: 0;
`;

const EntryLabel = styled.span`
  color: ${({ theme }) => theme.text?.primary || 'var(--text-primary, #fff)'};
  font-size: 14px;
  flex: 1;
`;

const EntryMeta = styled.span`
  color: ${({ theme }) => theme.text?.muted || 'rgba(255, 255, 255, 0.4)'};
  font-size: 12px;
`;

const StatusText = styled.p`
  color: ${({ theme }) => theme.text?.muted || 'rgba(255, 255, 255, 0.4)'};
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
`;

const ErrorText = styled.p`
  color: var(--danger, #FF5555);
  font-size: 13px;
  text-align: center;
  padding: 12px;
  background: rgba(255, 50, 50, 0.1);
  border-radius: 8px;
`;

const EntriesLabel = styled.div`
  color: ${({ theme }) => theme.text?.muted || 'rgba(255, 255, 255, 0.5)'};
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

interface BodyMapProps { userId?: number; mode?: 'trainer' | 'client'; }

const resolveAnatomyGender = (value?: string | null): AnatomyGender | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (['female', 'woman', 'f'].includes(normalized)) return 'female';
  if (['male', 'man', 'm'].includes(normalized)) return 'male';
  return null;
};

const BodyMap: React.FC<BodyMapProps> = ({ userId: userIdProp, mode }) => {
  const { user, authAxios } = useAuth() as any;
  const globalClient = useContext(GlobalClientContext);
  const isAdmin = user?.role === 'admin';
  const isTrainerOrAdmin = user?.role === 'admin' || user?.role === 'trainer';
  const verifiedActiveClient = globalClient?.activeClient && globalClient.clientList.some(
    (client) => client.id === globalClient.activeClient?.id,
  )
    ? globalClient.activeClient
    : null;
  const activeClientProfile = verifiedActiveClient as any;
  const staffTargetClientId = userIdProp ?? verifiedActiveClient?.id;
  const userId = isTrainerOrAdmin ? staffTargetClientId : userIdProp ?? user?.id;
  const profileGender = isTrainerOrAdmin ? activeClientProfile?.gender : user?.gender;
  const profilePhotoUrl = isTrainerOrAdmin ? activeClientProfile?.photo ?? null : user?.photo ?? user?.profileImageUrl ?? null;
  const entryService = useMemo(() => (authAxios ? createPainEntryService(authAxios) : null), [authAxios]);

  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [targetNotice, setTargetNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [gender, setGender] = useState<AnatomyGender>('male');
  const [labelMode, setLabelMode] = useState<LabelMode>('off');

  useEffect(() => {
    const resolved = resolveAnatomyGender(profileGender);
    if (resolved) setGender(resolved);
  }, [profileGender, userId]);

  const effectiveMode = mode || (isTrainerOrAdmin ? 'trainer' : 'client');
  const isClientMode = effectiveMode === 'client';
  const isOwnData = user?.id === userId;
  const canWrite = Boolean(userId) && (isTrainerOrAdmin || (isClientMode && isOwnData));
  const activeEntries = useMemo(() => entries.filter((entry) => entry.isActive), [entries]);
  const showStaffClientSelector = isTrainerOrAdmin && !userIdProp;
  const resolvedCount = entries.length - activeEntries.length;

  const handleTargetClientChange = useCallback((clientId: number | null) => {
    if (!globalClient) return;

    if (!clientId) {
      globalClient.clearActiveClient();
      setTargetNotice(null);
      setPanelOpen(false);
      setSelectedRegion(null);
      return;
    }

    const nextClient = globalClient.clientList.find((client) => client.id === clientId);
    if (nextClient) {
      globalClient.setActiveClient(nextClient);
      setTargetNotice(null);
    }
  }, [globalClient]);

  const fetchEntries = useCallback(async () => {
    if (!entryService || !userId) {
      setEntries([]); setLoading(false); setError(null); return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await entryService.getAll(userId);
      setEntries(result.entries || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [entryService, userId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Region click handler
  const handleRegionClick = useCallback(
    (regionId: string) => {
      setSelectedRegion(regionId);
      if (canWrite) {
        setTargetNotice(null);
        setPanelOpen(true);
        return;
      }
      if (isTrainerOrAdmin && !userId) {
        setTargetNotice('Select a client before adding pain details.');
      }
    },
    [canWrite, isTrainerOrAdmin, userId],
  );

  useEffect(() => {
    if (selectedRegion && canWrite && !panelOpen) {
      setTargetNotice(null);
      setPanelOpen(true);
    }
  }, [selectedRegion, canWrite, panelOpen]);

  // Get existing entry for selected region
  const existingEntry = useMemo(() => {
    if (!selectedRegion) return null;
    return activeEntries.find((e) => e.bodyRegion === selectedRegion) || null;
  }, [selectedRegion, activeEntries]);

  const handleSave = useCallback(async (payload: CreatePainEntryPayload) => {
    if (!entryService || !canWrite || !userId) return;
    setIsSaving(true);
    try {
      if (existingEntry) await entryService.update(userId, existingEntry.id, payload);
      else await entryService.create(userId, payload);
      await fetchEntries(); setPanelOpen(false); setSelectedRegion(payload.bodyRegion);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [entryService, userId, existingEntry, canWrite, fetchEntries]);

  const handleResolve = useCallback(async (entryId: number) => {
    if (!entryService || !canWrite || !userId) return;
    setIsSaving(true);
    try {
      await entryService.resolve(userId, entryId);
      await fetchEntries(); setPanelOpen(false); setSelectedRegion(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resolve');
    } finally {
      setIsSaving(false);
    }
  }, [entryService, userId, canWrite, fetchEntries]);

  const handleDelete = useCallback(async (entryId: number) => {
    if (!entryService || !isAdmin || !userId) return;
    setIsSaving(true);
    try {
      await entryService.remove(userId, entryId);
      await fetchEntries(); setPanelOpen(false); setSelectedRegion(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setIsSaving(false);
    }
  }, [entryService, userId, isAdmin, fetchEntries]);

  // Summary counts
  const severeCount = activeEntries.filter((e) => e.painLevel >= 7).length;
  const moderateCount = activeEntries.filter((e) => e.painLevel >= 4 && e.painLevel < 7).length;
  const mildCount = activeEntries.filter((e) => e.painLevel < 4).length;

  const formatRegionLabel = (region: string) =>
    region
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <BodyMapSection>
      <SectionHeader>
        <SectionTitle>Body Map</SectionTitle>
        {entries.length > 0 && (
          <StyledBox as="div" $style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SummaryBadge $color="var(--text-primary, #E0ECF4)">
              {activeEntries.length} active
            </SummaryBadge>
            {resolvedCount > 0 && (
              <SummaryBadge $color="var(--tertiary, #4070C0)">{resolvedCount} resolved</SummaryBadge>
            )}
            {severeCount > 0 && (
              <SummaryBadge $color="var(--accent-luxury, #C6A84B)">{severeCount} severe</SummaryBadge>
            )}
            {moderateCount > 0 && (
              <SummaryBadge $color="var(--data-accent, #50A0F0)">{moderateCount} moderate</SummaryBadge>
            )}
            {mildCount > 0 && (
              <SummaryBadge $color="var(--accent-primary, #60C0F0)">{mildCount} mild</SummaryBadge>
            )}
          </StyledBox>
        )}
      </SectionHeader>

      {loading && <StatusText>Loading entries...</StatusText>}
      {error && <ErrorText>{error}</ErrorText>}

      {showStaffClientSelector && (
        <BodyMapClientTargetSelector
          clients={globalClient?.clientList ?? []}
          selectedClientId={staffTargetClientId ?? null}
          loading={Boolean(globalClient?.loadingClients)}
          notice={targetNotice}
          onChange={handleTargetClientChange}
        />
      )}

      {!loading && (
        <>
          <BodyMapToolbar
            gender={gender}
            labelMode={labelMode}
            onGenderChange={setGender}
            onLabelModeChange={setLabelMode}
          />
          <BodyMapSVG
            painEntries={activeEntries}
            selectedRegion={selectedRegion}
            onRegionClick={handleRegionClick}
            gender={gender}
            labelMode={labelMode}
            profilePhotoUrl={profilePhotoUrl}
          />

          {activeEntries.length > 0 && (
            <ActiveEntriesList>
              <EntriesLabel>Active Pain Entries</EntriesLabel>
              {activeEntries.map((entry) => {
                const color = getSeverityColor(entry.painLevel);
                return (
                  <ActiveEntryRow key={entry.id} $color={color} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }} onClick={() => handleRegionClick(entry.bodyRegion)}>
                    <DotIndicator $color={color} />
                    <EntryLabel>{formatRegionLabel(entry.bodyRegion)}</EntryLabel>
                    <EntryMeta>{entry.painLevel}/10 &middot; {entry.painType}</EntryMeta>
                  </ActiveEntryRow>
                );
              })}
            </ActiveEntriesList>
          )}

          {selectedRegion && userId && <BodyMapEvidenceSection userId={userId} entryId={existingEntry?.id ?? null} isClientMode={isClientMode} />}

          {entries.length > 0 && (
            <PainChartInsightPanel
              entries={entries}
              isClientMode={isClientMode}
              onSelectRegion={handleRegionClick}
            />
          )}
          {activeEntries.length === 0 && !loading && (
            <StatusText>
              {!userId
                ? 'Select a client to view pain and injury entries.'
                : entries.length > 0
                ? 'No active pain entries right now. Resolved history is available below.'
                : isClientMode
                ? 'Tap any area where you feel pain or discomfort to log it. Your trainer will see this when planning your workouts.'
                : 'No active pain entries. Click a body region to add one.'}
            </StatusText>
          )}
        </>
      )}

      {canWrite && (
        <PainEntryPanel
          regionId={selectedRegion}
          existingEntry={existingEntry}
          isOpen={panelOpen}
          isSaving={isSaving}
          onClose={() => { setPanelOpen(false); setSelectedRegion(null); }}
          onSave={handleSave}
          onResolve={handleResolve}
          onDelete={handleDelete}
          isAdmin={isAdmin}
          isClientMode={isClientMode}
        />
      )}
      {/* CC-4: Swan Coach dock — trainer/admin conversational pain-chart review + region-select tool. */}
      {isTrainerOrAdmin && <PainChartCoachDockMount contextChip={userId ? `client: #${userId}` : null} selectedClientId={userId ?? null} onSelectRegion={(regionId) => setSelectedRegion(regionId)} />}
    </BodyMapSection>
  );
};

export default BodyMap;
