/**
 * CollectionsTab.tsx
 * ==================
 * Collection (playlist/series/course) builder.
 * List collections, create new, reorder videos within a collection via drag-and-drop.
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
  Eye,
  X,
  Save,
  Film,
  Loader2,
  ChevronRight,
  ArrowLeft,
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
  id: number;
  title: string;
  description: string;
  type: string;
  visibility: string;
  accessTier: string;
  videoCount: number;
  createdAt: string;
}

interface CollectionVideo {
  id: number;
  videoId: number;
  title: string;
  thumbnailUrl: string | null;
  sortOrder: number;
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

  svg {
    width: 16px;
    height: 16px;
  }
`;

const DangerButton = styled(PrimaryButton)`
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid rgba(239, 68, 68, 0.5);

  &:hover {
    background: rgba(239, 68, 68, 0.5);
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: rgba(30, 58, 138, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);

  &:hover {
    background: rgba(30, 58, 138, 0.5);
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

// Create / Edit Form
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

// Detail view with sortable videos
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
  margin: 0;
`;

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

// ─── Sortable Video Item ─────────────────────────────
const SortableVideoItem: React.FC<{
  item: CollectionVideo;
  onRemove: (id: number) => void;
}> = ({ item, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SortableItem ref={setNodeRef} style={style} $isDragging={isDragging}>
      <DragHandle {...attributes} {...listeners}>
        <GripVertical />
      </DragHandle>
      <SmallThumb $src={item.thumbnailUrl} />
      <VideoTitle>{item.title}</VideoTitle>
      <RemoveButton onClick={() => onRemove(item.id)}>
        <Trash2 />
      </RemoveButton>
    </SortableItem>
  );
};

// ─── Component ───────────────────────────────────────
const CollectionsTab: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('playlist');
  const [formVisibility, setFormVisibility] = useState('public');
  const [formAccessTier, setFormAccessTier] = useState('free');
  const [saving, setSaving] = useState(false);

  // Detail view
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionVideos, setCollectionVideos] = useState<CollectionVideo[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addVideoId, setAddVideoId] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/api/v2/admin/collections');
      setCollections(data.collections || data.data || []);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const fetchCollectionDetail = async (col: Collection) => {
    setSelectedCollection(col);
    setDetailLoading(true);
    try {
      const data = await fetchWithAuth(`/api/v2/admin/collections/${col.id}`);
      setCollectionVideos(data.videos || data.items || []);
    } catch (err) {
      console.error('Failed to fetch collection detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

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
      if (data.error) {
        setFormMsg({ text: data.error, error: true });
      } else {
        setShowForm(false);
        fetchCollections();
      }
    } catch (err: any) {
      setFormMsg({ text: err.message || 'Save failed', error: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await fetchWithAuth(`/api/v2/admin/collections/${id}`, { method: 'DELETE' });
      fetchCollections();
      if (selectedCollection?.id === id) setSelectedCollection(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedCollection) return;

    const oldIndex = collectionVideos.findIndex((v) => v.id === active.id);
    const newIndex = collectionVideos.findIndex((v) => v.id === over.id);
    const reordered = arrayMove(collectionVideos, oldIndex, newIndex);
    setCollectionVideos(reordered);

    try {
      await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ order: reordered.map((v) => v.id) }),
      });
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  };

  const handleRemoveVideo = async (itemId: number) => {
    if (!selectedCollection) return;
    try {
      await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/videos/${itemId}`, {
        method: 'DELETE',
      });
      setCollectionVideos((prev) => prev.filter((v) => v.id !== itemId));
    } catch (err) {
      console.error('Remove video failed:', err);
    }
  };

  const handleAddVideo = async () => {
    if (!addVideoId || !selectedCollection) return;
    try {
      const data = await fetchWithAuth(`/api/v2/admin/collections/${selectedCollection.id}/videos`, {
        method: 'POST',
        body: JSON.stringify({ videoId: Number(addVideoId) }),
      });
      if (data.item || data.video) {
        setCollectionVideos((prev) => [...prev, data.item || data.video]);
        setAddVideoId('');
      }
    } catch (err) {
      console.error('Add video failed:', err);
    }
  };

  // ─── Detail view ───────────────────────────────────
  if (selectedCollection) {
    return (
      <Container>
        <TopBar>
          <BackButton onClick={() => setSelectedCollection(null)}>
            <ArrowLeft /> Back to Collections
          </BackButton>
          <SecondaryButton onClick={() => openEdit(selectedCollection)}>
            <Edit3 /> Edit Collection
          </SecondaryButton>
        </TopBar>

        <DetailHeader>
          <DetailTitle>{selectedCollection.title}</DetailTitle>
          <DetailDesc>{selectedCollection.description}</DetailDesc>
        </DetailHeader>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Video ID to add"
            value={addVideoId}
            onChange={(e) => setAddVideoId(e.target.value)}
            style={{ maxWidth: 200 }}
          />
          <PrimaryButton onClick={handleAddVideo}>
            <Plus /> Add Video
          </PrimaryButton>
        </div>

        {detailLoading ? (
          <LoadingText>Loading videos...</LoadingText>
        ) : collectionVideos.length === 0 ? (
          <EmptyState>No videos in this collection. Add some above.</EmptyState>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={collectionVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
              {collectionVideos.map((item) => (
                <SortableVideoItem key={item.id} item={item} onRemove={handleRemoveVideo} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Container>
    );
  }

  // ─── List view ─────────────────────────────────────
  return (
    <Container>
      <TopBar>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
          {collections.length} Collection{collections.length !== 1 ? 's' : ''}
        </span>
        <PrimaryButton onClick={openCreate}>
          <Plus /> Create Collection
        </PrimaryButton>
      </TopBar>

      {loading ? (
        <LoadingText>Loading collections...</LoadingText>
      ) : collections.length === 0 ? (
        <EmptyState>No collections yet. Create your first playlist, series, or course.</EmptyState>
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
                  <span>{col.videoCount} video{col.videoCount !== 1 ? 's' : ''}</span>
                  <span>{col.visibility}</span>
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
                  <option value="private">Private</option>
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
                  {saving ? <Loader2 /> : <Save />}
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
