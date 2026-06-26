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
