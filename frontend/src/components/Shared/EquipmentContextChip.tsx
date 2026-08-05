/**
 * EquipmentContextChip — F11 "Planning from" persistent context chip
 * ==================================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #1
 *
 * The workout logger / planner must always show which equipment profile the
 * plan draws from — visible, one tap to change, impossible to get wrong.
 * Derivation over interrogation: plan-provided id > only profile > default
 * profile; an unset chip appears only when genuinely ambiguous. Optional
 * client-context ribbon (Wing Purple) marks client-owned gear read-only.
 * Mismatch enforcement is corrective, not blocking (MismatchNotice).
 *
 * Consumers: WorkoutLogger (primary), planner surfaces (future).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Hexagon, Lock, MapPin, Home, TreePine, Dumbbell, User } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  ChipProfile,
  DerivedProfile,
  LOCATION_LABELS,
  deriveActiveProfile,
} from './EquipmentContextChip.helpers';
import {
  Backdrop,
  ChipButton,
  ChipHint,
  ChipRoot,
  ContextRibbon,
  MismatchAction,
  MismatchWrap,
  ProfileCard,
  ProfileMeta,
  SheetPanel,
  SheetTitle,
} from './EquipmentContextChip.styles';

const LOCATION_ICONS: Record<ChipProfile['locationType'], React.ReactNode> = {
  gym: <Dumbbell size={16} aria-hidden />,
  park: <TreePine size={16} aria-hidden />,
  home: <Home size={16} aria-hidden />,
  client_home: <User size={16} aria-hidden />,
  custom: <MapPin size={16} aria-hidden />,
};

export interface EquipmentContextChipProps {
  selectedProfileId: number | null;
  onSelect: (profileId: number | null) => void;
  planProfileId?: number | null;
  contextOwner?: { kind: 'own' } | { kind: 'client'; label: string };
}

const EquipmentContextChip: React.FC<EquipmentContextChipProps> = ({
  selectedProfileId,
  onSelect,
  planProfileId = null,
  contextOwner,
}) => {
  const [profiles, setProfiles] = useState<ChipProfile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const derivedRef = useRef<DerivedProfile>({ profileId: null, source: 'unset' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiService.get('/api/equipment-profiles');
        if (!cancelled && response.data?.success) {
          setProfiles(response.data.profiles || []);
        }
      } catch {
        /* best effort — chip degrades to unset state */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const derived = deriveActiveProfile({ profiles, selectedId: selectedProfileId, planProfileId, userHasInteracted });
  derivedRef.current = derived;

  // Push silent derivations up so parent state (and saved logs) stay truthful.
  useEffect(() => {
    if (loaded && derived.profileId != null && derived.profileId !== selectedProfileId) {
      onSelect(derived.profileId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, derived.profileId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const activeProfile = profiles.find((p) => p.id === derived.profileId) || null;

  const choose = useCallback((id: number | null) => {
    setUserHasInteracted(true);
    onSelect(id);
    setOpen(false);
  }, [onSelect]);

  return (
    <ChipRoot>
      {contextOwner?.kind === 'client' && (
        <ContextRibbon role="note">
          <Lock size={14} aria-hidden />
          <span>Planning for: {contextOwner.label} · read-only</span>
        </ContextRibbon>
      )}
      <ChipButton
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Hexagon size={16} aria-hidden />
        <span>
          {activeProfile
            ? `Planning from: ${activeProfile.name}`
            : loaded && profiles.length === 0
              ? 'No training locations yet'
              : 'Choose training location'}
        </span>
        {derived.source === 'plan' && <ChipHint>Set by plan · tap to change</ChipHint>}
        <ChevronDown size={16} aria-hidden />
      </ChipButton>

      {open && (
        <>
          <Backdrop onPointerDown={() => setOpen(false)} data-testid="chip-backdrop" />
          <SheetPanel role="dialog" aria-label="Choose training location">
            <SheetTitle>Training locations</SheetTitle>
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                type="button"
                $active={profile.id === derived.profileId}
                onClick={() => choose(profile.id)}
              >
                {LOCATION_ICONS[profile.locationType]}
                <span>
                  {profile.name}
                  <ProfileMeta>
                    {LOCATION_LABELS[profile.locationType]} · {profile.equipmentCount} items
                  </ProfileMeta>
                </span>
              </ProfileCard>
            ))}
            <ProfileCard type="button" $active={derived.profileId == null} onClick={() => choose(null)}>
              <MapPin size={16} aria-hidden />
              <span>
                Any equipment
                <ProfileMeta>Don&apos;t filter exercises by location</ProfileMeta>
              </span>
            </ProfileCard>
          </SheetPanel>
        </>
      )}
    </ChipRoot>
  );
};

export interface MismatchNoticeProps {
  profileName: string;
  onSwitchProfile: () => void;
}

/** Corrective (never blocking) inventory-mismatch notice — Gilded Fern edge. */
export const MismatchNotice: React.FC<MismatchNoticeProps> = ({ profileName, onSwitchProfile }) => (
  <MismatchWrap role="status">
    <span>Not in {profileName} — log anyway?</span>
    <MismatchAction type="button" onClick={onSwitchProfile}>Switch profile</MismatchAction>
  </MismatchWrap>
);

export default EquipmentContextChip;
