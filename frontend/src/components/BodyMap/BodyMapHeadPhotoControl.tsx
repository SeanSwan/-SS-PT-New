/**
 * ============================================================================
 * FILE: BodyMapHeadPhotoControl.tsx
 * PURPOSE: Client self-service upload/remove for the DEDICATED body-map head
 *          photo (Pain-Chart Slice 2, A4). The main profile photo may be a
 *          logo/pet/brand image — this lets the client put their actual face
 *          on the figure without touching their profile photo.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-04
 * ============================================================================
 * Endpoints: POST /api/profile/upload-body-map-photo (multipart, field
 * `bodyMapPhoto`), DELETE /api/profile/body-map-photo. Parent owns the
 * effective URL via onPhotoChange (auth user refresh happens on next load).
 */
import React, { useRef, useState } from 'react';
import styled from 'styled-components';

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: -8px 0 16px 0;
`;

const HintText = styled.span`
  color: var(--text-muted, rgba(255, 255, 255, 0.5));
  font-size: 12px;
`;

const SmallButton = styled.button`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.25));
  background: transparent;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--glow-accent, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const StatusNote = styled.span<{ $error?: boolean }>`
  color: ${({ $error }) => ($error ? 'var(--danger, #FF5555)' : 'var(--text-muted, rgba(255,255,255,0.5))')};
  font-size: 12px;
`;

interface BodyMapHeadPhotoControlProps {
  authAxios: any;
  hasDedicatedPhoto: boolean;
  onPhotoChange: (url: string | null) => void;
}

const BodyMapHeadPhotoControl: React.FC<BodyMapHeadPhotoControlProps> = ({
  authAxios,
  hasDedicatedPhoto,
  onPhotoChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || !authAxios) return;
    setBusy(true);
    setNote(null);
    setIsError(false);
    try {
      const form = new FormData();
      form.append('bodyMapPhoto', file);
      const response = await authAxios.post('/api/profile/upload-body-map-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response?.data?.data?.bodyMapHeadPhoto ?? null;
      onPhotoChange(url);
      setNote('Body map photo updated.');
    } catch (err: any) {
      setIsError(true);
      setNote(err?.response?.data?.message || 'Upload failed — try a JPG/PNG/WEBP image.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!authAxios) return;
    setBusy(true);
    setNote(null);
    setIsError(false);
    try {
      await authAxios.delete('/api/profile/body-map-photo');
      onPhotoChange(null);
      setNote('Removed — your profile photo will show instead.');
    } catch (err: any) {
      setIsError(true);
      setNote(err?.response?.data?.message || 'Could not remove the photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ControlRow>
      <HintText>Figure photo:</HintText>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <SmallButton type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {hasDedicatedPhoto ? 'Change photo' : 'Use a different photo than my profile'}
      </SmallButton>
      {hasDedicatedPhoto && (
        <SmallButton type="button" disabled={busy} onClick={handleRemove}>
          Remove
        </SmallButton>
      )}
      {note && <StatusNote $error={isError} role="status">{note}</StatusNote>}
    </ControlRow>
  );
};

export default BodyMapHeadPhotoControl;
