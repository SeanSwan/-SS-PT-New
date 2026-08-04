/**
 * EquipmentManagerPage — Equipment Profile Manager
 * ==================================================
 * Phase 7: Location-based equipment inventories with AI photo recognition.
 *
 * Views:
 *   - Profile List (default) — shows trainer's equipment profiles
 *   - Profile Detail — shows items within a profile + scan/add/approve
 *   - Scan Result — approval flow for AI-scanned equipment
 *
 * Crystalline Swan theme: Midnight Sapphire (#002060), Swan Cyan (#60C0F0),
 * glassmorphic panels, 44px touch targets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getEquipmentApiErrorMessage,
  useEquipmentAPI,
  validateEquipmentPhoto,
} from '../../hooks/useEquipmentAPI';
import type {
  EquipmentProfile,
  EquipmentItem,
  EquipmentScanCandidate,
  EquipmentScanDuplicate,
  EquipmentScanError,
} from '../../hooks/useEquipmentAPI';
import {
  createEquipmentScanQueue,
  getEquipmentScanInputProps,
  isMobileScanDevice,
} from './equipmentScanInputs';
import type { EquipmentScanQueueItem, EquipmentScanSource } from './equipmentScanInputs';
import { SCAN_AUTO_RETRY_DELAY_MS, shouldAutoRetryScan } from './equipmentScanRetry';
import EquipmentScanBatchPanel from './EquipmentScanBatchPanel';
import {
  buildDuplicateQuantityMerge,
  buildEquipmentScanBatch,
  buildManualItemDraftFromCandidate,
  getCandidateName,
  removeBatchDuplicateItem,
  removeBatchPossibleItem,
  replaceBatchItem,
  shouldAutoOpenScanApproval,
  updateBatchItemStatus,
} from './equipmentScanBatch';
import type { EquipmentScanBatch } from './equipmentScanBatch';
import { approveSelectedScanItems, rejectSelectedScanItems } from './equipmentScanBatchActions';

// Staged honest scan copy (§10a #5 — LOCKED): stages, never a spinner.
const SCAN_STAGE_COPY = [
  'Scanning the room…',
  'Identifying equipment…',
  'Matching to your inventory…',
] as const;

// --- Keyframes ---

const scanLine = keyframes`
  0% { top: 0; }
  100% { top: 100%; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
  padding: 24px;
`;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: #e0ecf4;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin: 4px 0 0;
`;

const BackButton = styled.button`
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 8px;
  color: #60c0f0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

const PrimaryButton = styled.button<{ $stretch?: boolean; $top?: boolean; $compact?: boolean; $large?: boolean }>`
  padding: ${({ $compact }) => ($compact ? '6px 12px' : '10px 24px')};
  background: linear-gradient(135deg, #60c0f0 0%, #8B5CF6 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: ${({ $compact }) => ($compact ? '12px' : '14px')};
  font-weight: 600;
  cursor: pointer;
  min-height: ${({ $compact, $large }) => ($large ? '48px' : $compact ? '36px' : '44px')};
  flex: ${({ $stretch }) => ($stretch ? 1 : 'initial')};
  margin-top: ${({ $top }) => ($top ? '16px' : 0)};
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DangerButton = styled.button<{ $stretch?: boolean; $large?: boolean }>`
  padding: 8px 14px;
  border: 1px solid rgba(255, 71, 87, 0.3);
  background: transparent;
  border-radius: 6px;
  color: #FF4757;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: ${({ $large }) => ($large ? '48px' : '44px')};
  flex: ${({ $stretch }) => ($stretch ? 1 : 'initial')};
  transition: all 0.2s;
  &:hover { background: rgba(255, 71, 87, 0.1); }
`;

const GhostButton = styled.button<{ $stretch?: boolean }>`
  padding: 8px 14px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: transparent;
  border-radius: 6px;
  color: #60c0f0;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  flex: ${({ $stretch }) => ($stretch ? 1 : 'initial')};
  transition: all 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.1); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Card = styled(motion.div)<{ $interactive?: boolean }>`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 10px;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  transition: border-color 0.2s;
  &:hover { border-color: rgba(96, 192, 240, 0.35); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (max-width: 600px) {
    padding: 14px 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #e0ecf4;
`;

const CardMeta = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.65);
  margin-top: 4px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Badge = styled.span<{ $color?: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $color }) => $color || 'rgba(96, 192, 240, 0.15)'};
  color: ${({ $color }) =>
    $color?.includes('255, 136') ? '#00FF88'
    : $color?.includes('255, 184') ? '#FFB800'
    : $color?.includes('255, 71') ? '#FF4757'
    : '#60C0F0'};
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $status }) =>
    $status === 'approved' || $status === 'manual'
      ? 'rgba(0, 255, 136, 0.15)'
      : $status === 'pending'
        ? 'rgba(255, 184, 0, 0.15)'
        : 'rgba(255, 71, 87, 0.15)'};
  color: ${({ $status }) =>
    $status === 'approved' || $status === 'manual'
      ? '#00FF88'
      : $status === 'pending' ? '#FFB800' : '#FF4757'};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const ScanActionGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 600px) {
    width: 100%;
    justify-content: stretch;

    button {
      flex: 1 1 140px;
    }
  }
`;

const ScanQueuePanel = styled.div`
  padding: 14px 16px;
  margin: 8px 0 16px;
  background:
    linear-gradient(135deg, rgba(96, 192, 240, 0.12), rgba(139, 92, 246, 0.1)),
    rgba(0, 32, 96, 0.45);
  border: 1px solid rgba(96, 192, 240, 0.22);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
`;

const ScanQueueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const ScanQueueTitle = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const ScanQueueSummary = styled.div`
  margin-top: 8px;
  color: rgba(224, 236, 244, 0.78);
  font-size: 13px;
`;

const ScanQueueSummaryCompact = styled(ScanQueueSummary)`
  margin: -8px 0 16px;
`;

const ScanQueueList = styled.ol`
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  padding-left: 18px;
`;

const ScanQueueFile = styled.li`
  color: rgba(224, 236, 244, 0.68);
  font-size: 12px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: rgba(224, 236, 244, 0.65);
`;

const EmptyCopy = styled.p`
  color: rgba(224, 236, 244, 0.65);
  margin-bottom: 16px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  margin-bottom: 8px;
`;

const LoadingMsg = styled.div`
  text-align: center;
  padding: 48px;
  color: rgba(224, 236, 244, 0.65);
  font-size: 14px;
`;

// Non-silent failure surface. Replaces the prior swallowed catches so a failed
// load/action reads as an error the trainer can retry — never as a false empty
// state ("you have no equipment") on a network blip.
const ErrorNotice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: rgba(255, 107, 122, 0.12);
  border: 1px solid var(--error, #ff6b7a);
  border-radius: 10px;
  color: var(--error, #ff6b7a);
  font-size: 14px;
`;

const ErrorNoticeText = styled.span`
  flex: 1;
  min-width: 180px;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  &::placeholder { color: rgba(224, 236, 244, 0.5); }
  &:focus { outline: none; border-color: #60c0f0; }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: #60c0f0; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  &::placeholder { color: rgba(224, 236, 244, 0.5); }
  &:focus { outline: none; border-color: #60c0f0; }
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: rgba(224, 236, 244, 0.8);
  margin-bottom: 6px;
`;

const FormGroup = styled.div<{ $stretch?: boolean }>`
  margin-bottom: 16px;
  flex: ${({ $stretch }) => ($stretch ? 1 : 'initial')};
`;

const FormRow = styled.div<{ $top?: boolean }>`
  display: flex;
  gap: 12px;
  margin-top: ${({ $top }) => ($top ? '8px' : 0)};

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const Modal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;

  @media (min-width: 768px) {
    align-items: center;
  }
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #001a50 0%, #001040 100%);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 16px 16px 0 0;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;

  @media (min-width: 768px) {
    border-radius: 16px;
  }
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #e0ecf4;
  margin: 0 0 16px;
`;

const DetailTitle = styled(Title)`
  margin-top: 12px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

// Camera / Scan UI
const CameraArea = styled.div`
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed rgba(96, 192, 240, 0.3);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  margin-bottom: 16px;
  cursor: pointer;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(96, 192, 240, 0.6); }
`;

const ScanOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 10px;
  overflow: hidden;
  pointer-events: none;
`;

const ScanLineEl = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #60c0f0, transparent);
  animation: ${scanLine} 1.5s ease-in-out infinite;
`;

const ScanningText = styled.div`
  animation: ${pulse} 1.5s ease-in-out infinite;
  color: #60c0f0;
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: contain;
`;

const ScanPreviewFrame = styled.div`
  margin-bottom: 16px;
  text-align: center;
`;

const AiAlias = styled.span`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
  margin-left: 8px;
`;

const AiConfidenceBlock = styled.div`
  margin-bottom: 16px;
`;

const AiConfidenceLabel = styled.div`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin-bottom: 4px;
`;

const SuggestedExerciseList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const DescriptionText = styled.div`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
`;

const ConfidenceMeter = styled.div<{ $value: number }>`
  height: 4px;
  background: rgba(96, 192, 240, 0.15);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $value }) => Math.round($value * 100)}%;
    background: ${({ $value }) =>
      $value > 0.8 ? '#00FF88' : $value > 0.5 ? '#FFB800' : '#FF4757'};
    border-radius: 2px;
    transition: width 0.5s;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const StatBox = styled.div`
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 120px;
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #60c0f0;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.7);
  margin-top: 2px;
`;

const PendingBadge = styled.span`
  background: rgba(255, 184, 0, 0.2);
  color: #FFB800;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ScanErrorBox = styled.div`
  padding: 14px 16px;
  margin: 8px 0 16px;
  background: rgba(255, 71, 87, 0.14);
  border: 1px solid rgba(255, 71, 87, 0.32);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 14px;
`;

const ScanErrorTitle = styled.div`
  color: var(--error, #FF6B7A);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
  text-transform: uppercase;
`;

const ScanErrorActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const ErrorContainer = styled(Container)`
  text-align: center;
  padding-top: 80px;
`;

// --- Location Icons ---
const LOCATION_ICONS: Record<string, string> = {
  gym: '🏋️',
  park: '🌳',
  home: '🏠',
  client_home: '👤',
  custom: '📍',
};

const CATEGORY_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable_machine: 'Cable Machine',
  resistance_band: 'Resistance Band',
  bodyweight: 'Bodyweight',
  machine: 'Machine',
  bench: 'Bench',
  rack: 'Rack',
  cardio: 'Cardio',
  foam_roller: 'Foam Roller',
  lacrosse_ball: 'Lacrosse Ball',
  stability_ball: 'Stability Ball',
  medicine_ball: 'Medicine Ball',
  pull_up_bar: 'Pull-Up Bar',
  trx: 'TRX',
  other: 'Other',
};

// --- Component ---

type View = 'list' | 'detail' | 'create';

const getReviewCandidateIndex = (
  candidate: EquipmentScanCandidate | EquipmentScanDuplicate,
  fallbackIndex: number,
): number => (
  Number.isInteger(candidate.candidateIndex) ? Number(candidate.candidateIndex) : fallbackIndex
);

const EquipmentManagerPage: React.FC = () => {
  const api = useEquipmentAPI();
  const [view, setView] = useState<View>('list');
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<EquipmentProfile | null>(null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  // Staged honest loading copy (§10a #5) — no spinners; stages advance on a
  // timer and hold on the last one until the scan resolves.
  const [scanStageIndex, setScanStageIndex] = useState(0);
  useEffect(() => {
    if (!scanning) { setScanStageIndex(0); return undefined; }
    const timer = setInterval(() => {
      setScanStageIndex((index) => Math.min(index + 1, SCAN_STAGE_COPY.length - 1));
    }, 2600);
    return () => clearInterval(timer);
  }, [scanning]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanQueue, setScanQueue] = useState<EquipmentScanQueueItem[]>([]);
  const [activeScanItem, setActiveScanItem] = useState<EquipmentScanQueueItem | null>(null);
  // The photo whose scan just failed. Retained so the trainer can retry the
  // SAME image (or fall back to manual) instead of losing it. (Sean, 2026-06-17)
  const [failedScanItem, setFailedScanItem] = useState<EquipmentScanQueueItem | null>(null);
  const [lastScanBatch, setLastScanBatch] = useState<EquipmentScanBatch | null>(null);
  const [batchActionPending, setBatchActionPending] = useState(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showApproval, setShowApproval] = useState<EquipmentItem | null>(null);
  const [stats, setStats] = useState({ profileCount: 0, itemCount: 0, pendingApprovals: 0 });
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [mobileScanDevice, setMobileScanDevice] = useState(false);

  // Form state for creating profile
  const [newProfile, setNewProfile] = useState({ name: '', locationType: 'custom', description: '' });
  // Form state for adding item
  const [newItem, setNewItem] = useState({ name: '', category: 'other', resistanceType: '', description: '' });
  // Approval overrides
  const [approvalOverrides, setApprovalOverrides] = useState({ name: '', trainerLabel: '', category: '' });

  // ── Data Loading ──────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profileRes, statsRes] = await Promise.all([
        api.listProfiles(),
        api.getStats(),
      ]);
      setProfiles(profileRes.profiles);
      setStats(statsRes.stats);
    } catch (err) {
      console.error('[EquipmentManager] Failed to load profiles', err);
      setLoadError(getEquipmentApiErrorMessage(err, 'Could not load your equipment locations. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadItems = useCallback(async (profileId: number) => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await api.listItems(profileId);
      setItems(res.items);
    } catch (err) {
      console.error('[EquipmentManager] Failed to load items', err);
      setItemsError(getEquipmentApiErrorMessage(err, 'Could not load equipment for this location. Check your connection and try again.'));
    } finally {
      setItemsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    setMobileScanDevice(isMobileScanDevice());
  }, []);

  // ── Profile Actions ───────────────────────────────────────────────

  const handleSelectProfile = async (profile: EquipmentProfile) => {
    setSelectedProfile(profile);
    setView('detail');
    // Clear the prior profile's items so opening a new location never flashes
    // stale equipment or a false empty state while the fetch is in flight (ST2).
    setItems([]);
    setItemsError(null);
    setActionError(null);
    await loadItems(profile.id);
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name.trim()) return;
    setActionError(null);
    try {
      await api.createProfile(newProfile);
      setShowCreateProfile(false);
      setNewProfile({ name: '', locationType: 'custom', description: '' });
      loadProfiles();
    } catch (err) {
      console.error('[EquipmentManager] Failed to create profile', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not create the location profile. Please try again.'));
    }
  };

  const handleDeleteProfile = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    try {
      await api.deleteProfile(id);
      loadProfiles();
    } catch (err) {
      console.error('[EquipmentManager] Failed to archive profile', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not archive this location. Please try again.'));
    }
  };

  // ── Item Actions ──────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!selectedProfile || !newItem.name.trim()) return;
    setActionError(null);
    try {
      await api.addItem(selectedProfile.id, {
        name: newItem.name,
        category: newItem.category,
        resistanceType: newItem.resistanceType || undefined,
        description: newItem.description || undefined,
      });
      setShowAddItem(false);
      setNewItem({ name: '', category: 'other', resistanceType: '', description: '' });
      // If this manual add resolved a failed scan, clear that error state so the
      // scan queue can advance past the photo the trainer just handled by hand.
      cancelAutoRetry();
      setFailedScanItem(null);
      setActiveScanItem(null);
      setScanError(null);
      setLastScanBatch(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch (err) {
      console.error('[EquipmentManager] Failed to add item', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not add this equipment item. Please try again.'));
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedProfile) return;
    setActionError(null);
    try {
      await api.deleteItem(selectedProfile.id, itemId);
      loadItems(selectedProfile.id);
      loadProfiles();
      setLastScanBatch(current => (current
        ? { ...current, createdItems: current.createdItems.filter(item => item.id !== itemId) }
        : current));
    } catch (err) {
      console.error('[EquipmentManager] Failed to remove item', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not remove this equipment item. Please try again.'));
    }
  };

  // ── AI Scan ───────────────────────────────────────────────────────

  const resetScanInputs = useCallback(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, []);

  const handleScanClick = (source: EquipmentScanSource = mobileScanDevice ? 'camera' : 'gallery') => {
    if (source === 'gallery') {
      galleryInputRef.current?.click();
      return;
    }
    cameraInputRef.current?.click();
  };

  const cancelAutoRetry = useCallback(() => {
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
  }, []);

  const scanQueuedItem = useCallback(async (queueItem: EquipmentScanQueueItem, attempt = 0) => {
    if (!selectedProfile) return;

    cancelAutoRetry();
    setActiveScanItem(queueItem);
    setFailedScanItem(null);
    setScanPreview(null);

    const reader = new FileReader();
    reader.onload = () => setScanPreview(reader.result as string);
    reader.readAsDataURL(queueItem.file);

    setScanning(true);
    setScanError(null);
    let autoRetrying = false;
    try {
      const result = await api.scanEquipment(selectedProfile.id, queueItem.file);
      const batch = buildEquipmentScanBatch(result, queueItem.fileName);
      const reviewItem = result.item || result.items?.[0] || null;
      setLastScanBatch(batch);

      if (reviewItem && shouldAutoOpenScanApproval(batch)) {
        const scanResult = result.scanResult || reviewItem.aiScanData;
        setShowApproval(reviewItem);
        setApprovalOverrides({
          name: scanResult?.suggestedName || reviewItem.name,
          trainerLabel: '',
          category: scanResult?.suggestedCategory || reviewItem.category,
        });
      } else {
        setActiveScanItem(null);
        if (!batch) setScanPreview(null);
      }
      loadItems(selectedProfile.id);
    } catch (err) {
      if (shouldAutoRetryScan(err, attempt)) {
        // Transient AI/connection failure: keep the photo on screen and silently
        // re-send it once before bothering the trainer. Stays "Scanning..." across
        // the wait so the queue can't advance and nothing flickers.
        autoRetrying = true;
        autoRetryTimerRef.current = setTimeout(() => {
          void scanQueuedItem(queueItem, attempt + 1);
        }, SCAN_AUTO_RETRY_DELAY_MS);
        return;
      }
      // Terminal failure: retain the photo so the trainer can Try Again on the
      // SAME image (or add it manually). The queue stays put until they choose.
      setLastScanBatch(buildEquipmentScanBatch(
        (err as EquipmentScanError).scanResponse,
        queueItem.fileName,
      ));
      setActiveScanItem(null);
      setFailedScanItem(queueItem);
      setScanError(getEquipmentApiErrorMessage(
        err,
        `Scan failed for ${queueItem.fileName}. Try again or add it manually.`,
      ));
    } finally {
      if (!autoRetrying) {
        setScanning(false);
        resetScanInputs();
      }
    }
  }, [api, cancelAutoRetry, loadItems, resetScanInputs, selectedProfile]);

  useEffect(() => {
    if (
      !selectedProfile || scanning || showApproval || activeScanItem
      || scanError || failedScanItem || lastScanBatch || scanQueue.length === 0
    ) {
      return;
    }

    const [nextScan, ...remainingQueue] = scanQueue;
    setScanQueue(remainingQueue);
    void scanQueuedItem(nextScan);
  }, [activeScanItem, failedScanItem, lastScanBatch, scanError, scanQueue, scanQueuedItem, scanning, selectedProfile, showApproval]);

  // Clear any pending auto-retry timer if the component unmounts mid-wait.
  useEffect(() => cancelAutoRetry, [cancelAutoRetry]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, source: EquipmentScanSource) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0 || !selectedProfile) return;

    const filesToQueue = source === 'camera' ? selectedFiles.slice(0, 1) : selectedFiles;
    const validationError = filesToQueue
      .map(file => validateEquipmentPhoto(file))
      .find((message): message is string => Boolean(message));

    if (validationError) {
      setScanError(validationError);
      setLastScanBatch(null);
      resetScanInputs();
      return;
    }

    const queuedFiles = createEquipmentScanQueue(filesToQueue, source, Date.now());
    setScanError(null);
    setLastScanBatch(null);
    setScanQueue(currentQueue => [...currentQueue, ...queuedFiles]);
    resetScanInputs();
  };

  const handleClearScanQueue = () => {
    setScanQueue([]);
  };

  // Re-scan the same failed photo; the file was retained.
  const handleRetryScan = useCallback(() => {
    if (!failedScanItem) return;
    const item = failedScanItem;
    setFailedScanItem(null);
    setLastScanBatch(null);
    setScanError(null);
    void scanQueuedItem(item, 0);
  }, [failedScanItem, scanQueuedItem]);

  // Trainer is handling the failed photo manually: drop the error and move on.
  const handleDismissScanError = useCallback(() => {
    cancelAutoRetry();
    setFailedScanItem(null);
    setActiveScanItem(null);
    setScanError(null); // lets the queue effect advance to the next queued photo
    setLastScanBatch(null);
  }, [cancelAutoRetry]);

  // "Add manually instead" from the error box: open the manual form but do not
  // discard the failed photo yet. Cancel returns the trainer to Try Again.
  const handleAddManuallyFromError = useCallback(() => {
    setShowAddItem(true);
  }, []);

  const handleCloseApproval = () => {
    setShowApproval(null);
    if (!lastScanBatch) setScanPreview(null);
    setActiveScanItem(null);
  };

  const handleApprove = async () => {
    if (!selectedProfile || !showApproval) return;
    setActionError(null);
    try {
      const approveRes = await api.approveItem(selectedProfile.id, showApproval.id, {
        name: approvalOverrides.name || undefined,
        trainerLabel: approvalOverrides.trainerLabel || undefined,
        category: approvalOverrides.category || undefined,
      });
      setItems(current => current.map(item => (item.id === approveRes.item.id ? approveRes.item : item)));
      setLastScanBatch(current => replaceBatchItem(current, approveRes.item));
      setShowApproval(null);
      if (!lastScanBatch) setScanPreview(null);
      setActiveScanItem(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch (err) {
      console.error('[EquipmentManager] Failed to approve item', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not approve this equipment item. Please try again.'));
    }
  };

  const handleReject = async () => {
    if (!selectedProfile || !showApproval) return;
    setActionError(null);
    try {
      await api.rejectItem(selectedProfile.id, showApproval.id);
      setItems(current => current.map(item => (
        item.id === showApproval.id ? { ...item, approvalStatus: 'rejected' } : item
      )));
      setLastScanBatch(current => updateBatchItemStatus(current, showApproval.id, 'rejected'));
      setShowApproval(null);
      if (!lastScanBatch) setScanPreview(null);
      setActiveScanItem(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch (err) {
      console.error('[EquipmentManager] Failed to reject item', err);
      setActionError(getEquipmentApiErrorMessage(err, 'Could not reject this equipment item. Please try again.'));
    }
  };

  const handleBack = () => {
    cancelAutoRetry();
    setView('list');
    setSelectedProfile(null);
    setItems([]);
    setScanPreview(null);
    setScanQueue([]);
    setActiveScanItem(null);
    setFailedScanItem(null);
    setScanError(null);
    setLastScanBatch(null);
    resetScanInputs();
  };

  const openApprovalReview = (item: EquipmentItem) => {
    if (item.approvalStatus !== 'pending') return;
    setShowApproval(item);
    const scan = item.aiScanData;
    if (scan) {
      setApprovalOverrides({
        name: scan.suggestedName || item.name,
        trainerLabel: '',
        category: scan.suggestedCategory || item.category,
      });
    }
  };

  const handleReviewBatchItem = (item: EquipmentItem) => {
    openApprovalReview(items.find(current => current.id === item.id) || item);
  };
  const handleApproveBatchItems = async (selectedItems: EquipmentItem[]) => {
    if (!selectedProfile || selectedItems.length === 0) return;
    const pendingItems = selectedItems.filter(item => item.approvalStatus === 'pending');
    if (pendingItems.length === 0) return;

    setBatchActionPending(true);
    try {
      const { approvedItems, failedCount } = await approveSelectedScanItems({
        api,
        profileId: selectedProfile.id,
        items: pendingItems,
      });
      if (approvedItems.length > 0) {
        setItems(current => current.map(item => (
          approvedItems.find(approved => approved.id === item.id) || item
        )));
        setLastScanBatch(current => approvedItems.reduce(
          (batch, approvedItem) => replaceBatchItem(batch, approvedItem),
          current,
        ));
        loadItems(selectedProfile.id);
        loadProfiles();
      }
      setScanError(failedCount > 0
        ? `${failedCount} selected scan ${failedCount === 1 ? 'item' : 'items'} could not be approved. Review remaining items individually.`
        : null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleRejectBatchItems = async (selectedItems: EquipmentItem[]) => {
    if (!selectedProfile || selectedItems.length === 0) return;
    const pendingItems = selectedItems.filter(item => item.approvalStatus === 'pending');
    if (pendingItems.length === 0) return;

    setBatchActionPending(true);
    try {
      const { rejectedIds, failedCount } = await rejectSelectedScanItems({
        api,
        profileId: selectedProfile.id,
        items: pendingItems,
      });
      if (rejectedIds.size > 0) {
        setItems(current => current.map(item => (
          rejectedIds.has(item.id) ? { ...item, approvalStatus: 'rejected' } : item
        )));
        setLastScanBatch(current => [...rejectedIds].reduce(
          (batch, itemId) => updateBatchItemStatus(batch, itemId, 'rejected'),
          current,
        ));
        loadItems(selectedProfile.id);
        loadProfiles();
      }
      setScanError(failedCount > 0
        ? `${failedCount} selected scan ${failedCount === 1 ? 'item' : 'items'} could not be rejected. Review remaining items individually.`
        : null);
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleAddPossibleScanItem = async (candidate: EquipmentScanCandidate, candidateIndex: number) => {
    if (!selectedProfile) return;
    setBatchActionPending(true);
    try {
      const addRes = await api.addItem(
        selectedProfile.id,
        buildManualItemDraftFromCandidate(candidate),
      );
      const reviewSessionId = lastScanBatch?.scanSession?.reviewSessionId;
      if (reviewSessionId) {
        void Promise.resolve(api.reviewScanCandidate(selectedProfile.id, {
          reviewSessionId,
          candidateIndex: getReviewCandidateIndex(candidate, candidateIndex),
          candidateStatus: 'possible',
          outcome: 'approved',
          equipmentItemId: addRes.item.id,
          trainerCorrection: {
            name: addRes.item.name,
            category: addRes.item.category,
            resistanceType: addRes.item.resistanceType || undefined,
          },
        })).catch(() => undefined);
      }
      setItems(current => (
        current.some(item => item.id === addRes.item.id)
          ? current.map(item => (item.id === addRes.item.id ? addRes.item : item))
          : [addRes.item, ...current]
      ));
      const nextBatch = removeBatchPossibleItem(lastScanBatch, candidateIndex);
      setLastScanBatch(nextBatch);
      if (!nextBatch) setScanPreview(null);
      setScanError(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(
        err,
        `Could not add ${getCandidateName(candidate)}. Add it manually or review the scan again.`,
      ));
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleMergeDuplicateScanItem = async (
    duplicate: EquipmentScanDuplicate,
    duplicateIndex: number,
    matchedItem: EquipmentItem,
  ) => {
    if (!selectedProfile) return;
    setBatchActionPending(true);
    try {
      const updateRes = await api.updateItem(
        selectedProfile.id,
        matchedItem.id,
        buildDuplicateQuantityMerge(matchedItem, duplicate),
      );
      const reviewSessionId = lastScanBatch?.scanSession?.reviewSessionId;
      if (reviewSessionId) {
        void Promise.resolve(api.reviewScanCandidate(selectedProfile.id, {
          reviewSessionId,
          candidateIndex: getReviewCandidateIndex(duplicate, duplicateIndex),
          candidateStatus: 'duplicate',
          outcome: 'approved',
          equipmentItemId: updateRes.item.id,
          duplicateOfItemId: duplicate.duplicateOfItemId || matchedItem.id,
          trainerCorrection: {
            name: updateRes.item.name,
            trainerLabel: updateRes.item.trainerLabel || undefined,
            category: updateRes.item.category,
            resistanceType: updateRes.item.resistanceType || duplicate.resistanceType || undefined,
          },
        })).catch(() => undefined);
      }
      setItems(current => current.map(item => (
        item.id === updateRes.item.id ? updateRes.item : item
      )));
      const nextBatch = removeBatchDuplicateItem(lastScanBatch, duplicateIndex);
      setLastScanBatch(nextBatch);
      if (!nextBatch) setScanPreview(null);
      setScanError(null);
      loadItems(selectedProfile.id);
    } catch (err) {
      setScanError(getEquipmentApiErrorMessage(
        err,
        `Could not merge ${getCandidateName(duplicate)}. Review the matched item manually.`,
      ));
    } finally {
      setBatchActionPending(false);
    }
  };

  const handleDismissScanBatch = () => {
    setLastScanBatch(null);
    setScanPreview(null);
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent,
    action: () => void,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const handleBackdropClick = (
    event: React.MouseEvent,
    action: () => void,
  ) => {
    if (event.target === event.currentTarget) {
      action();
    }
  };

  // ── Render: Profile List ──────────────────────────────────────────

  if (view === 'list') {
    return (
      <PageWrapper>
        <Container>
          <Header>
            <div>
              <Title>Equipment Manager</Title>
              <Subtitle>Manage equipment profiles for training locations</Subtitle>
            </div>
            <PrimaryButton onClick={() => setShowCreateProfile(true)}>+ New Location</PrimaryButton>
          </Header>

          <StatsBar>
            <StatBox>
              <StatValue>{stats.profileCount}</StatValue>
              <StatLabel>Locations</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue>{stats.itemCount}</StatValue>
              <StatLabel>Equipment</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue>
                {stats.pendingApprovals > 0 ? (
                  <PendingBadge>{stats.pendingApprovals}</PendingBadge>
                ) : '0'}
              </StatValue>
              <StatLabel>Pending Approvals</StatLabel>
            </StatBox>
          </StatsBar>

          {actionError && (
            <ErrorNotice role="alert">
              <ErrorNoticeText>{actionError}</ErrorNoticeText>
              <ErrorActions>
                <GhostButton onClick={() => setActionError(null)}>Dismiss</GhostButton>
              </ErrorActions>
            </ErrorNotice>
          )}

          {loading ? (
            <LoadingMsg>Loading profiles...</LoadingMsg>
          ) : loadError ? (
            <ErrorNotice role="alert">
              <ErrorNoticeText>{loadError}</ErrorNoticeText>
              <ErrorActions>
                <PrimaryButton onClick={loadProfiles}>Try again</PrimaryButton>
              </ErrorActions>
            </ErrorNotice>
          ) : profiles.length === 0 ? (
            <EmptyState>
              <EmptyTitle>No equipment profiles yet</EmptyTitle>
              <p>Create your first location profile to start tracking equipment.</p>
              <PrimaryButton onClick={() => setShowCreateProfile(true)} $top>
                Get Started
              </PrimaryButton>
            </EmptyState>
          ) : (
            <AnimatePresence>
              {profiles.map(p => (
                <Card
                  key={p.id}
                  $interactive
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectProfile(p)}
                  onKeyDown={(event) => handleCardKeyDown(event, () => handleSelectProfile(p))}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CardHeader>
                    <CardInfo>
                      <CardTitle>{LOCATION_ICONS[p.locationType] || '📍'} {p.name}</CardTitle>
                      <CardMeta>
                        <span>{p.locationType.replace(/_/g, ' ')}</span>
                        <span>{p.equipmentCount} items</span>
                        {p.isDefault && <Badge>Default</Badge>}
                      </CardMeta>
                    </CardInfo>
                    <ActionGroup>
                      {!p.isDefault && (
                        <DangerButton onClick={(e) => handleDeleteProfile(p.id, e)}>
                          Archive
                        </DangerButton>
                      )}
                    </ActionGroup>
                  </CardHeader>
                </Card>
              ))}
            </AnimatePresence>
          )}

          {/* Create Profile Modal */}
          <AnimatePresence>
            {showCreateProfile && (
              <Modal
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(event) => handleBackdropClick(event, () => setShowCreateProfile(false))}
                role="presentation"
              >
                <ModalContent
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="equipment-create-profile-title"
                >
                  <ModalTitle id="equipment-create-profile-title">New Location Profile</ModalTitle>
                  <FormGroup>
                    <Label htmlFor="equipment-profile-name">Profile Name</Label>
                    <Input
                      id="equipment-profile-name"
                      placeholder="e.g., Hotel Gym, John's Home"
                      value={newProfile.name}
                      onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="equipment-profile-location-type">Location Type</Label>
                    <Select
                      id="equipment-profile-location-type"
                      value={newProfile.locationType}
                      onChange={e => setNewProfile(p => ({ ...p, locationType: e.target.value }))}
                    >
                      <option value="gym">Gym</option>
                      <option value="park">Park / Outdoor</option>
                      <option value="home">Home Gym</option>
                      <option value="client_home">Client Home</option>
                      <option value="custom">Custom</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor="equipment-profile-description">Description (optional)</Label>
                    <TextArea
                      id="equipment-profile-description"
                      placeholder="Notes about this location..."
                      value={newProfile.description}
                      onChange={e => setNewProfile(p => ({ ...p, description: e.target.value }))}
                    />
                  </FormGroup>
                  <FormRow>
                    <GhostButton onClick={() => setShowCreateProfile(false)} $stretch>
                      Cancel
                    </GhostButton>
                    <PrimaryButton onClick={handleCreateProfile} $stretch>
                      Create Profile
                    </PrimaryButton>
                  </FormRow>
                </ModalContent>
              </Modal>
            )}
          </AnimatePresence>
        </Container>
      </PageWrapper>
    );
  }

  // ── Render: Profile Detail ────────────────────────────────────────

  return (
    <PageWrapper>
      <Container>
        <Header>
          <div>
            <BackButton onClick={handleBack}>Back to Profiles</BackButton>
            <DetailTitle>
              {LOCATION_ICONS[selectedProfile?.locationType || 'custom']} {selectedProfile?.name}
            </DetailTitle>
            <Subtitle>{selectedProfile?.description || 'Equipment at this location'}</Subtitle>
          </div>
          <ScanActionGroup>
            <GhostButton onClick={() => setShowAddItem(true)}>+ Add Manually</GhostButton>
            <PrimaryButton onClick={() => handleScanClick()} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Scan Equipment'}
            </PrimaryButton>
            {mobileScanDevice && (
              <GhostButton onClick={() => handleScanClick('gallery')} disabled={scanning}>
                Photo Library
              </GhostButton>
            )}
          </ScanActionGroup>
        </Header>

        {actionError && (
          <ErrorNotice role="alert">
            <ErrorNoticeText>{actionError}</ErrorNoticeText>
            <ErrorActions>
              <GhostButton onClick={() => setActionError(null)}>Dismiss</GhostButton>
            </ErrorActions>
          </ErrorNotice>
        )}

        {/* Hidden file inputs: camera capture stays separate from mobile gallery picking. */}
        <HiddenFileInput
          ref={cameraInputRef}
          type="file"
          {...getEquipmentScanInputProps('camera')}
          onChange={(event) => handleFileSelected(event, 'camera')}
        />
        <HiddenFileInput
          ref={galleryInputRef}
          type="file"
          {...getEquipmentScanInputProps('gallery')}
          onChange={(event) => handleFileSelected(event, 'gallery')}
        />

        {(activeScanItem || scanQueue.length > 0) && (
          <ScanQueuePanel aria-live="polite">
            <ScanQueueHeader>
              <ScanQueueTitle>Scan queue</ScanQueueTitle>
              {scanQueue.length > 0 && (
                <GhostButton onClick={handleClearScanQueue} disabled={scanning}>
                  Clear queue
                </GhostButton>
              )}
            </ScanQueueHeader>
            <ScanQueueSummary>
              {activeScanItem
                ? `${scanning ? 'Scanning' : 'Reviewing'} ${activeScanItem.fileName}`
                : 'Ready for next photo'}
              {scanQueue.length > 0 ? ` - ${scanQueue.length} waiting` : ''}
            </ScanQueueSummary>
            {scanQueue.length > 0 && (
              <ScanQueueList>
                {scanQueue.slice(0, 4).map(item => (
                  <ScanQueueFile key={item.id}>{item.fileName}</ScanQueueFile>
                ))}
                {scanQueue.length > 4 && (
                  <ScanQueueFile>+{scanQueue.length - 4} more photos</ScanQueueFile>
                )}
              </ScanQueueList>
            )}
          </ScanQueuePanel>
        )}

        {/* Scanning preview */}
        {scanning && (
          <CameraArea>
            {scanPreview && <PreviewImage src={scanPreview} alt="Scanning..." />}
            <ScanOverlay>
              <ScanLineEl />
            </ScanOverlay>
            <ScanningText>
              {activeScanItem
                ? `${activeScanItem.fileName} — ${SCAN_STAGE_COPY[scanStageIndex]}`
                : SCAN_STAGE_COPY[scanStageIndex]}
            </ScanningText>
          </CameraArea>
        )}
        {scanError && !scanning && (
          <ScanErrorBox role="alert">
            <ScanErrorTitle>Scan hit a snag</ScanErrorTitle>
            <div>{scanError}</div>
            {failedScanItem && (
              <ScanQueueSummary>
                Your photo for {failedScanItem.fileName} is safe. Nothing was lost.
              </ScanQueueSummary>
            )}
            <ScanErrorActions>
              {failedScanItem && (
                <PrimaryButton onClick={handleRetryScan}>
                  Try again
                </PrimaryButton>
              )}
              <GhostButton onClick={handleAddManuallyFromError}>Add manually instead</GhostButton>
              <GhostButton onClick={handleDismissScanError}>
                {scanQueue.length > 0 ? 'Skip to next photo' : 'Dismiss'}
              </GhostButton>
            </ScanErrorActions>
          </ScanErrorBox>
        )}

        {lastScanBatch && (
          <EquipmentScanBatchPanel
            batch={lastScanBatch}
            previewUrl={scanPreview}
            inventoryItems={items}
            onReviewItem={handleReviewBatchItem}
            onApproveSelected={handleApproveBatchItems}
            onRejectSelected={handleRejectBatchItems}
            onAddPossibleItem={handleAddPossibleScanItem}
            onMergeDuplicate={handleMergeDuplicateScanItem}
            bulkActionPending={batchActionPending}
            onDismiss={handleDismissScanBatch}
          />
        )}

        {/* Equipment Items List */}
        {itemsLoading && items.length === 0 ? (
          <LoadingMsg>Loading equipment...</LoadingMsg>
        ) : itemsError ? (
          <ErrorNotice role="alert">
            <ErrorNoticeText>{itemsError}</ErrorNoticeText>
            <ErrorActions>
              <PrimaryButton onClick={() => selectedProfile && loadItems(selectedProfile.id)}>Try again</PrimaryButton>
            </ErrorActions>
          </ErrorNotice>
        ) : items.length === 0 && !scanning ? (
          <EmptyState>
            <EmptyTitle>No equipment here yet</EmptyTitle>
            <p>Tap Scan Equipment or choose photos from your library — Swan Coach identifies what you&apos;ve got and what it unlocks.</p>
          </EmptyState>
        ) : (
          <AnimatePresence>
            {items.map(item => (
              <Card
                key={item.id}
                $interactive={item.approvalStatus === 'pending'}
                role={item.approvalStatus === 'pending' ? 'button' : undefined}
                tabIndex={item.approvalStatus === 'pending' ? 0 : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={item.approvalStatus === 'pending' ? () => openApprovalReview(item) : undefined}
                onKeyDown={item.approvalStatus === 'pending'
                  ? (event) => handleCardKeyDown(event, () => openApprovalReview(item))
                  : undefined}
              >
                <CardHeader>
                  <CardInfo>
                    <CardTitle>
                      {item.trainerLabel || item.name}
                      {item.trainerLabel && item.trainerLabel !== item.name && (
                        <AiAlias>
                          (AI: {item.name})
                        </AiAlias>
                      )}
                    </CardTitle>
                    <CardMeta>
                      <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                      {item.resistanceType && <span>{item.resistanceType}</span>}
                      {item.quantity && item.quantity > 1 && <span>x{item.quantity}</span>}
                      <StatusBadge $status={item.approvalStatus}>{item.approvalStatus}</StatusBadge>
                      {item.aiScanData && (
                        <span>
                          AI {Math.round(item.aiScanData.confidence * 100)}%
                        </span>
                      )}
                    </CardMeta>
                    {item.aiScanData && <ConfidenceMeter $value={item.aiScanData.confidence} />}
                  </CardInfo>
                  <ActionGroup>
                    {item.approvalStatus === 'pending' && (
                      <>
                        <PrimaryButton
                          $compact
                          onClick={(e) => {
                            e.stopPropagation();
                            openApprovalReview(item);
                          }}
                        >
                          Review
                        </PrimaryButton>
                      </>
                    )}
                    <DangerButton onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}>
                      Remove
                    </DangerButton>
                  </ActionGroup>
                </CardHeader>
              </Card>
            ))}
          </AnimatePresence>
        )}

        {/* Add Item Modal */}
        <AnimatePresence>
          {showAddItem && (
            <Modal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(event) => handleBackdropClick(event, () => setShowAddItem(false))}
              role="presentation"
            >
              <ModalContent
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="equipment-add-item-title"
              >
                <ModalTitle id="equipment-add-item-title">Add Equipment</ModalTitle>
                <FormGroup>
                  <Label htmlFor="equipment-item-name">Equipment Name</Label>
                  <Input
                    id="equipment-item-name"
                    placeholder="e.g., Adjustable Dumbbells"
                    value={newItem.name}
                    onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))}
                  />
                </FormGroup>
                <FormRow>
                  <FormGroup $stretch>
                    <Label htmlFor="equipment-item-category">Category</Label>
                    <Select
                      id="equipment-item-category"
                      value={newItem.category}
                      onChange={e => setNewItem(i => ({ ...i, category: e.target.value }))}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup $stretch>
                    <Label htmlFor="equipment-item-resistance-type">Resistance Type</Label>
                    <Select
                      id="equipment-item-resistance-type"
                      value={newItem.resistanceType}
                      onChange={e => setNewItem(i => ({ ...i, resistanceType: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option value="bodyweight">Bodyweight</option>
                      <option value="dumbbell">Dumbbell</option>
                      <option value="barbell">Barbell</option>
                      <option value="cable">Cable</option>
                      <option value="band">Band</option>
                      <option value="machine">Machine</option>
                      <option value="kettlebell">Kettlebell</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormGroup>
                </FormRow>
                <FormGroup>
                  <Label htmlFor="equipment-item-description">Description (optional)</Label>
                  <TextArea
                    id="equipment-item-description"
                    placeholder="What is this equipment used for?"
                    value={newItem.description}
                    onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))}
                  />
                </FormGroup>
                <FormRow>
                  <GhostButton onClick={() => setShowAddItem(false)} $stretch>Cancel</GhostButton>
                  <PrimaryButton onClick={handleAddItem} $stretch>Add Equipment</PrimaryButton>
                </FormRow>
              </ModalContent>
            </Modal>
          )}
        </AnimatePresence>

        {/* Approval Modal (glassmorphic bottom sheet) */}
        <AnimatePresence>
          {showApproval && (
            <Modal
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(event) => handleBackdropClick(event, handleCloseApproval)}
              role="presentation"
            >
              <ModalContent
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="equipment-approval-title"
              >
                <ModalTitle id="equipment-approval-title">Review AI Scan</ModalTitle>
                {activeScanItem && (
                  <ScanQueueSummaryCompact>
                    {activeScanItem.fileName}
                    {scanQueue.length > 0 ? ` - ${scanQueue.length} queued after this` : ''}
                  </ScanQueueSummaryCompact>
                )}

                {scanPreview && (
                  <ScanPreviewFrame>
                    <PreviewImage src={scanPreview} alt="Scanned equipment" />
                  </ScanPreviewFrame>
                )}

                {showApproval.aiScanData && (
                  <AiConfidenceBlock>
                    <AiConfidenceLabel>
                      AI Confidence: {Math.round(showApproval.aiScanData.confidence * 100)}%
                    </AiConfidenceLabel>
                    <ConfidenceMeter $value={showApproval.aiScanData.confidence} />
                  </AiConfidenceBlock>
                )}

                <FormGroup>
                  <Label htmlFor="equipment-approval-name">Equipment Name</Label>
                  <Input
                    id="equipment-approval-name"
                    value={approvalOverrides.name}
                    onChange={e => setApprovalOverrides(o => ({ ...o, name: e.target.value }))}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="equipment-approval-trainer-label">Your Label (optional)</Label>
                  <Input
                    id="equipment-approval-trainer-label"
                    placeholder="Custom name if different from AI suggestion"
                    value={approvalOverrides.trainerLabel}
                    onChange={e => setApprovalOverrides(o => ({ ...o, trainerLabel: e.target.value }))}
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="equipment-approval-category">Category</Label>
                  <Select
                    id="equipment-approval-category"
                    value={approvalOverrides.category}
                    onChange={e => setApprovalOverrides(o => ({ ...o, category: e.target.value }))}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </FormGroup>

                {showApproval.aiScanData?.suggestedExercises && showApproval.aiScanData.suggestedExercises.length > 0 && (
                  <FormGroup>
                    <Label as="div">Suggested Exercises</Label>
                    <SuggestedExerciseList>
                      {showApproval.aiScanData.suggestedExercises.map((ex, i) => (
                        <Badge key={i}>{ex}</Badge>
                      ))}
                    </SuggestedExerciseList>
                  </FormGroup>
                )}

                {showApproval.description && (
                  <FormGroup>
                    <Label as="div">Description</Label>
                    <DescriptionText>
                      {showApproval.description}
                    </DescriptionText>
                  </FormGroup>
                )}

                {actionError && (
                  <ErrorNotice role="alert">
                    <ErrorNoticeText>{actionError}</ErrorNoticeText>
                  </ErrorNotice>
                )}

                <FormRow $top>
                  <DangerButton onClick={handleReject} $stretch $large>
                    {scanQueue.length > 0 ? 'Reject & Next' : 'Reject'}
                  </DangerButton>
                  <PrimaryButton onClick={handleApprove} $stretch $large>
                    {scanQueue.length > 0 ? 'Confirm & Next' : 'Confirm'}
                  </PrimaryButton>
                </FormRow>
              </ModalContent>
            </Modal>
          )}
        </AnimatePresence>
      </Container>
    </PageWrapper>
  );
};

// --- Error Boundary ---

class EquipmentManagerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <ErrorContainer>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyCopy>
              The Equipment Manager encountered an error.
            </EmptyCopy>
            <PrimaryButton onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </ErrorContainer>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const EquipmentManagerPageWithBoundary: React.FC = () => (
  <EquipmentManagerErrorBoundary>
    <EquipmentManagerPage />
  </EquipmentManagerErrorBoundary>
);

export default EquipmentManagerPageWithBoundary;
