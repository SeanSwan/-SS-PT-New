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
import styled from 'styled-components';
import { MapPin, Home, TreePine, Dumbbell, User, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';

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
              type="button"
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

      {expanded && <Backdrop onPointerDown={() => setExpanded(false)} />}
    </PickerWrapper>
  );
};

export default EquipmentProfilePicker;

// ── Styled Components ─────────────────────────────────────────────────

const PickerWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const PickerLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
`;

const PickerTrigger = styled.button<{ $hasSelection: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  min-height: 56px;
  border: 1px solid ${(p) => (p.$hasSelection ? 'rgba(96, 192, 240, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.4);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
    background: rgba(0, 32, 96, 0.6);
  }
`;

const IconBadge = styled.div<{ $type: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${(p) => {
    switch (p.$type) {
      case 'gym': return 'rgba(96, 192, 240, 0.15)';
      case 'park': return 'rgba(76, 175, 80, 0.15)';
      case 'home': return 'rgba(255, 183, 77, 0.15)';
      case 'client_home': return 'rgba(139, 92, 246, 0.15)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  }};
  color: ${(p) => {
    switch (p.$type) {
      case 'gym': return '#60C0F0';
      case 'park': return '#4caf50';
      case 'home': return '#ffb74d';
      case 'client_home': return '#8B5CF6';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  }};
`;

const TriggerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TriggerName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #f0f0ff;
`;

const TriggerMeta = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
`;

const ChangeBtn = styled.button`
  font-size: 12px;
  color: #60C0F0;
  cursor: pointer;
  min-height: 44px;
  border: 0;
  background: transparent;
  padding: 4px 8px;
  border-radius: 6px;
  &:hover { background: rgba(96, 192, 240, 0.1); }
`;

const DropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(0, 20, 60, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const DropdownItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: ${(p) => (p.$active ? 'rgba(96, 192, 240, 0.12)' : 'transparent')};
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;

  &:hover {
    background: rgba(96, 192, 240, 0.08);
  }
`;

const DropdownItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DropdownItemName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #f0f0ff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DropdownItemMeta = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
`;

const DefaultBadge = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.15);
  color: #60C0F0;
  font-weight: 500;
`;

const ManageLink = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: #60C0F0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;

  &:hover { background: rgba(96, 192, 240, 0.05); }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 49;
`;

const CompactWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CompactLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
`;

const CompactSelect = styled.select`
  padding: 10px 12px;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.4);
  color: #f0f0ff;
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(96, 192, 240, 0.4);
  }

  option {
    background: #001040;
    color: #f0f0ff;
  }
`;
