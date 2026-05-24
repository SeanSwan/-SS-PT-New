/**
 * ┌─── COMPONENT: ReadyPlayerMeAvatar ──────────────────────────┐
 * │ PURPOSE: Ready Player Me face scan integration. Generates   │
 * │ a personalized 3D avatar GLB from selfie/webcam.            │
 * │ PHASE 3: Advanced avatar via Ready Player Me.               │
 * │ CEO RULING: RPM for face scan, fallback to manual presets.  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  User, Camera, Link, Check, ExternalLink, RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import apiService from '../../services/api.service';

interface Props {
  currentUrl: string | null;
  onAvatarUpdate: (url: string) => void;
}

const Panel = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.12);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0 0 16px;
  line-height: 1.5;
`;

const AvatarPreview = styled.div`
  width: 100%;
  aspect-ratio: 3/4;
  max-width: 280px;
  margin: 0 auto 16px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0A0A0F 0%, #002060 50%, #0A0A0F 100%);
  border: 2px solid rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AvatarModel = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const EmptyAvatar = styled.div`
  text-align: center;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  padding: 24px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
`;

const UrlInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  outline: none;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: rgba(224, 236, 244, 0.4); }
`;

const ActionBtn = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const CreateBtn = styled.a`
  display: flex;
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  &:hover { opacity: 0.9; }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
  color: ${({ $type }) => $type === 'success' ? '#10B981' : '#EF4444'};
`;

const LinkedBadge = styled.div`
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #10B981;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  word-break: break-all;
`;

const RPM_SUBDOMAIN = 'swanstudios';

const ReadyPlayerMeAvatar: React.FC<Props> = ({ currentUrl, onAvatarUpdate }) => {
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiService.patch<{
        success: boolean;
        data?: { readyPlayerMeUrl: string };
        message?: string;
      }>('/api/avatar-home/ready-player-me', {
        avatarUrl: urlInput.trim(),
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success) {
        onAvatarUpdate(d.data?.readyPlayerMeUrl || urlInput.trim());
        setUrlInput('');
        setStatus({ type: 'success', text: 'Avatar linked!' });
      } else {
        setStatus({ type: 'error', text: d.message || 'Failed to save' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error' });
    }
    setSaving(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput, onAvatarUpdate]);

  // RPM viewer URL
  const viewerUrl = currentUrl
    ? `https://models.readyplayer.me/${currentUrl.split('/').pop()}?morphTargets=ARKit&textureAtlas=1024`
    : null;

  return (
    <Panel>
      <Header>
        <User size={18} color="var(--accent-primary, #60C0F0)" />
        <Title>3D Avatar (Ready Player Me)</Title>
      </Header>

      <Description>
        Create a personalized 3D avatar from a selfie. Your avatar appears in your home world and profile.
      </Description>

      {/* Preview */}
      <AvatarPreview>
        {currentUrl ? (
          <AvatarModel
            src={viewerUrl || ''}
            title="Ready Player Me Avatar"
            allow="camera"
            loading="lazy"
          />
        ) : (
          <EmptyAvatar>
            <Camera size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No avatar linked yet</div>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
              Create one at readyplayer.me
            </div>
          </EmptyAvatar>
        )}
      </AvatarPreview>

      {/* Status */}
      {status && (
        <StatusMsg $type={status.type}>
          {status.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {status.text}
        </StatusMsg>
      )}

      {/* Current linked avatar */}
      {currentUrl && (
        <LinkedBadge>
          <Check size={12} />
          Linked: {currentUrl.slice(0, 60)}...
        </LinkedBadge>
      )}

      {/* Create at RPM */}
      <CreateBtn
        href={`https://${RPM_SUBDOMAIN}.readyplayer.me/avatar`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={16} />
        {currentUrl ? 'Update Avatar at Ready Player Me' : 'Create Avatar at Ready Player Me'}
      </CreateBtn>

      {/* Paste URL */}
      <InputRow>
        <UrlInput
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Paste your .glb avatar URL here..."
          onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
        />
        <ActionBtn onClick={handleSaveUrl} disabled={!urlInput.trim() || saving}>
          <Link size={14} />
          {saving ? 'Saving...' : 'Link'}
        </ActionBtn>
      </InputRow>
    </Panel>
  );
};

export default ReadyPlayerMeAvatar;
