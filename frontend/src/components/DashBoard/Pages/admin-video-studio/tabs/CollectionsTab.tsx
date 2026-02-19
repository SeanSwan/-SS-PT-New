/**
 * CollectionsTab.tsx
 * ==================
 * Collection (playlist/series/course) builder.
 * List collections, create/edit, reorder videos within a collection via drag-and-drop.
 *
 * API Integration:
 *   GET    /api/v2/admin/collections              → list (with videoCount, search, filters)
 *   POST   /api/v2/admin/collections              → create
 *   GET    /api/v2/admin/collections/:id          → detail with videos
 *   PUT    /api/v2/admin/collections/:id          → update
 *   DELETE /api/v2/admin/collections/:id          → soft delete
 *   POST   /api/v2/admin/collections/:id/videos   → add videos { videoIds: string[] }
 *   DELETE /api/v2/admin/collections/:id/videos/:videoId → remove video
 *   PATCH  /api/v2/admin/collections/:id/reorder  → reorder { videoIds: string[] }
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FolderOpen,
  Plus,
  GripVertical,
  Trash2,
  Edit3,
  X,
  Save,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  Film,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

// ─── Types ───────────────────────────────────────────
interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  visibility: string;
  accessTier: string;
  videoCount: number;
  createdAt: string;
}

interface CollectionVideo {
  id: string;           // video catalog UUID
  collectionItemId: string; // join table row UUID
  title: string;
  slug: string;
  source: 'upload' | 'youtube';
  status: string;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  durationSeconds: number;
  sortOrder: number;
}

interface CatalogVideo {
  id: string;
  title: string;
  slug: string;
  source: 'upload' | 'youtube';
  status: string;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  durationSeconds: number;
  viewCount: number;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div``;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  min-height: 44px;
  transition: color 0.2s;

  &:hover {
    color: #00ffff;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const DangerButton = styled(PrimaryButton)`
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid rgba(239, 68, 68, 0.5);

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.5);
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: rgba(30, 58, 138, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);

  &:hover:not(:disabled) {
    background: rgba(30, 58, 138, 0.5);
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 0 12px;
  flex: 1;
  max-width: 320px;
  min-height: 44px;

  svg {
    width: 16px;
    height: 16px;
    color: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  input {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    width: 100%;
    outline: none;

    &::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const CollectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CollectionCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    background: rgba(30, 58, 138, 0.25);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px;
  }
`;

const CollectionIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.3), rgba(0, 255, 255, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
    color: #00ffff;
  }
`;

const CollectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CollectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
`;

const CollectionMeta = styled.p`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const TypeBadge = styled.span`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(120, 81, 169, 0.5);
  color: white;
  text-transform: uppercase;
`;

const ArrowIcon = styled.span`
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  flex-shrink: 0;

  svg {
    width: 20px;
    height: 20px;
  }
`;

// Form Modal
const FormOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const FormPanel = styled(motion.div)`
  background: rgba(10, 10, 26, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
`;

const FormTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 20px 0;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

const TextArea = styled.textarea`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #0a0a1a;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
`;

// Detail view
const DetailHeader = styled.div`
  margin-bottom: 20px;
`;

const DetailTitle = styled.h2`
  font-size: 22px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
`;

const DetailDesc = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 4px 0;
`;

const DetailMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

// Sortable video items
const SortableItem = styled.div<{ $isDragging?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid ${(p) => (p.$isDragging ? 'rgba(0, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.2)')};
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
`;

const DragHandle = styled.span`
  color: rgba(255, 255, 255, 0.3);
  cursor: grab;
  display: flex;
  touch-action: none;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
  }
`;

const SmallThumb = styled.div<{ $src?: string | null }>`
  width: 64px;
  height: 36px;
  border-radius: 6px;
  background: ${(p) =>
    p.$src ? `url(${p.$src}) center/cover no-repeat` : 'rgba(0, 0, 0, 0.4)'};
  flex-shrink: 0;
`;

const VideoTitle = styled.span`
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SourceBadge = styled.span<{ $source: string }>`
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
  background: ${(p) => p.$source === 'youtube' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
  color: ${(p) => p.$source === 'youtube' ? '#fca5a5' : '#93c5fd'};
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
  color: rgba(239, 68, 68, 0.7);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    color: white;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const EmptyState = styled.p`
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
`;

const StatusMsg = styled.p<{ $error?: boolean }>`
  font-size: 14px;
  color: ${(p) => (p.$error ? '#ef4444' : '#22c55e')};
  margin: 8px 0 0;
`;

// Video Picker Modal
const PickerGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
  margin: 16px 0;
  padding-right: 4px;
`;

const PickerRow = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(p) => p.$selected ? 'rgba(0, 255, 255, 0.1)' : 'rgba(30, 58, 138, 0.1)'};
  border: 1px solid ${(p) => p.$selected ? 'rgba(0, 255, 255, 0.4)' : 'rgba(59, 130, 246, 0.15)'};

  &:hover {
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const PickerCheck = styled.div<{ $checked: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid ${(p) => p.$checked ? '#00ffff' : 'rgba(255,255,255,0.2)'};
  background: ${(p) => p.$checked ? 'rgba(0,255,255,0.2)' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
    color: #00ffff;
  }
`;

const PickerTitle = styled.span`
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PickerCount = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  padding: 4px 0;
`;

// ─── Sortable Video Item ─────────────────────────────
const SortableVideoItem: React.FC<{
  item: CollectionVideo;
  onRemove: (videoId: string) => void;
}> = ({ item, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumb = item.thumbnailUrl || item.thumbnailKey || null;

  return (
    <SortableItem ref={setNodeRef} style={style} $isDragging={isDragging}>
      <DragHandle {...attributes} {...listeners}>
        <GripVertical />
      </DragHandle>
      <SmallThumb $src={thumb} />
      <VideoTitle>{item.title}</VideoTitle>
      <SourceBadge $source={item.source}>{item.source}</SourceBadge>
      <RemoveButton onClick={() => onRemove(item.id)} title="Remove from collection">
        <Trash2 />
      </RemoveButton>
    </SortableItem>
  );
};

// ─── Main Component ──────────────────────────────────
const CollectionsTab: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('playlist');
  const [formVisibility, setFormVisibility] = useState('public');
  const [formAccessTier, setFormAccessTier] = useState('free');
  const [saving, setSaving] = useState(false);

  // Detail view state
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionVideos, setCollectionVideos] = useState<CollectionVideo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reorderDirty, setReorderDirty] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Video picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerVideos, setPickerVideos] = useState<CatalogVideo[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerAdding, setPickerAdding] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ─── Collections List ─────────────────────────────
  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const data = await fetchWithAuth(`/api/v2/admin/collections?${params.toString()}`);
      if (data.success && Array.isArray(data.data)) {
        setCollections(data.data);
      } else {
        setCollections([]);
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // ─── Collection Detail ─────────────────────────────
  const fetchCollectionDetail = async (col: Collection) => {
    setSelectedCollection(col);
    setDetailLoading(true);
    setReorderDirty(false);
    try {
      const data = await fetchWithAuth(`/api/v2/admin/collections/${col.id}`);
      if (data.success && data.data) {
        const detail = data.data;
        // Update collection metadata from response
        setSelectedCollection({
          ...col,
          title: detail.title || col.title,
          description: detail.description || col.description,
        });
        // Map videos from response
        const videos: CollectionVideo[] = (detail.videos || []).map((v: any) => ({
          id: v.id,
          collectionItemId: v.collectionItemId,
          title: v.title || 'Untitled',
          slug: v.slug || '',
          source: v.source || 'upload',
          status: v.status || 'draft',
          thumbnailUrl: v.thumbnailUrl || null,
          thumbnailKey: v.thumbnailKey || null,
          durationSeconds: v.durationSeconds || 0,
          sortOrder: v.sortOrder || 0,
        }));
        setCollectionVideos(videos);
      }
    } catch (err) {
      console.error('Failed to fetch collection detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Create / Edit Form ────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDesc('');
    setFormType('playlist');
    setFormVisibility('public');
    setFormAccessTier('free');
    setFormMsg(null);
    setShowForm(true);
  };

  const openEdit = (col: Collection) => {
    setEditingId(col.id);
    setFormTitle(col.title);
    setFormDesc(col.description || '');
    setFormType(col.type);
    setFormVisibility(col.visibility);
    setFormAccessTier(col.accessTier);
    setFormMsg(null);
    setShowForm(true);
  };

  // Enforce visibility → access tier constraints (mirrors DB CHECK constraints)
  useEffect(() => {
    if (formVisibility === 'public' && formAccessTier !== 'free') {
      setFormAccessTier('free');
    } else if (formVisibility === 'unlisted' && formAccessTier === 'premium') {
      setFormAccessTier('member');
    }
  }, [formVisibility, formAccessTier]);

  // Determine which access tiers are allowed for current visibility
  const allowedAccessTiers = formVisibility === 'public'
    ? ['free']
    : formVisibility === 'unlisted'
      ? ['free', 'member']
      : ['free', 'member', 'premium'];

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    setFormMsg(null);
    try {
      const body = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        type: formType,
        visibility: formVisibility,
        accessTier: formAccessTier,
      };
      const url = editingId
        ? `/api/v2/admin/collections/${editingId}`
        : '/api/v2/admin/collections';
      const method = editingId ? 'PUT' : 'POST';
      const data = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      if (data.success) {
        setShowForm(false);
        fetchCollections();
        // If editing the currently selected collection, update its details
        if (editingId && selectedCollection?.id === editingId) {
          setSelectedCollection((prev) =>
            prev ? { ...prev, title: body.title, description: body.description, type: body.type, visibility: body.visibility, accessTier: body.accessTier } : prev
          );
        }
      } else {
        setFormMsg({ text: data.error || 'Save failed', error: true });
      }
    } catch (err: any) {
      setFormMsg({ text: err.message || 'Save failed', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await fetchWithAuth(`/api/v2/admin/collections/${id}`, { method: 'DELETE' });
      fetchCollections();
      if (selectedCollection?.id === id) setSelectedCollection(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // ─── Drag & Drop Reorder ───────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = collectionVideos.findIndex((v) => v.id === active.id);
    const newIndex = collectionVideos.findIndex((v) => v.id === over.id);
    const reordered = arrayMove(collectionVideos, oldIndex, newIndex);
    setCollectionVideos(reordered);
    setReorderDirty(true);
  };

  const saveReorder = async () => {
    if (!selectedCollection || !reorderDirty) return;
    setReorderSaving(true);
    try {
      const videoIds = collectionVideos.map((v) => v.id);
      await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ videoIds }),
      });
      setReorderDirty(false);
    } catch (err) {
      console.error('Reorder failed:', err);
    } finally {
      setReorderSaving(false);
    }
  };

  // ─── Remove Video ──────────────────────────────────
  const handleRemoveVideo = async (videoId: string) => {
    if (!selectedCollection) return;
    try {
      await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/videos/${videoId}`, {
        method: 'DELETE',
      });
      setCollectionVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Remove video failed:', err);
    }
  };

  // ─── Video Picker ──────────────────────────────────
  const openPicker = async () => {
    setShowPicker(true);
    setPickerSelected(new Set());
    setPickerSearch('');
    await searchPickerVideos('');
  };

  const searchPickerVideos = async (query: string) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', status: 'published' });
      if (query) params.set('search', query);
      const data = await fetchWithAuth(`/api/v2/admin/videos?${params.toString()}`);
      if (data.success && Array.isArray(data.data)) {
        // Filter out videos already in the collection
        const existingIds = new Set(collectionVideos.map((v) => v.id));
        const available = data.data.filter((v: CatalogVideo) => !existingIds.has(v.id));
        setPickerVideos(available);
      }
    } catch (err) {
      console.error('Failed to search videos:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  const togglePickerVideo = (videoId: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const addSelectedVideos = async () => {
    if (!selectedCollection || pickerSelected.size === 0) return;
    setPickerAdding(true);
    try {
      const videoIds = Array.from(pickerSelected);
      const data = await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/videos`, {
        method: 'POST',
        body: JSON.stringify({ videoIds }),
      });
      if (data.success) {
        setShowPicker(false);
        // Refresh the detail view to get updated video list
        fetchCollectionDetail(selectedCollection);
      }
    } catch (err) {
      console.error('Add videos failed:', err);
    } finally {
      setPickerAdding(false);
    }
  };

  // Debounced picker search
  useEffect(() => {
    if (!showPicker) return;
    const timer = setTimeout(() => {
      searchPickerVideos(pickerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [pickerSearch, showPicker]);

  // ─── Detail View Render ────────────────────────────
  if (selectedCollection) {
    return (
      <Container>
        <TopBar>
          <BackButton onClick={() => { setSelectedCollection(null); fetchCollections(); }}>
            <ArrowLeft /> Back to Collections
          </BackButton>
          <div style={{ display: 'flex', gap: 8 }}>
            <SecondaryButton onClick={() => openEdit(selectedCollection)}>
              <Edit3 /> Edit
            </SecondaryButton>
            <DangerButton onClick={() => handleDelete(selectedCollection.id)}>
              <Trash2 /> Delete
            </DangerButton>
          </div>
        </TopBar>

        <DetailHeader>
          <DetailTitle>{selectedCollection.title}</DetailTitle>
          {selectedCollection.description && (
            <DetailDesc>{selectedCollection.description}</DetailDesc>
          )}
          <DetailMeta>
            <TypeBadge>{selectedCollection.type}</TypeBadge>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {selectedCollection.visibility} · {selectedCollection.accessTier}
            </span>
          </DetailMeta>
        </DetailHeader>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <PrimaryButton onClick={openPicker}>
            <Plus /> Add Videos
          </PrimaryButton>
          {reorderDirty && (
            <PrimaryButton onClick={saveReorder} disabled={reorderSaving}>
              {reorderSaving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Save />}
              Save Order
            </PrimaryButton>
          )}
        </div>

        {detailLoading ? (
          <LoadingText>Loading videos...</LoadingText>
        ) : collectionVideos.length === 0 ? (
          <EmptyState>No videos in this collection yet. Click "Add Videos" to get started.</EmptyState>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={collectionVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              {collectionVideos.map((item) => (
                <SortableVideoItem key={item.id} item={item} onRemove={handleRemoveVideo} />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Video Picker Modal */}
        <AnimatePresence>
          {showPicker && (
            <FormOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPicker(false)}
            >
              <FormPanel
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 600 }}
              >
                <FormTitle>Add Videos to Collection</FormTitle>

                <SearchBar style={{ maxWidth: '100%', marginBottom: 12 }}>
                  <Search />
                  <input
                    placeholder="Search videos by title..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    autoFocus
                  />
                  {pickerSearch && (
                    <X
                      style={{ cursor: 'pointer', width: 14, height: 14 }}
                      onClick={() => setPickerSearch('')}
                    />
                  )}
                </SearchBar>

                {pickerLoading ? (
                  <LoadingText>Searching...</LoadingText>
                ) : pickerVideos.length === 0 ? (
                  <EmptyState>
                    {pickerSearch
                      ? 'No matching videos found.'
                      : 'No published videos available to add.'}
                  </EmptyState>
                ) : (
                  <>
                    <PickerCount>
                      {pickerVideos.length} video{pickerVideos.length !== 1 ? 's' : ''} available
                      {pickerSelected.size > 0 && ` · ${pickerSelected.size} selected`}
                    </PickerCount>
                    <PickerGrid>
                      {pickerVideos.map((v) => (
                        <PickerRow
                          key={v.id}
                          $selected={pickerSelected.has(v.id)}
                          onClick={() => togglePickerVideo(v.id)}
                        >
                          <PickerCheck $checked={pickerSelected.has(v.id)}>
                            {pickerSelected.has(v.id) && <Check />}
                          </PickerCheck>
                          <SmallThumb $src={v.thumbnailUrl || v.thumbnailKey} />
                          <PickerTitle>{v.title}</PickerTitle>
                          <SourceBadge $source={v.source}>{v.source}</SourceBadge>
                        </PickerRow>
                      ))}
                    </PickerGrid>
                  </>
                )}

                <FormActions>
                  <SecondaryButton onClick={() => setShowPicker(false)}>
                    <X /> Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={addSelectedVideos}
                    disabled={pickerSelected.size === 0 || pickerAdding}
                  >
                    {pickerAdding ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Plus />}
                    Add {pickerSelected.size > 0 ? `${pickerSelected.size} Video${pickerSelected.size !== 1 ? 's' : ''}` : 'Videos'}
                  </PrimaryButton>
                </FormActions>
              </FormPanel>
            </FormOverlay>
          )}
        </AnimatePresence>

        {/* Create/Edit Modal (shared) */}
        <AnimatePresence>
          {showForm && (
            <FormOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
            >
              <FormPanel
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <FormTitle>{editingId ? 'Edit Collection' : 'Create Collection'}</FormTitle>
                <FormField>
                  <Label>Title *</Label>
                  <Input
                    placeholder="Collection title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Label>Description</Label>
                  <TextArea
                    placeholder="Describe this collection..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Label>Type</Label>
                  <Select value={formType} onChange={(e) => setFormType(e.target.value)}>
                    <option value="playlist">Playlist</option>
                    <option value="series">Series</option>
                    <option value="course">Course</option>
                  </Select>
                </FormField>
                <FormField>
                  <Label>Visibility</Label>
                  <Select value={formVisibility} onChange={(e) => setFormVisibility(e.target.value)}>
                    <option value="public">Public</option>
                    <option value="members_only">Members Only</option>
                    <option value="unlisted">Unlisted</option>
                  </Select>
                </FormField>
                <FormField>
                  <Label>Access Tier</Label>
                  <Select value={formAccessTier} onChange={(e) => setFormAccessTier(e.target.value)}>
                    {allowedAccessTiers.includes('free') && <option value="free">Free</option>}
                    {allowedAccessTiers.includes('member') && <option value="member">Member</option>}
                    {allowedAccessTiers.includes('premium') && <option value="premium">Premium</option>}
                  </Select>
                </FormField>
                {formMsg && <StatusMsg $error={formMsg.error}>{formMsg.text}</StatusMsg>}
                <FormActions>
                  <SecondaryButton onClick={() => setShowForm(false)}>
                    <X /> Cancel
                  </SecondaryButton>
                  <PrimaryButton onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Save />}
                    {editingId ? 'Update' : 'Create'}
                  </PrimaryButton>
                </FormActions>
              </FormPanel>
            </FormOverlay>
          )}
        </AnimatePresence>
      </Container>
    );
  }

  // ─── List View Render ──────────────────────────────
  return (
    <Container>
      <TopBar>
        <SearchBar>
          <Search />
          <input
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X
              style={{ cursor: 'pointer', width: 14, height: 14 }}
              onClick={() => setSearchQuery('')}
            />
          )}
        </SearchBar>
        <PrimaryButton onClick={openCreate}>
          <Plus /> Create Collection
        </PrimaryButton>
      </TopBar>

      {loading ? (
        <LoadingText>Loading collections...</LoadingText>
      ) : collections.length === 0 ? (
        <EmptyState>
          {searchQuery
            ? 'No collections match your search.'
            : 'No collections yet. Create your first playlist, series, or course.'}
        </EmptyState>
      ) : (
        <CollectionList>
          {collections.map((col) => (
            <CollectionCard key={col.id} onClick={() => fetchCollectionDetail(col)}>
              <CollectionIcon>
                <FolderOpen />
              </CollectionIcon>
              <CollectionInfo>
                <CollectionTitle>{col.title}</CollectionTitle>
                <CollectionMeta>
                  <TypeBadge>{col.type}</TypeBadge>
                  <span>{col.videoCount ?? 0} video{(col.videoCount ?? 0) !== 1 ? 's' : ''}</span>
                  <span>{col.visibility}</span>
                  <span>{col.accessTier}</span>
                </CollectionMeta>
              </CollectionInfo>
              <DangerButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(col.id);
                }}
                style={{ padding: '8px 12px' }}
              >
                <Trash2 />
              </DangerButton>
              <ArrowIcon>
                <ChevronRight />
              </ArrowIcon>
            </CollectionCard>
          ))}
        </CollectionList>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <FormOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <FormPanel
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <FormTitle>{editingId ? 'Edit Collection' : 'Create Collection'}</FormTitle>
              <FormField>
                <Label>Title *</Label>
                <Input
                  placeholder="Collection title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </FormField>
              <FormField>
                <Label>Description</Label>
                <TextArea
                  placeholder="Describe this collection..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </FormField>
              <FormField>
                <Label>Type</Label>
                <Select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="playlist">Playlist</option>
                  <option value="series">Series</option>
                  <option value="course">Course</option>
                </Select>
              </FormField>
              <FormField>
                <Label>Visibility</Label>
                <Select value={formVisibility} onChange={(e) => setFormVisibility(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="members_only">Members Only</option>
                  <option value="unlisted">Unlisted</option>
                </Select>
              </FormField>
              <FormField>
                <Label>Access Tier</Label>
                <Select value={formAccessTier} onChange={(e) => setFormAccessTier(e.target.value)}>
                  <option value="free">Free</option>
                  <option value="member">Member</option>
                  <option value="premium">Premium</option>
                </Select>
              </FormField>
              {formMsg && <StatusMsg $error={formMsg.error}>{formMsg.text}</StatusMsg>}
              <FormActions>
                <SecondaryButton onClick={() => setShowForm(false)}>
                  <X /> Cancel
                </SecondaryButton>
                <PrimaryButton onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Save />}
                  {editingId ? 'Update' : 'Create'}
                </PrimaryButton>
              </FormActions>
            </FormPanel>
          </FormOverlay>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default CollectionsTab;
