import styled, { css } from 'styled-components';

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const UploadShell = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const UploadPanelCard = styled.div`
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(145deg, var(--bg-elevated, #141419), color-mix(in srgb, var(--surface-primary, #002060) 28%, var(--bg-elevated, #141419)));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const UploadTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  line-height: 1.25;
  letter-spacing: 0;
`;

export const UploadCopy = styled.p`
  margin: 0 0 18px;
  color: var(--text-secondary, #B7C4CF);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.55;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const FieldBlock = styled.div<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => $wide ? '1 / -1' : 'auto'};
`;

export const UploadLabel = styled.label`
  display: block;
  color: var(--text-secondary, #B7C4CF);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  margin-bottom: 6px;
  text-transform: uppercase;
`;

const fieldBase = css`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  ${focusRing}

  &::placeholder {
    color: color-mix(in srgb, var(--text-secondary, #B7C4CF) 72%, transparent);
  }
`;

export const UploadInput = styled.input`
  ${fieldBase}
`;

export const UploadTextArea = styled.textarea`
  ${fieldBase}
  min-height: 96px;
  resize: vertical;
`;

export const UploadSelect = styled.select`
  ${fieldBase}
`;

export const FileDropLabel = styled.button`
  appearance: none;
  display: flex;
  width: 100%;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  text-align: center;
  padding: 20px;
  ${focusRing}
`;

export const HiddenFileInput = styled.input`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  clip-path: inset(50%);
`;

export const PreviewFrame = styled.div`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), var(--bg-base, #0A0A0F) 68%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

export const PreviewPlaceholder = styled.div`
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--text-secondary, #B7C4CF);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: center;
  padding: 20px;
`;

export const UploadButton = styled.button`
  min-height: 48px;
  width: 100%;
  border: 0;
  border-radius: 10px;
  margin-top: 16px;
  padding: 12px 18px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: var(--text-on-accent, #FFFFFF);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  ${focusRing}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const UploadStatus = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${({ $type }) => $type === 'success' ? 'color-mix(in srgb, var(--success, #10B981) 12%, transparent)' : 'color-mix(in srgb, var(--error, #EF4444) 12%, transparent)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'color-mix(in srgb, var(--success, #10B981) 30%, transparent)' : 'color-mix(in srgb, var(--error, #EF4444) 30%, transparent)'};
  color: ${({ $type }) => $type === 'success' ? 'var(--success, #10B981)' : 'var(--error, #EF4444)'};
`;