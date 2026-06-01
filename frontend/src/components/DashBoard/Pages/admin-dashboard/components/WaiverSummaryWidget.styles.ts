import styled from 'styled-components';
import { CommandCard } from '../AdminDashboardCards';

const statusStyles = {
  pending_match: {
    background: 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)',
    color: 'var(--warning, #E5C76B)',
    border: 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)',
  },
  linked: {
    background: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)',
    color: 'var(--accent-primary, #60C0F0)',
    border: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)',
  },
  default: {
    background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)',
    color: 'var(--accent-secondary, #8B5CF6)',
    border: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)',
  },
};

const getStatusStyle = (status: string) =>
  statusStyles[status as keyof typeof statusStyles] ?? statusStyles.default;

export const Widget = styled(CommandCard)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 280px;
`;

export const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const WidgetTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const PendingBadge = styled.span<{ $urgent: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 700;
  background: ${({ $urgent }) =>
    $urgent
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  color: ${({ $urgent }) => ($urgent ? 'var(--warning, #E5C76B)' : 'var(--accent-primary, #60C0F0)')};
  border: 1px solid ${({ $urgent }) =>
    $urgent
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent)'};
  white-space: nowrap;

  & > svg {
    width: 11px;
    height: 11px;
    stroke-width: 2.5px;
  }
`;

export const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--swan-lavender, #4070C0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

export const RecordList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
`;

export const RecordRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 3%, transparent);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RecordName = styled.span`
  font-size: 0.84rem;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
`;

export const RecordRight = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

export const RecordDate = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: var(--text-muted, rgba(255, 255, 255, 0.38));
  white-space: nowrap;
`;

export const StatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.64rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 9px;
  white-space: nowrap;
  background: ${({ $status }) => getStatusStyle($status).background};
  color: ${({ $status }) => getStatusStyle($status).color};
  border: 1px solid ${({ $status }) => getStatusStyle($status).border};

  & > svg {
    width: 10px;
    height: 10px;
    stroke-width: 2.5px;
  }
`;

export const ViewAllBtn = styled.button`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 10px;
  background: var(--midnight-sapphire, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    background: color-mix(in srgb, var(--midnight-sapphire, #002060) 80%, var(--accent-secondary, #8B5CF6) 20%);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const CenteredMsg = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, rgba(255, 255, 255, 0.28));
  font-size: 0.84rem;
`;

export const ErrorMsg = styled(CenteredMsg)`
  color: var(--warning, #E5C76B);
  text-align: center;
  line-height: 1.4;
  padding: 0.5rem;
`;
