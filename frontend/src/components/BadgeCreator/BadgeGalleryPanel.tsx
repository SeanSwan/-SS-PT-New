/**
 * COMPONENT: BadgeGalleryPanel
 * PURPOSE: Browse generated badges and manage badge admin edits.
 * DATA: Uses protected `/api/admin/badge-creator/gallery` routes.
 */

import React, { useCallback, useEffect, useState } from 'react';
import AnimatedBadge from './AnimatedBadge';
import BadgeAdminEditorPanel from './BadgeAdminEditorPanel';
import apiService from '../../services/api.service';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import { normalizeGalleryBadges, type GalleryBadgeRow } from './BadgeCreatorPayloadSafety';
import {
  AssignTag,
  BadgeCard,
  BadgeGrid,
  BadgeImg,
  BadgeMeta,
  BadgeName,
  EmptyIcon,
  EmptyState,
  FilterBar,
  FilterBtn,
  FilterIcon,
  LoadingSpinner,
  LoadingState,
  Panel,
  PlaceholderIcon,
  RarityTag,
  StatusBanner,
} from './BadgeGalleryPanel.styles';

const BADGE_GALLERY_LOAD_ERROR =
  'Badge gallery could not load. Refresh and try again.';

type BadgeData = GalleryBadgeRow;

const BadgeGalleryPanel: React.FC = () => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<BadgeData | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
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
        <BadgeAdminEditorPanel
          badge={selected}
          onChanged={fetchBadges}
          onClose={() => setSelected(null)}
          onStatus={setStatus}
        />
      )}
    </Panel>
  );
};

export default BadgeGalleryPanel;
