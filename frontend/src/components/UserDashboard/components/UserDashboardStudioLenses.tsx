/**
 * ============================================================================
 * FILE: UserDashboardStudioLenses.tsx
 * PURPOSE: In-panel lens strip for the Studio tab group (workstream N5 — tab
 *          compaction). Creative / Photos / About / Activity share ONE entry
 *          in the main tab bar; this strip switches between them inside the
 *          panel, so every lens keeps its own URL and deep links keep working.
 * ============================================================================
 */
import React from 'react';
import styled from 'styled-components';
import { Activity, Aperture, Camera, Info, type LucideIcon } from 'lucide-react';
import type { TabId } from '../types/UserDashboardTypes';

const LensRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const LensChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent)'
    : 'var(--border-soft, rgba(224, 236, 244, 0.15))'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, var(--bg-elevated, #141419))'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent)'};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)')};
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const STUDIO_LENSES: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'creative', label: 'Creative', Icon: Aperture },
  { id: 'photos', label: 'Photos', Icon: Camera },
  { id: 'about', label: 'About', Icon: Info },
  { id: 'activity', label: 'Activity', Icon: Activity },
];

interface UserDashboardStudioLensesProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const UserDashboardStudioLenses: React.FC<UserDashboardStudioLensesProps> = ({
  activeTab,
  onTabChange,
}) => (
  <LensRow role="tablist" aria-label="Studio sections">
    {STUDIO_LENSES.map(({ id, label, Icon }) => (
      <LensChip
        key={id}
        type="button"
        role="tab"
        aria-selected={activeTab === id}
        $active={activeTab === id}
        onClick={() => onTabChange(id)}
      >
        <Icon size={15} aria-hidden="true" />
        {label}
      </LensChip>
    ))}
  </LensRow>
);

export default UserDashboardStudioLenses;
