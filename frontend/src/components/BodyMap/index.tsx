/**
 * BodyMap — Orchestrator Component
 * =================================
 * Main export for the Pain/Injury Body Map system.
 * Manages state, API calls, and coordinates BodyMapSVG + PainEntryPanel.
 *
 * Usage: <BodyMap userId={123} />
 *
 * Phase 12 — Pain/Injury Body Map (NASM CES + Squat University)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import BodyMapSVG from './BodyMapSVG';
import PainEntryPanel from './PainEntryPanel';
import { getSeverityColor } from './bodyRegions';
import {
  createPainEntryService,
  type PainEntry,
  type CreatePainEntryPayload,
} from '../../services/painEntryService';
import { useAuth } from '../../context/AuthContext';

// ── Styled Components ───────────────────────────────────────────────────

const BodyMapSection = styled.div`
  background: rgba(10, 10, 26, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(8px);
  padding: 24px;
  margin-bottom: 24px;
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
  color: #fff;
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
  background: ${({ $color }) => `${$color}1A`};
  border: 1px solid ${({ $color }) => `${$color}44`};
  color: ${({ $color }) => $color};
`;

const ActiveEntriesList = styled.div`
  margin-top: 20px;
`;

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
  &:hover {
    border-color: ${({ $color }) => $color};
  }
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
  color: #fff;
  font-size: 14px;
  flex: 1;
`;

const EntryMeta = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
`;

const ErrorText = styled.p`
  color: #FF5555;
  font-size: 13px;
  text-align: center;
  padding: 12px;
  background: rgba(255, 50, 50, 0.1);
  border-radius: 8px;
`;

// ── Component ───────────────────────────────────────────────────────────

interface BodyMapProps {
  userId: number;
}

const BodyMap: React.FC<BodyMapProps> = ({ userId }) => {
  const { user, authAxios } = useAuth() as any;
  const painService = useMemo(
    () => (authAxios ? createPainEntryService(authAxios) : null),
    [authAxios],
  );

  const [entries, setEntries] = useState<PainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isTrainerOrAdmin = user?.role === 'admin' || user?.role === 'trainer';

  // Fetch entries on mount
  const fetchEntries = useCallback(async () => {
    if (!painService) return;
    try {
      setLoading(true);
      setError(null);
      const result = await painService.getActive(userId);
      setEntries(result.entries || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load pain entries');
    } finally {
      setLoading(false);
    }
  }, [painService, userId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Region click handler
  const handleRegionClick = useCallback(
    (regionId: string) => {
      setSelectedRegion(regionId);
      setPanelOpen(true);
    },
    [],
  );

  // Get existing entry for selected region
  const existingEntry = useMemo(() => {
    if (!selectedRegion) return null;
    return entries.find((e) => e.bodyRegion === selectedRegion && e.isActive) || null;
  }, [selectedRegion, entries]);

  // Save handler
  const handleSave = useCallback(
    async (payload: CreatePainEntryPayload) => {
      if (!painService || !isTrainerOrAdmin) return;
      setIsSaving(true);
      try {
        if (existingEntry) {
          await painService.update(userId, existingEntry.id, payload);
        } else {
          await painService.create(userId, payload);
        }
        await fetchEntries();
        setPanelOpen(false);
        setSelectedRegion(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [painService, userId, existingEntry, isTrainerOrAdmin, fetchEntries],
  );

  // Resolve handler
  const handleResolve = useCallback(
    async (entryId: number) => {
      if (!painService || !isTrainerOrAdmin) return;
      setIsSaving(true);
      try {
        await painService.resolve(userId, entryId);
        await fetchEntries();
        setPanelOpen(false);
        setSelectedRegion(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to resolve');
      } finally {
        setIsSaving(false);
      }
    },
    [painService, userId, isTrainerOrAdmin, fetchEntries],
  );

  // Delete handler
  const handleDelete = useCallback(
    async (entryId: number) => {
      if (!painService || !isAdmin) return;
      setIsSaving(true);
      try {
        await painService.remove(userId, entryId);
        await fetchEntries();
        setPanelOpen(false);
        setSelectedRegion(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to delete');
      } finally {
        setIsSaving(false);
      }
    },
    [painService, userId, isAdmin, fetchEntries],
  );

  // Summary counts
  const severeCount = entries.filter((e) => e.painLevel >= 7).length;
  const moderateCount = entries.filter((e) => e.painLevel >= 4 && e.painLevel < 7).length;
  const mildCount = entries.filter((e) => e.painLevel < 4).length;

  const formatRegionLabel = (region: string) =>
    region
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <BodyMapSection>
      <SectionHeader>
        <SectionTitle>Pain & Injury Map</SectionTitle>
        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SummaryBadge $color="#fff">
              {entries.length} active
            </SummaryBadge>
            {severeCount > 0 && (
              <SummaryBadge $color="#FF3333">{severeCount} severe</SummaryBadge>
            )}
            {moderateCount > 0 && (
              <SummaryBadge $color="#FFB833">{moderateCount} moderate</SummaryBadge>
            )}
            {mildCount > 0 && (
              <SummaryBadge $color="#33CC66">{mildCount} mild</SummaryBadge>
            )}
          </div>
        )}
      </SectionHeader>

      {loading && <LoadingText>Loading pain entries...</LoadingText>}
      {error && <ErrorText>{error}</ErrorText>}

      {!loading && (
        <>
          <BodyMapSVG
            painEntries={entries}
            selectedRegion={selectedRegion}
            onRegionClick={handleRegionClick}
          />

          {entries.length > 0 && (
            <ActiveEntriesList>
              <Label style={{ marginBottom: 8, fontSize: 11 }}>Active Pain Entries</Label>
              {entries.map((entry) => {
                const color = getSeverityColor(entry.painLevel);
                return (
                  <ActiveEntryRow
                    key={entry.id}
                    $color={color}
                    onClick={() => handleRegionClick(entry.bodyRegion)}
                  >
                    <DotIndicator $color={color} />
                    <EntryLabel>
                      {formatRegionLabel(entry.bodyRegion)}
                    </EntryLabel>
                    <EntryMeta>
                      {entry.painLevel}/10 &middot; {entry.painType}
                    </EntryMeta>
                  </ActiveEntryRow>
                );
              })}
            </ActiveEntriesList>
          )}

          {entries.length === 0 && !loading && (
            <LoadingText>
              No active pain entries. Click a body region to add one.
            </LoadingText>
          )}
        </>
      )}

      {isTrainerOrAdmin && (
        <PainEntryPanel
          regionId={selectedRegion}
          existingEntry={existingEntry}
          isOpen={panelOpen}
          isSaving={isSaving}
          onClose={() => {
            setPanelOpen(false);
            setSelectedRegion(null);
          }}
          onSave={handleSave}
          onResolve={handleResolve}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      )}
    </BodyMapSection>
  );
};

// Need to use a Label-like styled component for the active entries list header
const Label = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export default BodyMap;
