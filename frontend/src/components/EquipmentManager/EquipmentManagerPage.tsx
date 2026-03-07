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
 * Galaxy-Swan theme: Midnight Sapphire (#002060), Swan Cyan (#60C0F0),
 * glassmorphic panels, 44px touch targets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useEquipmentAPI } from '../../hooks/useEquipmentAPI';
import type {
  EquipmentProfile,
  EquipmentItem,
  ExerciseMapping,
  ScanResult,
} from '../../hooks/useEquipmentAPI';

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

const PrimaryButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(135deg, #60c0f0 0%, #7851a9 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DangerButton = styled.button`
  padding: 8px 14px;
  border: 1px solid rgba(255, 71, 87, 0.3);
  background: transparent;
  border-radius: 6px;
  color: #FF4757;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { background: rgba(255, 71, 87, 0.1); }
`;

const GhostButton = styled.button`
  padding: 8px 14px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: transparent;
  border-radius: 6px;
  color: #60c0f0;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

const Card = styled(motion.div)`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(96, 192, 240, 0.35); }

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

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: rgba(224, 236, 244, 0.65);
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

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 12px;

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
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: contain;
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
  stability_ball: 'Stability Ball',
  medicine_ball: 'Medicine Ball',
  pull_up_bar: 'Pull-Up Bar',
  trx: 'TRX',
  other: 'Other',
};

// --- Component ---

type View = 'list' | 'detail' | 'create';

const EquipmentManagerPage: React.FC = () => {
  const api = useEquipmentAPI();
  const [view, setView] = useState<View>('list');
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<EquipmentProfile | null>(null);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<{ item: EquipmentItem; scanResult: ScanResult } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showApproval, setShowApproval] = useState<EquipmentItem | null>(null);
  const [stats, setStats] = useState({ profileCount: 0, itemCount: 0, pendingApprovals: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for creating profile
  const [newProfile, setNewProfile] = useState({ name: '', locationType: 'custom', description: '' });
  // Form state for adding item
  const [newItem, setNewItem] = useState({ name: '', category: 'other', resistanceType: '', description: '' });
  // Approval overrides
  const [approvalOverrides, setApprovalOverrides] = useState({ name: '', trainerLabel: '', category: '' });

  // ── Data Loading ──────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        api.listProfiles(),
        api.getStats(),
      ]);
      setProfiles(profileRes.profiles);
      setStats(statsRes.stats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadItems = useCallback(async (profileId: number) => {
    try {
      const res = await api.listItems(profileId);
      setItems(res.items);
    } catch {
      // silent
    }
  }, [api]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // ── Profile Actions ───────────────────────────────────────────────

  const handleSelectProfile = async (profile: EquipmentProfile) => {
    setSelectedProfile(profile);
    setView('detail');
    await loadItems(profile.id);
  };

  const handleCreateProfile = async () => {
    if (!newProfile.name.trim()) return;
    try {
      await api.createProfile(newProfile);
      setShowCreateProfile(false);
      setNewProfile({ name: '', locationType: 'custom', description: '' });
      loadProfiles();
    } catch {
      // silent
    }
  };

  const handleDeleteProfile = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteProfile(id);
      loadProfiles();
    } catch {
      // silent
    }
  };

  // ── Item Actions ──────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!selectedProfile || !newItem.name.trim()) return;
    try {
      await api.addItem(selectedProfile.id, {
        name: newItem.name,
        category: newItem.category,
        resistanceType: newItem.resistanceType || undefined,
        description: newItem.description || undefined,
      });
      setShowAddItem(false);
      setNewItem({ name: '', category: 'other', resistanceType: '', description: '' });
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch {
      // silent
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedProfile) return;
    try {
      await api.deleteItem(selectedProfile.id, itemId);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch {
      // silent
    }
  };

  // ── AI Scan ───────────────────────────────────────────────────────

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProfile) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setScanPreview(reader.result as string);
    reader.readAsDataURL(file);

    setScanning(true);
    try {
      const result = await api.scanEquipment(selectedProfile.id, file);
      setLastScanResult(result);
      setShowApproval(result.item);
      setApprovalOverrides({
        name: result.scanResult.suggestedName,
        trainerLabel: '',
        category: result.scanResult.suggestedCategory,
      });
      loadItems(selectedProfile.id);
    } catch {
      // silent
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApprove = async () => {
    if (!selectedProfile || !showApproval) return;
    try {
      await api.approveItem(selectedProfile.id, showApproval.id, {
        name: approvalOverrides.name || undefined,
        trainerLabel: approvalOverrides.trainerLabel || undefined,
        category: approvalOverrides.category || undefined,
      });
      setShowApproval(null);
      setLastScanResult(null);
      setScanPreview(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch {
      // silent
    }
  };

  const handleReject = async () => {
    if (!selectedProfile || !showApproval) return;
    try {
      await api.rejectItem(selectedProfile.id, showApproval.id);
      setShowApproval(null);
      setLastScanResult(null);
      setScanPreview(null);
      loadItems(selectedProfile.id);
      loadProfiles();
    } catch {
      // silent
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedProfile(null);
    setItems([]);
    setLastScanResult(null);
    setScanPreview(null);
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

          {loading ? (
            <LoadingMsg>Loading profiles...</LoadingMsg>
          ) : profiles.length === 0 ? (
            <EmptyState>
              <EmptyTitle>No equipment profiles yet</EmptyTitle>
              <p>Create your first location profile to start tracking equipment.</p>
              <PrimaryButton onClick={() => setShowCreateProfile(true)} style={{ marginTop: 16 }}>
                Get Started
              </PrimaryButton>
            </EmptyState>
          ) : (
            <AnimatePresence>
              {profiles.map(p => (
                <Card
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
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
                onClick={() => setShowCreateProfile(false)}
              >
                <ModalContent
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  onClick={e => e.stopPropagation()}
                >
                  <ModalTitle>New Location Profile</ModalTitle>
                  <FormGroup>
                    <Label>Profile Name</Label>
                    <Input
                      placeholder="e.g., Hotel Gym, John's Home"
                      value={newProfile.name}
                      onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>Location Type</Label>
                    <Select
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
                    <Label>Description (optional)</Label>
                    <TextArea
                      placeholder="Notes about this location..."
                      value={newProfile.description}
                      onChange={e => setNewProfile(p => ({ ...p, description: e.target.value }))}
                    />
                  </FormGroup>
                  <FormRow>
                    <GhostButton onClick={() => setShowCreateProfile(false)} style={{ flex: 1 }}>
                      Cancel
                    </GhostButton>
                    <PrimaryButton onClick={handleCreateProfile} style={{ flex: 1 }}>
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
            <Title style={{ marginTop: 12 }}>
              {LOCATION_ICONS[selectedProfile?.locationType || 'custom']} {selectedProfile?.name}
            </Title>
            <Subtitle>{selectedProfile?.description || 'Equipment at this location'}</Subtitle>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostButton onClick={() => setShowAddItem(true)}>+ Add Manually</GhostButton>
            <PrimaryButton onClick={handleScanClick}>
              {scanning ? 'Scanning...' : 'AI Scan'}
            </PrimaryButton>
          </div>
        </Header>

        {/* Hidden file input for camera/upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        {/* Scanning preview */}
        {scanning && (
          <CameraArea>
            {scanPreview && <PreviewImage src={scanPreview} alt="Scanning..." />}
            <ScanOverlay>
              <ScanLineEl />
            </ScanOverlay>
            <ScanningText style={{ marginTop: 12 }}>Analyzing equipment...</ScanningText>
          </CameraArea>
        )}

        {/* Equipment Items List */}
        {items.length === 0 && !scanning ? (
          <EmptyState>
            <EmptyTitle>No equipment here yet</EmptyTitle>
            <p>Tap "AI Scan" to photograph equipment or add items manually.</p>
          </EmptyState>
        ) : (
          <AnimatePresence>
            {items.map(item => (
              <Card
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => {
                  if (item.approvalStatus === 'pending') {
                    setShowApproval(item);
                    const scan = item.aiScanData;
                    if (scan) {
                      setApprovalOverrides({
                        name: scan.suggestedName || item.name,
                        trainerLabel: '',
                        category: scan.suggestedCategory || item.category,
                      });
                    }
                  }
                }}
                style={{ cursor: item.approvalStatus === 'pending' ? 'pointer' : 'default' }}
              >
                <CardHeader>
                  <CardInfo>
                    <CardTitle>
                      {item.trainerLabel || item.name}
                      {item.trainerLabel && item.trainerLabel !== item.name && (
                        <span style={{ fontSize: 12, color: 'rgba(224, 236, 244, 0.5)', marginLeft: 8 }}>
                          (AI: {item.name})
                        </span>
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
                          style={{ padding: '6px 12px', fontSize: 12, minHeight: 36 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowApproval(item);
                            const scan = item.aiScanData;
                            if (scan) {
                              setApprovalOverrides({
                                name: scan.suggestedName || item.name,
                                trainerLabel: '',
                                category: scan.suggestedCategory || item.category,
                              });
                            }
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
              onClick={() => setShowAddItem(false)}
            >
              <ModalContent
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                onClick={e => e.stopPropagation()}
              >
                <ModalTitle>Add Equipment</ModalTitle>
                <FormGroup>
                  <Label>Equipment Name</Label>
                  <Input
                    placeholder="e.g., Adjustable Dumbbells"
                    value={newItem.name}
                    onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))}
                  />
                </FormGroup>
                <FormRow>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Category</Label>
                    <Select
                      value={newItem.category}
                      onChange={e => setNewItem(i => ({ ...i, category: e.target.value }))}
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup style={{ flex: 1 }}>
                    <Label>Resistance Type</Label>
                    <Select
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
                  <Label>Description (optional)</Label>
                  <TextArea
                    placeholder="What is this equipment used for?"
                    value={newItem.description}
                    onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))}
                  />
                </FormGroup>
                <FormRow>
                  <GhostButton onClick={() => setShowAddItem(false)} style={{ flex: 1 }}>Cancel</GhostButton>
                  <PrimaryButton onClick={handleAddItem} style={{ flex: 1 }}>Add Equipment</PrimaryButton>
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
              onClick={() => setShowApproval(null)}
            >
              <ModalContent
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                onClick={e => e.stopPropagation()}
              >
                <ModalTitle>Review AI Scan</ModalTitle>

                {scanPreview && (
                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <PreviewImage src={scanPreview} alt="Scanned equipment" />
                  </div>
                )}

                {showApproval.aiScanData && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: 'rgba(224, 236, 244, 0.7)', marginBottom: 4 }}>
                      AI Confidence: {Math.round(showApproval.aiScanData.confidence * 100)}%
                    </div>
                    <ConfidenceMeter $value={showApproval.aiScanData.confidence} />
                  </div>
                )}

                <FormGroup>
                  <Label>Equipment Name</Label>
                  <Input
                    value={approvalOverrides.name}
                    onChange={e => setApprovalOverrides(o => ({ ...o, name: e.target.value }))}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Your Label (optional)</Label>
                  <Input
                    placeholder="Custom name if different from AI suggestion"
                    value={approvalOverrides.trainerLabel}
                    onChange={e => setApprovalOverrides(o => ({ ...o, trainerLabel: e.target.value }))}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Category</Label>
                  <Select
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
                    <Label>Suggested Exercises</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {showApproval.aiScanData.suggestedExercises.map((ex, i) => (
                        <Badge key={i}>{ex}</Badge>
                      ))}
                    </div>
                  </FormGroup>
                )}

                {showApproval.description && (
                  <FormGroup>
                    <Label>Description</Label>
                    <div style={{ fontSize: 13, color: 'rgba(224, 236, 244, 0.7)' }}>
                      {showApproval.description}
                    </div>
                  </FormGroup>
                )}

                <FormRow style={{ marginTop: 8 }}>
                  <DangerButton onClick={handleReject} style={{ flex: 1, minHeight: 48 }}>
                    Reject
                  </DangerButton>
                  <PrimaryButton onClick={handleApprove} style={{ flex: 1, minHeight: 48 }}>
                    Confirm
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
          <Container style={{ textAlign: 'center', paddingTop: 80 }}>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <p style={{ color: 'rgba(224, 236, 244, 0.65)', marginBottom: 16 }}>
              The Equipment Manager encountered an error.
            </p>
            <PrimaryButton onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </Container>
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
