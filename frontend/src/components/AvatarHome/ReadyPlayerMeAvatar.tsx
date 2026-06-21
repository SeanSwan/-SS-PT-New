/**
 * COMPONENT: ReadyPlayerMeAvatar
 * PURPOSE: Ready Player Me face-scan integration for Avatar Home.
 * DECISION: RPM remains the face-scan path; manual presets remain fallback.
 */

import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { User, Camera, Link, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import apiService from '../../services/api.service';
import { normalizeReadyPlayerMeUrl, toReadyPlayerMeViewerUrl } from './readyPlayerMeUrl';

interface Props {
  currentUrl: string | null;
  onAvatarUpdate: (url: string) => void;
}

const Panel = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
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
  color: var(--text-secondary, #B8C7D6);
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
  background: linear-gradient(135deg, var(--bg-base, #0A0A0F) 0%, var(--surface-primary, #002060) 50%, var(--bg-base, #0A0A0F) 100%);
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
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
  color: var(--text-secondary, #B8C7D6);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  padding: 24px;
`;

const EmptyCameraIcon = styled(Camera)`
  margin-bottom: 8px;
  opacity: 0.55;
  color: var(--accent-primary, #60C0F0);
`;

const EmptyAvatarHint = styled.div`
  color: var(--text-muted, #8EA3B8);
  font-size: 11px;
  margin-top: 4px;
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
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  outline: none;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: var(--text-muted, #8EA3B8); }
`;

const ActionBtn = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
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
  color: var(--button-text, #FFFFFF);
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
  background: ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 8%, transparent)' : 'color-mix(in srgb, var(--status-danger, #EF4444) 8%, transparent)'};
  border: 1px solid ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 25%, transparent)' : 'color-mix(in srgb, var(--status-danger, #EF4444) 25%, transparent)'};
  color: ${({ $type }) => $type === 'success' ? 'var(--status-success, #10B981)' : 'var(--status-danger, #EF4444)'};
`;

const LinkedBadge = styled.div`
  padding: 8px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--status-success, #10B981) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--status-success, #10B981) 15%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--status-success, #10B981);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  word-break: break-all;
`;

const RPM_SUBDOMAIN = 'swanstudios';
const READY_PLAYER_ME_SAVE_ERROR = 'Unable to link avatar. Please check the URL and try again.';
const READY_PLAYER_ME_NETWORK_ERROR = 'Avatar link service is temporarily unavailable. Please try again.';

const ReadyPlayerMeAvatar: React.FC<Props> = ({ currentUrl, onAvatarUpdate }) => {
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const savingRef = useRef(false);

  const handleSaveUrl = useCallback(async () => {
    if (!urlInput.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiService.patch<{
        success: boolean;
        data?: { readyPlayerMeUrl: string };
      }>('/api/avatar-home/ready-player-me', {
        avatarUrl: urlInput.trim(),
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      const safeAvatarUrl = normalizeReadyPlayerMeUrl(d.data?.readyPlayerMeUrl || urlInput.trim());
      if (d.success && safeAvatarUrl) {
        onAvatarUpdate(safeAvatarUrl);
        setUrlInput('');
        setStatus({ type: 'success', text: 'Avatar linked!' });
      } else {
        setStatus({ type: 'error', text: READY_PLAYER_ME_SAVE_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: READY_PLAYER_ME_NETWORK_ERROR });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput, onAvatarUpdate]);

  const viewerUrl = toReadyPlayerMeViewerUrl(currentUrl);

  return (
    <Panel>
      <Header>
        <User size={18} color="var(--accent-primary, #60C0F0)" />
        <Title>3D Avatar (Ready Player Me)</Title>
      </Header>

      <Description>
        Create a personalized 3D avatar from a selfie. Your avatar appears in your home world and profile.
      </Description>

      <AvatarPreview>
        {viewerUrl ? (
          <AvatarModel
            src={viewerUrl}
            title="Ready Player Me Avatar"
            allow="camera"
            loading="lazy"
          />
        ) : (
          <EmptyAvatar>
            <EmptyCameraIcon size={36} aria-hidden="true" />
            <div>No avatar linked yet</div>
            <EmptyAvatarHint>
              Create one at readyplayer.me
            </EmptyAvatarHint>
          </EmptyAvatar>
        )}
      </AvatarPreview>

      {status && (
        <StatusMsg $type={status.type} role="status" aria-live="polite">
          {status.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {status.text}
        </StatusMsg>
      )}

      {viewerUrl && currentUrl && (
        <LinkedBadge>
          <Check size={12} />
          Linked: {currentUrl.slice(0, 60)}...
        </LinkedBadge>
      )}

      <CreateBtn
        href={`https://${RPM_SUBDOMAIN}.readyplayer.me/avatar`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={16} />
        {currentUrl ? 'Update Avatar at Ready Player Me' : 'Create Avatar at Ready Player Me'}
      </CreateBtn>

      <InputRow>
        <UrlInput
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          aria-label="Ready Player Me avatar URL"
          placeholder="Paste your .glb avatar URL here..."
          onKeyDown={e => e.key === 'Enter' && handleSaveUrl()}
        />
        <ActionBtn type="button" onClick={handleSaveUrl} disabled={!urlInput.trim() || saving} aria-busy={saving}>
          <Link size={14} />
          {saving ? 'Saving...' : 'Link'}
        </ActionBtn>
      </InputRow>
    </Panel>
  );
};

export default ReadyPlayerMeAvatar;
