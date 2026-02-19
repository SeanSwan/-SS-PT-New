/**
 * CollectionBuilder.tsx
 * =====================
 * Drag-and-drop collection builder using @dnd-kit/core and @dnd-kit/sortable.
 * Displays sortable video items with thumbnails, titles, durations,
 * and drag handles. Supports remove, add, and save reorder.
 *
 * NOTE: Requires @dnd-kit/core, @dnd-kit/sortable, and @dnd-kit/utilities
 *       to be installed: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  GripVertical, X, Plus, Save, Clock, Loader, Check,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──────────────────────────────────────────────────────────────────
interface CollectionVideo {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  durationSeconds: number;
}

interface CollectionBuilderProps {
  collectionId: string;
  videos: CollectionVideo[];
  onReorder: (videoIds: string[]) => void;
  onRemove: (videoId: string) => void;
  onAddVideos: () => void;
}

// ── API helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Styled Components ──────────────────────────────────────────────────────
const Container = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const HeaderTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'ghost' | 'success' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${p => {
    switch (p.$variant) {
      case 'ghost':
        return `
          background: transparent;
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #94a3b8;
          &:hover { background: rgba(59, 130, 246, 0.1); color: #e2e8f0; }
        `;
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
          color: #4ade80;
          cursor: default;
        `;
      default:
        return `
          background: linear-gradient(135deg, #3b82f6, #00c8ff);
          border: none;
          color: #fff;
          &:hover { opacity: 0.9; transform: translateY(-1px); }
          &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        `;
    }
  }}
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2.5rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
  border: 2px dashed rgba(59, 130, 246, 0.2);
  border-radius: 12px;
`;

const ItemWrapper = styled.div<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: ${p =>
    p.$isDragging ? 'rgba(30, 58, 138, 0.5)' : 'rgba(30, 58, 138, 0.3)'};
  border: 1px solid ${p =>
    p.$isDragging ? 'rgba(0, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.3)'};
  border-radius: 8px;
  box-shadow: ${p =>
    p.$isDragging ? '0 0 20px rgba(0, 255, 255, 0.3)' : 'none'};
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  user-select: none;
`;

const DragHandle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: #475569;
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: #00ffff;
    background: rgba(0, 255, 255, 0.06);
  }

  &:active {
    cursor: grabbing;
  }
`;

const ItemThumb = styled.div<{ $src?: string | null }>`
  width: 64px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${p =>
    p.$src
      ? `url(${p.$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, rgba(30, 58, 138, 0.5), rgba(0, 255, 255, 0.08))'};
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.p`
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemDuration = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.15rem;
`;

const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
`;

const CountLabel = styled.span`
  color: #64748b;
  font-size: 0.82rem;
`;

// ── Sortable Item ──────────────────────────────────────────────────────────
interface SortableItemProps {
  video: CollectionVideo;
  onRemove: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ video, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ItemWrapper $isDragging={isDragging}>
        <DragHandle
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${video.title}`}
        >
          <GripVertical size={18} />
        </DragHandle>

        <ItemThumb $src={video.thumbnailUrl} />

        <ItemInfo>
          <ItemTitle title={video.title}>{video.title}</ItemTitle>
          {video.durationSeconds > 0 && (
            <ItemDuration>
              <Clock size={11} />
              {formatDuration(video.durationSeconds)}
            </ItemDuration>
          )}
        </ItemInfo>

        <RemoveBtn
          onClick={() => onRemove(video.id)}
          aria-label={`Remove ${video.title}`}
        >
          <X size={16} />
        </RemoveBtn>
      </ItemWrapper>
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────
const CollectionBuilder: React.FC<CollectionBuilderProps> = ({
  collectionId,
  videos,
  onReorder,
  onRemove,
  onAddVideos,
}) => {
  const [items, setItems] = useState<CollectionVideo[]>(videos);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync external videos prop
  React.useEffect(() => {
    setItems(videos);
    setSaved(false);
  }, [videos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems(prev => {
      const oldIdx = prev.findIndex(v => v.id === active.id);
      const newIdx = prev.findIndex(v => v.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const orderedIds = items.map(v => v.id);

    try {
      const resp = await fetch(`/api/v2/admin/collections/${collectionId}/reorder`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ videoIds: orderedIds }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save order');
      }

      onReorder(orderedIds);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save reorder failed:', err);
    } finally {
      setSaving(false);
    }
  }, [items, collectionId, onReorder]);

  const handleRemove = useCallback(
    (videoId: string) => {
      setItems(prev => prev.filter(v => v.id !== videoId));
      onRemove(videoId);
      setSaved(false);
    },
    [onRemove],
  );

  const hasChanges = JSON.stringify(items.map(v => v.id)) !== JSON.stringify(videos.map(v => v.id));

  return (
    <Container>
      <Header>
        <div>
          <HeaderTitle>Collection Videos</HeaderTitle>
          <CountLabel>{items.length} video{items.length !== 1 ? 's' : ''}</CountLabel>
        </div>
        <HeaderActions>
          <ActionBtn $variant="ghost" onClick={onAddVideos}>
            <Plus size={16} /> Add Videos
          </ActionBtn>
          {saved ? (
            <ActionBtn $variant="success" disabled>
              <Check size={16} /> Saved
            </ActionBtn>
          ) : (
            <ActionBtn onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Order
                </>
              )}
            </ActionBtn>
          )}
        </HeaderActions>
      </Header>

      {items.length === 0 ? (
        <EmptyState>
          No videos in this collection yet.
          <br />
          <span
            style={{ color: '#00ffff', cursor: 'pointer', marginTop: '0.5rem', display: 'inline-block' }}
            onClick={onAddVideos}
            role="button"
            tabIndex={0}
          >
            + Add videos to get started
          </span>
        </EmptyState>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(v => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <List>
              <AnimatePresence>
                {items.map(video => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <SortableItem video={video} onRemove={handleRemove} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          </SortableContext>
        </DndContext>
      )}
    </Container>
  );
};

export default CollectionBuilder;
