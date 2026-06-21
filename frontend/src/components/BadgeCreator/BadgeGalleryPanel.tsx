/**
 * COMPONENT: BadgeGalleryPanel
 * PURPOSE: Browse generated badges and manage assignment/share actions.
 * DATA: Uses protected `/api/admin/badge-creator/gallery` routes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Share2, Tag, X } from 'lucide-react';
import AnimatedBadge from './AnimatedBadge';
import apiService from '../../services/api.service';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import { normalizeGalleryBadges, type GalleryBadgeRow } from './BadgeCreatorPayloadSafety';
import { AssignBtn, AssignInput, AssignPanel, AssignRow, AssignSelect, AssignTag, AssignTitle, BadgeCard, BadgeGrid, BadgeImg, BadgeMeta, BadgeName, EmptyIcon, EmptyState, FilterBar, FilterBtn, FilterIcon, LoadingSpinner, LoadingState, Panel, PlaceholderIcon, RarityTag, StatusBanner } from './BadgeGalleryPanel.styles';

type BadgeData = GalleryBadgeRow;

const TAB_TARGETS = [
  'workout', 'nutrition', 'schedule', 'social', 'bootcamp',
  'analytics', 'profile', 'rewards', 'body-map', 'sprint-planner',
  'video-call', 'my-home', 'virtual-olympics', 'badge-creator',
];

const BADGE_GALLERY_ASSIGN_ERROR =
  'Unable to assign badge. Check the target and try again.';
const BADGE_GALLERY_SHARE_ERROR =
  'Unable to update marketplace sharing. Refresh the gallery and try again.';
const BADGE_GALLERY_LOAD_ERROR =
  'Badge gallery could not load. Refresh and try again.';

const buildBadgeActionPath = (badgeId: string, action: 'assign' | 'unassign') =>
  `/api/admin/badge-creator/${encodeURIComponent(badgeId)}/${action}`;

const titleCaseTab = (tab: string) =>
  tab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const BadgeGalleryPanel: React.FC = () => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<BadgeData | null>(null);
  const [assignType, setAssignType] = useState('achievement');
  const [assignTarget, setAssignTarget] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const assigningRef = useRef(false);
  const sharingRef = useRef(false);

  const fetchBadges = useCallback(async () => {
    try {
      const query = filter !== 'all' ? `?rarity=${encodeURIComponent(filter)}` : '';
      const res = await apiService.get<{ success: boolean; data: unknown }>(`/api/admin/badge-creator/gallery${query}`);
      const d = res.data;
      if (d.success && Array.isArray(d.data)) {
        setBadges(normalizeGalleryBadges(d.data));
      } else {
        setStatus({ type: 'error', text: BADGE_GALLERY_LOAD_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_GALLERY_LOAD_ERROR });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void fetchBadges(); }, [fetchBadges]);

  const handleAssign = async () => {
    if (!selected || !assignTarget.trim() || assigningRef.current) return;
    assigningRef.current = true;
    setAssigning(true);
    setStatus(null);

    try {
      const res = await apiService.patch<{ success: boolean }>(
        buildBadgeActionPath(selected.id, 'assign'),
        { assignedTo: assignType, assignedTarget: assignTarget.trim() },
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        setStatus({ type: 'success', text: `"${selected.name}" assignment saved.` });
        setSelected(null);
        setAssignTarget('');
        await fetchBadges();
      } else {
        setStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!selected || assigningRef.current) return;
    assigningRef.current = true;
    setAssigning(true);
    setStatus(null);

    try {
      const res = await apiService.patch<{ success: boolean }>(
        buildBadgeActionPath(selected.id, 'unassign'),
        undefined,
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        setStatus({ type: 'success', text: `"${selected.name}" assignment cleared.` });
        setSelected(null);
        await fetchBadges();
      } else {
        setStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_GALLERY_ASSIGN_ERROR });
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };

  const handleShareToggle = async () => {
    if (!selected || sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    setStatus(null);

    try {
      const endpoint = selected.isShared
        ? '/api/admin/badge-creator/marketplace/unshare'
        : '/api/admin/badge-creator/marketplace/share';
      const res = await apiService.post<{ success: boolean }>(
        endpoint,
        { badgeId: selected.id },
        { validateStatus: status => status < 500 }
      );
      if (res.data.success) {
        setStatus({
          type: 'success',
          text: selected.isShared ? `"${selected.name}" removed from marketplace.` : `"${selected.name}" shared to marketplace.`,
        });
        setSelected(current => current ? { ...current, isShared: !current.isShared } : current);
        await fetchBadges();
      } else {
        setStatus({ type: 'error', text: BADGE_GALLERY_SHARE_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: BADGE_GALLERY_SHARE_ERROR });
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <LoadingState role="status" aria-live="polite">
        <LoadingSpinner size={18} aria-hidden="true" />
        Loading gallery...
      </LoadingState>
    );
  }

  return (
    <Panel>
      {status && (
        <StatusBanner $type={status.type} role="status" aria-live="polite">
          {status.text}
        </StatusBanner>
      )}

      <FilterBar>
        <FilterIcon size={14} aria-hidden="true" />
        {['all', 'common', 'rare', 'epic', 'legendary'].map(f => (
          <FilterBtn
            key={f}
            type="button"
            $active={filter === f}
            onClick={() => { setFilter(f); setSelected(null); }}
          >
            {f}
          </FilterBtn>
        ))}
      </FilterBar>

      {badges.length === 0 ? (
        <EmptyState>
          <EmptyIcon size={36} aria-hidden="true" />
          <div>No badges yet - create your first in the Generator tab</div>
        </EmptyState>
      ) : (
        <BadgeGrid>
          {badges.map(badge => {
            const isSelected = selected?.id === badge.id;
            const safeImageUrl = safeBadgeImageUrl(badge.imageUrl);
            return (
              <BadgeCard
                key={badge.id}
                type="button"
                $rarity={badge.rarity}
                $selected={isSelected}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${badge.name} badge`}
                onClick={() => setSelected(isSelected ? null : badge)}
              >
                <BadgeImg>
                  {safeImageUrl ? (
                    badge.rarity === 'legendary' ? (
                      <AnimatedBadge src={safeImageUrl} alt={badge.name} size={160} />
                    ) : (
                      <img src={safeImageUrl} alt={badge.name} />
                    )
                  ) : (
                    <PlaceholderIcon size={32} aria-hidden="true" />
                  )}
                </BadgeImg>
                <BadgeName>{badge.name}</BadgeName>
                <BadgeMeta>
                  <RarityTag $rarity={badge.rarity}>{badge.rarity}</RarityTag>
                  {badge.assignedTo && (
                    <AssignTag>
                      {badge.assignedTo}: {badge.assignedTarget}
                    </AssignTag>
                  )}
                </BadgeMeta>
              </BadgeCard>
            );
          })}
        </BadgeGrid>
      )}

      {selected && (
        <AssignPanel>
          <AssignTitle>
            <Tag size={16} aria-hidden="true" />
            Assign "{selected.name}"
            {selected.assignedTo && (
              <AssignTag>
                Currently: {selected.assignedTo} to {selected.assignedTarget}
              </AssignTag>
            )}
          </AssignTitle>

          <AssignRow>
            <AssignSelect value={assignType} onChange={e => { setAssignType(e.target.value); setAssignTarget(''); }}>
              <option value="achievement">Assign to Achievement</option>
              <option value="tab">Assign to Tab Icon</option>
              <option value="milestone">Assign to Milestone</option>
            </AssignSelect>

            {assignType === 'tab' ? (
              <AssignSelect value={assignTarget} onChange={e => setAssignTarget(e.target.value)}>
                <option value="">Select tab...</option>
                {TAB_TARGETS.map(t => <option key={t} value={t}>{titleCaseTab(t)}</option>)}
              </AssignSelect>
            ) : (
              <AssignInput
                type="text"
                placeholder={assignType === 'achievement' ? 'Achievement name...' : 'Milestone ID...'}
                value={assignTarget}
                onChange={e => setAssignTarget(e.target.value)}
              />
            )}
          </AssignRow>

          <AssignRow>
            <AssignBtn type="button" onClick={() => void handleAssign()} disabled={!assignTarget.trim() || assigning} aria-busy={assigning}>
              <Check size={14} />
              {assigning ? 'Assigning...' : 'Assign'}
            </AssignBtn>
            {selected.assignedTo && (
              <AssignBtn type="button" $variant="danger" onClick={() => void handleUnassign()} disabled={assigning} aria-busy={assigning}>
                <X size={14} /> Unassign
              </AssignBtn>
            )}
            <AssignBtn type="button" onClick={() => void handleShareToggle()} disabled={sharing} aria-busy={sharing}>
              <Share2 size={14} />
              {sharing ? 'Updating...' : selected.isShared ? 'Unshare from Marketplace' : 'Share to Marketplace'}
            </AssignBtn>
          </AssignRow>
        </AssignPanel>
      )}
    </Panel>
  );
};

export default BadgeGalleryPanel;
