/**
 * VideoDetailView.tsx
 * ===================
 * Route-based video detail page for /dashboard/content/video-studio/:id
 * Loads video metadata from API, allows editing, status changes, and deletion.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Play,
  Youtube,
  Upload,
  Calendar,
  Film,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────
interface VideoDetail {
  id: string;
  title: string;
  description: string;
  source: 'upload' | 'youtube';
  status: 'draft' | 'published' | 'archived';
  visibility: string;
  contentType: string;
  thumbnailUrl: string | null;
  signedThumbnailUrl?: string;
  signedPlaybackUrl?: string;
  youtubeVideoId?: string;
  viewCount: number;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

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

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// ─── Component ───────────────────────────────────────
const VideoDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('');
  const [contentType, setContentType] = useState('');
  const [status, setStatus] = useState<VideoDetail['status']>('draft');

  const fetchVideo = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`/api/v2/admin/videos/${id}`);
      if (data.success && data.data) {
        const v = data.data;
        setVideo(v);
        setTitle(v.title || '');
        setDescription(v.description || '');
        setVisibility(v.visibility || 'public');
        setContentType(v.contentType || '');
        setStatus(v.status || 'draft');
      } else {
        setError(data.message || 'Video not found');
      }
    } catch {
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVideo(); }, [fetchVideo]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const data = await fetchWithAuth(`/api/v2/admin/videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, visibility, contentType, status }),
      });
      if (data.success) {
        setVideo((prev) => prev ? { ...prev, title, description, visibility, contentType, status } : prev);
      } else {
        setError(data.message || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const data = await fetchWithAuth(`/api/v2/admin/videos/${id}`, { method: 'DELETE' });
      if (data.success) {
        navigate('/dashboard/content/video-studio');
      } else {
        setError(data.message || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete');
    }
  };

  const goBack = () => navigate('/dashboard/content/video-studio');

  if (loading) {
    return (
      <Container>
        <LoadingText>Loading video...</LoadingText>
      </Container>
    );
  }

  if (error && !video) {
    return (
      <Container>
        <ErrorCard>
          <AlertTriangle size={32} />
          <p>{error}</p>
          <BackButton onClick={goBack}><ArrowLeft size={16} /> Back to Library</BackButton>
        </ErrorCard>
      </Container>
    );
  }

  if (!video) return null;

  const thumbnailSrc = video.signedThumbnailUrl || video.thumbnailUrl;

  return (
    <Container
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header>
        <BackButton onClick={goBack}>
          <ArrowLeft size={16} /> Back to Library
        </BackButton>
        <HeaderActions>
          <DeleteButton onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> Delete
          </DeleteButton>
          <SaveButton onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </SaveButton>
        </HeaderActions>
      </Header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Content>
        <PreviewColumn>
          <ThumbnailPreview>
            {thumbnailSrc ? (
              <img src={thumbnailSrc} alt={video.title} />
            ) : (
              <PlaceholderThumb><Film size={48} /></PlaceholderThumb>
            )}
          </ThumbnailPreview>

          <MetaGrid>
            <MetaItem>
              <MetaLabel>Source</MetaLabel>
              <MetaValue>
                {video.source === 'youtube' ? <Youtube size={14} /> : <Upload size={14} />}
                {video.source}
              </MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Views</MetaLabel>
              <MetaValue><Eye size={14} /> {video.viewCount ?? 0}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>File Size</MetaLabel>
              <MetaValue>{formatBytes(video.fileSize)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>Created</MetaLabel>
              <MetaValue><Calendar size={14} /> {new Date(video.createdAt).toLocaleDateString()}</MetaValue>
            </MetaItem>
          </MetaGrid>

          {video.signedPlaybackUrl && (
            <PlaybackLink href={video.signedPlaybackUrl} target="_blank" rel="noopener noreferrer">
              <Play size={16} /> Watch Video
            </PlaybackLink>
          )}
          {video.youtubeVideoId && (
            <PlaybackLink
              href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Youtube size={16} /> View on YouTube
            </PlaybackLink>
          )}
        </PreviewColumn>

        <FormColumn>
          <FieldGroup>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldGroup>

          <FieldGroup>
            <Label>Description</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </FieldGroup>

          <FieldRow>
            <FieldGroup>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as VideoDetail['status'])}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>Visibility</Label>
              <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="public">Public</option>
                <option value="members_only">Members Only</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </Select>
            </FieldGroup>
          </FieldRow>

          <FieldGroup>
            <Label>Content Type</Label>
            <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="">— Select —</option>
              <option value="tutorial">Tutorial</option>
              <option value="workout">Workout</option>
              <option value="promotional">Promotional</option>
              <option value="testimonial">Testimonial</option>
              <option value="behind_scenes">Behind the Scenes</option>
              <option value="other">Other</option>
            </Select>
          </FieldGroup>
        </FormColumn>
      </Content>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmOverlay onClick={() => setConfirmDelete(false)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <AlertTriangle size={28} color="#ef4444" />
            <p>Are you sure you want to delete &ldquo;{video.title}&rdquo;?</p>
            <ConfirmActions>
              <CancelBtn onClick={() => setConfirmDelete(false)}>Cancel</CancelBtn>
              <ConfirmDeleteBtn onClick={handleDelete}>Delete</ConfirmDeleteBtn>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </Container>
  );
};

// ─── Styled Components ──────────────────────────────
const Container = styled(motion.div)`
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  min-height: 44px;
  &:hover { border-color: rgba(0, 255, 255, 0.4); color: #00ffff; }
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(120, 81, 169, 0.2));
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  min-height: 44px;
  &:hover { background: linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(120, 81, 169, 0.3)); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  min-height: 44px;
  &:hover { background: rgba(239, 68, 68, 0.2); }
`;

const ErrorBanner = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PreviewColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ThumbnailPreview = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  aspect-ratio: 16 / 9;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const PlaceholderThumb = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.2);
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const MetaItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
`;

const MetaLabel = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const MetaValue = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PlaybackLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.15);
  color: #00ffff;
  text-decoration: none;
  font-size: 14px;
  min-height: 44px;
  &:hover { background: rgba(0, 255, 255, 0.12); }
`;

const FormColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const FieldRow = styled.div`
  display: flex;
  gap: 16px;
  @media (max-width: 768px) { flex-direction: column; }
`;

const Label = styled.label`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.4); }
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.4); }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.4); }
  option { background: #1a1a2e; }
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 60px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 15px;
`;

const ErrorCard = styled.div`
  text-align: center;
  padding: 60px 24px;
  color: rgba(255, 255, 255, 0.6);
  p { margin: 16px 0; font-size: 15px; }
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConfirmDialog = styled.div`
  background: linear-gradient(135deg, rgba(15, 15, 35, 0.98), rgba(25, 25, 55, 0.95));
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  max-width: 400px;
  p { color: rgba(255, 255, 255, 0.85); margin: 16px 0; font-size: 15px; }
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
`;

const CancelBtn = styled.button`
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  min-height: 44px;
  &:hover { border-color: rgba(255, 255, 255, 0.3); }
`;

const ConfirmDeleteBtn = styled.button`
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
  min-height: 44px;
  &:hover { background: rgba(239, 68, 68, 0.3); }
`;

export default VideoDetailView;
