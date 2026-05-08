/**
 * ┌─── SUB-COMPONENT: FileAttachmentButton ───────────────────┐
 * │ PARENT: CoachInputBar                                       │
 * │ PURPOSE: Paperclip button + hidden file input for attachments │
 * │ Props: { onFilesSelected, inputRef, disabled }              │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Paperclip click] → opens native file picker → onFilesSelected │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import { Paperclip } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const AttachBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface FileAttachmentButtonProps {
  onFilesSelected: (files: FileList) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

const FileAttachmentButton: React.FC<FileAttachmentButtonProps> = memo(({
  onFilesSelected,
  inputRef,
  disabled = false,
}) => {
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, [inputRef]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  }, [onFilesSelected]);

  return (
    <>
      <AttachBtn
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Attach file"
        title="Attach images or documents"
      >
        <Paperclip size={16} />
      </AttachBtn>
      <HiddenInput
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.csv,.json"
        onChange={handleChange}
      />
    </>
  );
});

FileAttachmentButton.displayName = 'FileAttachmentButton';

export default FileAttachmentButton;
