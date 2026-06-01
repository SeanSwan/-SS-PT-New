import React from 'react';
import styled from 'styled-components';
import { ContainedButton, PlainButton } from '../styles/PostCardStyles';

interface PostEditComposerProps {
  content: string;
  disabled: boolean;
  canSave: boolean;
  onChange: (content: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

const EditShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 112px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: var(--bg-elevated, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;

  &:focus {
    box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.22);
  }
`;

const EditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

const PostEditComposer: React.FC<PostEditComposerProps> = ({
  content,
  disabled,
  canSave,
  onChange,
  onCancel,
  onSave,
}) => (
  <EditShell>
    <EditTextarea
      value={content}
      onChange={(event) => onChange(event.target.value)}
      autoFocus
      aria-label="Edit post content"
      disabled={disabled}
    />
    <EditActions>
      <PlainButton type="button" onClick={onCancel} disabled={disabled}>
        Cancel
      </PlainButton>
      <ContainedButton type="button" onClick={onSave} disabled={disabled || !canSave}>
        {disabled ? 'Saving...' : 'Save'}
      </ContainedButton>
    </EditActions>
  </EditShell>
);

export default PostEditComposer;
