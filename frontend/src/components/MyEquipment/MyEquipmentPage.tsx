/**
 * ============================================================================
 * FILE: MyEquipmentPage.tsx
 * PURPOSE: Client/user self-serve "My Equipment" surface (S5)
 * BLUEPRINT: EQUIPMENT-INTELLIGENCE-OVERHAUL-2026-08-04 §4.3 + §10a #7/#10
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Simplified equipment surface for clients/users —
 * location switcher (max 3 self-serve places: home/park/custom, mirroring the
 * S4 API policy), hero "Scan my equipment" CTA (camera-first on mobile),
 * scan review through the SHARED EquipmentScanBatchPanel, and inventory
 * grouped by movement pattern.
 *
 * HOW IT FITS: Registered for the client dashboard (and the 'user' role,
 * which UniversalDashboardLayout normalizes to client) at
 * /dashboard/client/my-equipment. Data + scan workflow in useMyEquipmentData;
 * grouping logic in myEquipmentPatterns; presentation split into
 * MyEquipmentInventory + styles files.
 *
 * KEY DECISIONS: One photo at a time (simplified vs the trainer manager's
 * queue). No native selects, no emoji, staged honest scan copy instead of
 * spinners (§10a #5/#12). Review sheet is a compact add/not-mine dialog.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Home, Image as ImageIcon, MapPin, Plus, Trees, type LucideIcon } from 'lucide-react';
import type { EquipmentItem, EquipmentProfile } from '../../hooks/useEquipmentAPI';
import { getEquipmentScanInputProps, isMobileScanDevice } from '../EquipmentManager/equipmentScanInputs';
import EquipmentScanBatchPanel from '../EquipmentManager/EquipmentScanBatchPanel';
import useMyEquipmentData from './useMyEquipmentData';
import { USER_LOCATION_LABELS, USER_LOCATION_TYPES, getVisibleItems } from './myEquipmentPatterns';
import type { UserLocationType } from './myEquipmentPatterns';
import MyEquipmentInventory from './MyEquipmentInventory';
import {
  AddPlaceButton, CapHint, Container, ErrorActions, ErrorNotice, ErrorText,
  GhostButton, Header, HeroActions, HeroCard, HeroCopy, HeroGalleryButton,
  HeroHint, HeroScanButton, HiddenFileInput, LocationBar, LocationChip,
  PageWrapper, PrimaryButton, ScanStageBox, ScanStageText, ScanStageTrack,
  Subtitle, Title,
} from './MyEquipmentPage.styles';
import {
  FieldGroup, FieldLabel, ModalActions, ModalBackdrop, ModalCard, ModalError,
  ModalTitle, ReviewMeta, TextInput, TypeChip, TypeChipRow,
} from './MyEquipmentModals.styles';

const SCAN_STAGE_COPY = ['Scanning the room…', 'Identifying equipment…', 'Matching to your inventory…'] as const;

const LOCATION_ICONS: Record<EquipmentProfile['locationType'], LucideIcon> = {
  home: Home, park: Trees, custom: MapPin, gym: MapPin, client_home: MapPin,
};

const MyEquipmentPage: React.FC = () => {
  const data = useMyEquipmentData();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [mobileScanDevice, setMobileScanDevice] = useState(false);
  const [scanStageIndex, setScanStageIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlace, setNewPlace] = useState<{ name: string; locationType: UserLocationType }>({ name: '', locationType: 'home' });
  const [reviewItem, setReviewItem] = useState<EquipmentItem | null>(null);
  const [reviewName, setReviewName] = useState('');

  useEffect(() => { setMobileScanDevice(isMobileScanDevice()); }, []);

  // Staged honest scan copy (§10a #5): stages advance and hold on the last.
  useEffect(() => {
    if (!data.scanning) { setScanStageIndex(0); return undefined; }
    const timer = setInterval(() => {
      setScanStageIndex((index) => Math.min(index + 1, SCAN_STAGE_COPY.length - 1));
    }, 2600);
    return () => clearInterval(timer);
  }, [data.scanning]);

  const visibleCount = useMemo(() => getVisibleItems(data.items).length, [data.items]);

  const openCreate = () => {
    data.setCreateError(null);
    setNewPlace({ name: '', locationType: 'home' });
    setShowCreate(true);
  };

  const handleScanClick = (source?: 'camera' | 'gallery') => {
    if (!data.activeProfile) { openCreate(); return; }
    const target = source ?? (mobileScanDevice ? 'camera' : 'gallery');
    (target === 'camera' ? cameraInputRef : galleryInputRef).current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void data.scanPhoto(file);
  };

  const handleCreatePlace = async () => {
    const created = await data.createLocation(newPlace);
    if (created) setShowCreate(false);
  };

  const openReview = (item: EquipmentItem) => {
    const fresh = data.items.find((current) => current.id === item.id) || item;
    if (fresh.approvalStatus !== 'pending') return;
    setReviewItem(fresh);
    setReviewName(fresh.aiScanData?.suggestedName || fresh.name);
  };

  const handleReviewApprove = async () => {
    if (!reviewItem) return;
    await data.approveSingle(reviewItem, { name: reviewName.trim() || undefined });
    setReviewItem(null);
  };

  const handleReviewReject = async () => {
    if (!reviewItem) return;
    await data.rejectSingle(reviewItem);
    setReviewItem(null);
  };

  return (
    <PageWrapper>
      <Container>
        <Header>
          <Title>My Equipment</Title>
          <Subtitle>Your training locations &amp; gear — powers your workout plans</Subtitle>
        </Header>

        {data.profilesError && (
          <ErrorNotice role="alert">
            <ErrorText>{data.profilesError}</ErrorText>
            <ErrorActions>
              <PrimaryButton type="button" onClick={() => void data.loadProfiles()}>Try again</PrimaryButton>
            </ErrorActions>
          </ErrorNotice>
        )}

        {data.profilesLoading ? (
          <Subtitle role="status">Loading your places…</Subtitle>
        ) : (
          <LocationBar aria-label="Your places">
            {data.profiles.map((profile) => {
              const Icon = LOCATION_ICONS[profile.locationType] ?? MapPin;
              return (
                <LocationChip
                  key={profile.id}
                  type="button"
                  $active={data.activeProfile?.id === profile.id}
                  aria-pressed={data.activeProfile?.id === profile.id}
                  onClick={() => data.selectProfile(profile.id)}
                >
                  <Icon size={16} aria-hidden />
                  {profile.name}
                </LocationChip>
              );
            })}
            <AddPlaceButton type="button" onClick={openCreate} disabled={data.capState.atCap}>
              <Plus size={16} aria-hidden />
              Add place
            </AddPlaceButton>
            {data.capState.atCap && <CapHint>Up to 3 places</CapHint>}
          </LocationBar>
        )}

        <HiddenFileInput ref={cameraInputRef} type="file" {...getEquipmentScanInputProps('camera')} onChange={handleFileSelected} />
        <HiddenFileInput ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelected} />

        {/* Hero scan CTA — hidden while the cinematic empty state (which carries
            its own single CTA) is on screen, so the surface never shows two
            competing scan buttons. */}
        {!data.profilesLoading && visibleCount > 0 && (
          <HeroCard aria-label="Scan your equipment">
            <HeroCopy>Point your camera at your space — Swan Coach identifies what you&apos;ve got and what it unlocks.</HeroCopy>
            <HeroActions>
              <HeroScanButton type="button" onClick={() => handleScanClick()} disabled={data.scanning}>
                <Camera size={18} aria-hidden />
                {data.scanning ? 'Scanning…' : 'Scan my equipment'}
              </HeroScanButton>
              {mobileScanDevice && (
                <HeroGalleryButton type="button" onClick={() => handleScanClick('gallery')} disabled={data.scanning}>
                  <ImageIcon size={16} aria-hidden />
                  Photo library
                </HeroGalleryButton>
              )}
            </HeroActions>
            <HeroHint>Takes about 30 seconds.</HeroHint>
          </HeroCard>
        )}

        {data.scanning && (
          <ScanStageBox role="status" aria-live="polite">
            <ScanStageText>{SCAN_STAGE_COPY[scanStageIndex]}</ScanStageText>
            <ScanStageTrack aria-hidden />
          </ScanStageBox>
        )}

        {data.scanError && !data.scanning && (
          <ErrorNotice role="alert">
            <ErrorText>{data.scanError}</ErrorText>
            <ErrorActions>
              {data.canRetryScan && <PrimaryButton type="button" onClick={data.retryScan}>Try again</PrimaryButton>}
              <GhostButton type="button" onClick={data.dismissScanError}>Dismiss</GhostButton>
            </ErrorActions>
          </ErrorNotice>
        )}

        {data.scanBatch && (
          <EquipmentScanBatchPanel
            batch={data.scanBatch}
            previewUrl={data.scanPreview}
            inventoryItems={data.items}
            onReviewItem={openReview}
            onApproveSelected={data.approveItems}
            onRejectSelected={data.rejectItems}
            onAddPossibleItem={data.addPossibleItem}
            onMergeDuplicate={data.mergeDuplicate}
            bulkActionPending={data.batchActionPending}
            onDismiss={data.dismissBatch}
          />
        )}

        {(data.activeProfile || (!data.profilesLoading && !data.profilesError && data.profiles.length === 0)) && (
          <MyEquipmentInventory
            items={data.activeProfile ? data.items : []}
            loading={data.itemsLoading}
            error={data.itemsError}
            onRetry={() => { if (data.activeProfile) void data.loadItems(data.activeProfile.id); else void data.loadProfiles(); }}
            onScanClick={() => handleScanClick()}
            scanDisabled={data.scanning}
          />
        )}

        {showCreate && (
          <ModalBackdrop role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="my-equipment-add-place-title">
              <ModalTitle id="my-equipment-add-place-title">Add a place</ModalTitle>
              <FieldGroup>
                <FieldLabel htmlFor="my-equipment-place-name">Name</FieldLabel>
                <TextInput
                  id="my-equipment-place-name"
                  placeholder="e.g. My garage, Riverside park"
                  value={newPlace.name}
                  onChange={(event) => setNewPlace((place) => ({ ...place, name: event.target.value }))}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel as="span">Type of place</FieldLabel>
                <TypeChipRow role="radiogroup" aria-label="Type of place">
                  {USER_LOCATION_TYPES.map((type) => (
                    <TypeChip
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={newPlace.locationType === type}
                      $selected={newPlace.locationType === type}
                      onClick={() => setNewPlace((place) => ({ ...place, locationType: type }))}
                    >
                      {USER_LOCATION_LABELS[type]}
                    </TypeChip>
                  ))}
                </TypeChipRow>
              </FieldGroup>
              {data.createError && <ModalError role="alert">{data.createError}</ModalError>}
              <ModalActions>
                <GhostButton type="button" onClick={() => setShowCreate(false)}>Cancel</GhostButton>
                <PrimaryButton type="button" onClick={() => void handleCreatePlace()} disabled={data.createPending}>
                  {data.createPending ? 'Adding…' : 'Add place'}
                </PrimaryButton>
              </ModalActions>
            </ModalCard>
          </ModalBackdrop>
        )}

        {reviewItem && (
          <ModalBackdrop role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setReviewItem(null); }}>
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="my-equipment-review-title">
              <ModalTitle id="my-equipment-review-title">Add this to your gear?</ModalTitle>
              <ReviewMeta>Swan Coach spotted this in your scan. Rename it if you like.</ReviewMeta>
              <FieldGroup>
                <FieldLabel htmlFor="my-equipment-review-name">Name</FieldLabel>
                <TextInput
                  id="my-equipment-review-name"
                  value={reviewName}
                  onChange={(event) => setReviewName(event.target.value)}
                />
              </FieldGroup>
              <ModalActions>
                <GhostButton type="button" onClick={() => void handleReviewReject()}>Not mine</GhostButton>
                <PrimaryButton type="button" onClick={() => void handleReviewApprove()}>Add to my gear</PrimaryButton>
              </ModalActions>
            </ModalCard>
          </ModalBackdrop>
        )}
      </Container>
    </PageWrapper>
  );
};

export default MyEquipmentPage;
