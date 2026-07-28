/**
 * EquipmentProfilePicker — Shared location/equipment selector
 * ============================================================
 * Reusable dropdown for selecting which equipment profile (location)
 * to use when building workouts. Embedded in Workout Logger, Bootcamp
 * Builder, and Long Horizon Builder.
 *
 * Crystalline Swan theme: Midnight Sapphire, Swan Cyan, 44px touch targets.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Home, TreePine, Dumbbell, User, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import {
  Backdrop, ChangeBtn, CompactLabel, CompactManageButton, CompactSelect, CompactWrapper,
  DefaultBadge, DropdownItem, DropdownItemInfo, DropdownItemMeta, DropdownItemName,
  DropdownPanel, IconBadge, ManageLink, PickerLabel, PickerTrigger, PickerWrapper,
  TriggerInfo, TriggerMeta, TriggerName,
} from './EquipmentProfilePicker.styles';

// ── Types ─────────────────────────────────────────────────────────────

interface EquipmentProfile {
  id: number;
  name: string;
  locationType: 'gym' | 'park' | 'home' | 'client_home' | 'custom';
  equipmentCount: number;
  isDefault: boolean;
  description: string | null;
  address: string | null;
}

export interface EquipmentProfilePickerProps {
  selectedProfileId: number | null;
  onSelect: (profileId: number | null) => void;
  showManageLink?: boolean;
  compact?: boolean;
  label?: string;
}

// ── Location Icons ────────────────────────────────────────────────────

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  gym: <Dumbbell size={16} />,
  park: <TreePine size={16} />,
  home: <Home size={16} />,
  client_home: <User size={16} />,
  custom: <MapPin size={16} />,
};

const LOCATION_LABELS: Record<string, string> = {
  gym: 'Gym',
  park: 'Park / Outdoor',
  home: 'Home Gym',
  client_home: "Client's Home",
  custom: 'Custom Location',
};

export function getEquipmentManagerPath(pathname: string): string {
  if (pathname.startsWith('/dashboard/trainer')) return '/dashboard/trainer/equipment';
  if (pathname.startsWith('/dashboard/admin')) return '/dashboard/admin/equipment';
  return '/dashboard/admin/equipment';
}

// ── Component ─────────────────────────────────────────────────────────

const EquipmentProfilePicker: React.FC<EquipmentProfilePickerProps> = ({
  selectedProfileId,
  onSelect,
  showManageLink = true,
  compact = false,
  label = 'Training Location',
}) => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const response = await apiService.get('/api/equipment-profiles');
      const data = response.data;
      if (data.success) {
        setProfiles(data.profiles || []);
      }
    } catch {
      /* best effort */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || null;

  if (compact) {
    return (
      <CompactWrapper>
        <CompactLabel>{label}</CompactLabel>
        <CompactSelect
          value={selectedProfileId ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onSelect(val ? Number(val) : null);
          }}
        >
          <option value="">Any Equipment</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {LOCATION_LABELS[p.locationType] || p.locationType} — {p.name} ({p.equipmentCount} items)
            </option>
          ))}
        </CompactSelect>
        {showManageLink && (
          <CompactManageButton
            type="button"
            onClick={() => navigate(getEquipmentManagerPath(window.location.pathname))}
          >
            <Plus size={14} /> Manage Equipment Profiles
          </CompactManageButton>
        )}
      </CompactWrapper>
    );
  }

  return (
    <PickerWrapper>
      <PickerLabel>{label}</PickerLabel>
      <PickerTrigger
        type="button"
        aria-expanded={expanded}
        aria-haspopup="listbox"
        onClick={() => setExpanded(!expanded)}
        $hasSelection={!!selectedProfile}
      >
        {selectedProfile ? (
          <>
            <IconBadge $type={selectedProfile.locationType}>
              {LOCATION_ICONS[selectedProfile.locationType] || <MapPin size={16} />}
            </IconBadge>
            <TriggerInfo>
              <TriggerName>{selectedProfile.name}</TriggerName>
              <TriggerMeta>
                {LOCATION_LABELS[selectedProfile.locationType]} · {selectedProfile.equipmentCount} items
                {selectedProfile.address && ` · ${selectedProfile.address}`}
              </TriggerMeta>
            </TriggerInfo>
            <ChangeBtn
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
            >
              Clear
            </ChangeBtn>
          </>
        ) : (
          <>
            <IconBadge $type="default">
              <Dumbbell size={16} />
            </IconBadge>
            <TriggerInfo>
              <TriggerName>Any Equipment</TriggerName>
              <TriggerMeta>
                {loading
                  ? 'Loading locations...'
                  : `${profiles.length} location${profiles.length !== 1 ? 's' : ''} available · Click to select`}
              </TriggerMeta>
            </TriggerInfo>
          </>
        )}
      </PickerTrigger>

      {expanded && !loading && (
        <DropdownPanel role="listbox" aria-label={`${label} options`}>
          <DropdownItem
            type="button"
            role="option"
            aria-selected={!selectedProfileId}
            $active={!selectedProfileId}
            onClick={() => {
              onSelect(null);
              setExpanded(false);
            }}
          >
            <IconBadge $type="default">
              <Dumbbell size={14} />
            </IconBadge>
            <DropdownItemInfo>
              <DropdownItemName>Any Equipment</DropdownItemName>
              <DropdownItemMeta>No equipment filter — use full exercise library</DropdownItemMeta>
            </DropdownItemInfo>
          </DropdownItem>

          {profiles.map((p) => (
            <DropdownItem
              type="button"
              role="option"
              aria-selected={selectedProfileId === p.id}
              key={p.id}
              $active={selectedProfileId === p.id}
              onClick={() => {
                onSelect(p.id);
                setExpanded(false);
              }}
            >
              <IconBadge $type={p.locationType}>
                {LOCATION_ICONS[p.locationType] || <MapPin size={14} />}
              </IconBadge>
              <DropdownItemInfo>
                <DropdownItemName>
                  {p.name}
                  {p.isDefault && <DefaultBadge>Default</DefaultBadge>}
                </DropdownItemName>
                <DropdownItemMeta>
                  {LOCATION_LABELS[p.locationType]} · {p.equipmentCount} items
                  {p.address && ` · ${p.address}`}
                </DropdownItemMeta>
              </DropdownItemInfo>
            </DropdownItem>
          ))}

          {showManageLink && (
            <ManageLink
              type="button"
              onClick={() => {
                navigate(getEquipmentManagerPath(window.location.pathname));
                setExpanded(false);
              }}
            >
              <Plus size={14} /> Manage Equipment Profiles
            </ManageLink>
          )}
        </DropdownPanel>
      )}

      {expanded && <Backdrop onClick={() => setExpanded(false)} />}
    </PickerWrapper>
  );
};

export default EquipmentProfilePicker;

// ── Styled Components ─────────────────────────────────────────────────
