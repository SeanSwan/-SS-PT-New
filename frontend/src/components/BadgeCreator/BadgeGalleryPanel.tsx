/**
 * ┌─── COMPONENT: BadgeGalleryPanel ──────────────────────────────┐
 * │ PURPOSE: Browsable gallery of all created badges with         │
 * │   rarity borders, filtering, and assignment actions.          │
 * │ PHASE 2: Assign to Achievement, Assign to Tab, Unassign.     │
 * │ CEO RULING: Rarity borders — Common=lavender, Rare=gold,     │
 * │   Epic=purple, Legendary=animated gradient.                   │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Grid3X3, Filter, Trophy, Layout, X, Check,
  Tag, Sparkles, Loader, Image, Share2,
} from 'lucide-react';
import AnimatedBadge from './AnimatedBadge';

// ── Rarity gradient animation ──
const legendaryGlow = keyframes`
  0% { border-color: #C6A84B; box-shadow: 0 0 8px rgba(198, 168, 75, 0.3); }
  33% { border-color: #8B5CF6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.3); }
  66% { border-color: #60C0F0; box-shadow: 0 0 8px rgba(96, 192, 240, 0.3); }
  100% { border-color: #C6A84B; box-shadow: 0 0 8px rgba(198, 168, 75, 0.3); }
`;

const RARITY_BORDERS: Record<string, string> = {
  common: '2px solid rgba(64, 112, 192, 0.4)',     // Swan Lavender
  rare: '2px solid rgba(198, 168, 75, 0.6)',        // Gilded Fern
  epic: '2px solid rgba(139, 92, 246, 0.6)',        // Wing Purple
  legendary: '2px solid #C6A84B',                    // Base — animation overrides
};

const RARITY_COLORS: Record<string, string> = {
  common: '#4070C0',
  rare: '#C6A84B',
  epic: '#8B5CF6',
  legendary: '#C6A84B',
};

// ── Tab icon targets ──
const TAB_TARGETS = [
  'workout', 'nutrition', 'schedule', 'social', 'bootcamp',
  'analytics', 'profile', 'rewards', 'body-map', 'sprint-planner',
  'video-call', 'my-home', 'virtual-olympics', 'badge-creator',
];

// ── Styled Components ──
const Panel = styled.div`
  padding: 0;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.65))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: capitalize;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const BadgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`;

const BadgeCard = styled.div<{ $rarity: string; $selected: boolean }>`
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: ${({ $rarity }) => RARITY_BORDERS[$rarity] || RARITY_BORDERS.common};
  ${({ $rarity }) => $rarity === 'legendary' ? `animation: ${legendaryGlow} 3s ease-in-out infinite;` : ''}
  cursor: pointer;
  transition: all 0.15s;
  outline: ${({ $selected }) => $selected ? '2px solid var(--accent-primary, #60C0F0)' : 'none'};
  outline-offset: 2px;

  &:hover { transform: translateY(-2px); }
`;

const BadgeImg = styled.div`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(10, 10, 15, 0.6);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const BadgeName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BadgeMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RarityTag = styled.span<{ $rarity: string }>`
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || '#4070C0'};
  text-transform: uppercase;
  font-weight: 700;
`;

const AssignTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-size: 10px;
`;

// ── Assignment Panel ──
const AssignPanel = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.15);
  margin-top: 20px;
`;

const AssignTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AssignRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const AssignSelect = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  flex: 1;
  min-width: 140px;

  option { background: #141419; }
`;

const AssignBtn = styled.button<{ $variant?: string }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: ${({ $variant }) => $variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, #002060, #8B5CF6)'};
  color: ${({ $variant }) => $variant === 'danger' ? '#EF4444' : '#E0ECF4'};
  ${({ $variant }) => $variant === 'danger' ? 'border: 1px solid rgba(239, 68, 68, 0.3);' : ''}
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 16px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  gap: 8px;
`;

// ── Types ──
interface BadgeData {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: string;
  category: string;
  xpReward: number;
  assignedTo: string | null;
  assignedTarget: string | null;
  isShared: boolean;
  isAnimated: boolean;
  createdAt: string;
}

const BadgeGalleryPanel: React.FC = () => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<BadgeData | null>(null);
  const [assignType, setAssignType] = useState<string>('achievement');
  const [assignTarget, setAssignTarget] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [sharing, setSharing] = useState(false);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchBadges = useCallback(async () => {
    try {
      const query = filter !== 'all' ? `?rarity=${filter}` : '';
      const res = await fetch(`/api/admin/badge-creator/gallery${query}`, { headers });
      const d = await res.json();
      if (d.success) setBadges(d.data);
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const handleAssign = async () => {
    if (!selected || !assignTarget.trim()) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/badge-creator/${selected.id}/assign`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ assignedTo: assignType, assignedTarget: assignTarget.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setSelected(null);
        setAssignTarget('');
        fetchBadges();
      }
    } catch { /* best-effort */ }
    setAssigning(false);
  };

  const handleUnassign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/badge-creator/${selected.id}/unassign`, {
        method: 'PATCH',
        headers,
      });
      const d = await res.json();
      if (d.success) {
        setSelected(null);
        fetchBadges();
      }
    } catch { /* best-effort */ }
    setAssigning(false);
  };

  if (loading) {
    return (
      <LoadingState>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Loading gallery...
      </LoadingState>
    );
  }

  return (
    <Panel>
      {/* Filters */}
      <FilterBar>
        <Filter size={14} style={{ color: 'rgba(224, 236, 244, 0.5)', alignSelf: 'center' }} />
        {['all', 'common', 'rare', 'epic', 'legendary'].map(f => (
          <FilterBtn key={f} $active={filter === f} onClick={() => { setFilter(f); setSelected(null); }}>
            {f}
          </FilterBtn>
        ))}
      </FilterBar>

      {/* Badge Grid */}
      {badges.length === 0 ? (
        <EmptyState>
          <Image size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div>No badges yet — create your first in the Generator tab</div>
        </EmptyState>
      ) : (
        <BadgeGrid>
          {badges.map(badge => (
            <BadgeCard
              key={badge.id}
              $rarity={badge.rarity}
              $selected={selected?.id === badge.id}
              onClick={() => setSelected(selected?.id === badge.id ? null : badge)}
            >
              <BadgeImg>
                {badge.imageUrl ? (
                  badge.rarity === 'legendary' ? (
                    <AnimatedBadge src={badge.imageUrl} alt={badge.name} size={160} />
                  ) : (
                    <img src={badge.imageUrl} alt={badge.name} />
                  )
                ) : (
                  <Image size={32} style={{ opacity: 0.3 }} />
                )}
              </BadgeImg>
              <BadgeName>{badge.name}</BadgeName>
              <BadgeMeta>
                <RarityTag $rarity={badge.rarity}>{badge.rarity}</RarityTag>
                {badge.assignedTo && (
                  <AssignTag>
                    → {badge.assignedTo}: {badge.assignedTarget}
                  </AssignTag>
                )}
              </BadgeMeta>
            </BadgeCard>
          ))}
        </BadgeGrid>
      )}

      {/* Assignment Panel (shown when a badge is selected) */}
      {selected && (
        <AssignPanel>
          <AssignTitle>
            <Tag size={16} />
            Assign "{selected.name}"
            {selected.assignedTo && (
              <AssignTag style={{ fontSize: 12, marginLeft: 'auto' }}>
                Currently: {selected.assignedTo} → {selected.assignedTarget}
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
                {TAB_TARGETS.map(t => (
                  <option key={t} value={t}>{t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </AssignSelect>
            ) : (
              <AssignSelect
                as="input"
                type="text"
                placeholder={assignType === 'achievement' ? 'Achievement name...' : 'Milestone ID...'}
                value={assignTarget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignTarget(e.target.value)}
                style={{ flex: 2 }}
              />
            )}
          </AssignRow>

          <AssignRow>
            <AssignBtn onClick={handleAssign} disabled={!assignTarget.trim() || assigning}>
              <Check size={14} />
              {assigning ? 'Assigning...' : 'Assign'}
            </AssignBtn>

            {selected.assignedTo && (
              <AssignBtn $variant="danger" onClick={handleUnassign} disabled={assigning}>
                <X size={14} /> Unassign
              </AssignBtn>
            )}

            <AssignBtn
              onClick={async () => {
                if (!selected) return;
                setSharing(true);
                const endpoint = selected.isShared
                  ? '/api/admin/badge-creator/marketplace/unshare'
                  : '/api/admin/badge-creator/marketplace/share';
                try {
                  await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ badgeId: selected.id }),
                  });
                  fetchBadges();
                } catch { /* best-effort */ }
                setSharing(false);
              }}
              disabled={sharing}
            >
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
