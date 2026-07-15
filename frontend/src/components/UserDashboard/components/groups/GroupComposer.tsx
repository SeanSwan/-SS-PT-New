/**
 * ============================================================================
 * FILE: GroupComposer.tsx
 * PURPOSE: Lightweight post composer for a group's own feed (text + one
 *          image/video), riding the group-scoped useSocialFeed instance.
 * HOW IT FITS: Rendered by GroupDetail for active members only.
 * ============================================================================
 */
import React, { useRef, useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import styled from 'styled-components';
import type { SocialFeedApi } from '../../../../hooks/social/useSocialFeed';
import { PrimaryGroupButton, QuietGroupButton } from './GroupsShared.styles';

const ComposerShell = styled.div`
  display: grid;
  gap: 0.6rem;
  padding: clamp(0.85rem, 1.8vw, 1.05rem);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--surface-primary, #003080) 55%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 94%, transparent)
    );
`;

const ComposerInput = styled.textarea`
  min-height: 72px;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.94rem;
  font-family: inherit;
  resize: vertical;

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ComposerActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
`;

const MediaChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 45%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  max-width: 100%;
  overflow: hidden;

  button {
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    padding: 0.2rem;
  }
`;

const HiddenFile = styled.input`
  display: none;
`;

interface GroupComposerProps {
  feed: SocialFeedApi;
  groupName: string;
}

const GroupComposer: React.FC<GroupComposerProps> = ({ feed, groupName }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = content.trim().length > 0 && !feed.isCreatingPost;

  const handleSubmit = async () => {
    if (!canPost) return;
    const created = await feed.createPost({
      content: content.trim(),
      type: 'general',
      visibility: 'public',
      media: media ?? undefined,
    });
    if (created) {
      setContent('');
      setMedia(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <ComposerShell>
      <ComposerInput
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Share something with ${groupName}…`}
        aria-label={`Post to ${groupName}`}
        maxLength={5000}
      />
      <ComposerActions>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <QuietGroupButton type="button" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} aria-hidden="true" />
            {media ? 'Change media' : 'Add photo/video'}
          </QuietGroupButton>
          {media && (
            <MediaChip>
              {media.name.length > 26 ? `${media.name.slice(0, 24)}…` : media.name}
              <button
                type="button"
                aria-label="Remove attached media"
                onClick={() => {
                  setMedia(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </MediaChip>
          )}
        </div>
        <PrimaryGroupButton type="button" onClick={handleSubmit} disabled={!canPost}>
          <Send size={15} aria-hidden="true" />
          {feed.isCreatingPost ? 'Posting…' : 'Post'}
        </PrimaryGroupButton>
      </ComposerActions>
      <HiddenFile
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
      />
    </ComposerShell>
  );
};

export default GroupComposer;
