import styled from 'styled-components';
import { Loader2 } from 'lucide-react';

export const ErrorMessageText = styled.span`
  flex: 1;
`;

export const LoadingMessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 1rem 0;
`;

export const LoadingMessageRow = styled.div<{ $alignEnd?: boolean }>`
  align-self: ${({ $alignEnd }) => ($alignEnd ? 'flex-end' : 'flex-start')};
  max-width: 60%;
`;

export const ReadReceiptWrap = styled.span<{ $read?: boolean }>`
  display: inline-flex;
  margin-left: 4px;
  vertical-align: middle;
  color: ${({ $read }) => ($read ? 'var(--accent-primary, #60C0F0)' : 'currentColor')};
`;

export const PendingSpinnerIcon = styled(Loader2)`
  display: inline;
  margin-right: 4px;
  vertical-align: middle;
`;
export const PendingStatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

export const RetrySendButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.72rem/1 'Sora', sans-serif;
  cursor: pointer;
`;

export const AttachmentList = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 8px;
`;

export const AttachmentLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  width: fit-content;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.76rem/1.2 'Sora', sans-serif;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const AttachmentCard = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  width: fit-content;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 82%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.76rem/1.2 'Sora', sans-serif;
`;

export const AttachmentDraftTray = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 0;
`;

export const AttachmentDraftChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;
  font: 700 0.72rem/1 'Sora', sans-serif;
`;

export const AttachmentRemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: currentColor;
  cursor: pointer;
`;

export const AttachmentPanel = styled.div`
  display: grid;
  gap: 8px;
  padding: 10px 12px 0;
`;

export const AttachmentPanelFields = styled.div<{ $hasEntity?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $hasEntity }) => ($hasEntity
    ? 'minmax(120px, 0.75fr) minmax(0, 1fr) minmax(0, 1fr) minmax(120px, 0.75fr) auto'
    : 'minmax(120px, 0.75fr) minmax(0, 1fr) minmax(0, 1fr) auto')};
  gap: 8px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const AttachmentInput = styled.input`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0 12px;
  font: 500 0.86rem/1.2 'Sora', sans-serif;
`;

export const AttachmentSelect = styled.select`
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0 12px;
  font: 700 0.82rem/1.2 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const AttachmentComposerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const AttachmentErrorText = styled.div`
  color: var(--error, #F87171);
  font: 700 0.75rem/1.2 'Sora', sans-serif;
`;
