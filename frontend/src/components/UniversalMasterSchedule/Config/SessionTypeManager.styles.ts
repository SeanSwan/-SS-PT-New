import styled from 'styled-components';
import { BodyText, HelperText, SmallText } from '../ui';

export const HeaderContent = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const SettingsTitle = styled(BodyText)`
  color: var(--text-primary, #E0ECF4);
  font-size: 1.1rem;
  font-weight: 600;
`;

export const MutedText = styled(SmallText)`
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

export const ErrorText = styled(HelperText)`
  color: var(--feedback-error, #ef4444);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;

  thead th {
    text-align: left;
    padding: 0.75rem 0.5rem;
    font-weight: 600;
    color: var(--text-secondary, rgba(224, 236, 244, 0.78));
    border-bottom: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
  }

  tbody td {
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
  }

  @media (max-width: 768px) {
    display: block;

    thead {
      display: none;
    }

    tbody,
    tr,
    td {
      display: block;
      width: 100%;
    }

    tr {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.12));
      border-radius: 12px;
      background: var(--surface-soft, rgba(224, 236, 244, 0.04));
    }

    td {
      border: none;
      padding: 0.35rem 0;
    }

    td::before {
      content: attr(data-label);
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, rgba(224, 236, 244, 0.56));
      margin-bottom: 0.2rem;
    }
  }
`;

export const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const StatusTag = styled.span`
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--surface-muted, rgba(148, 163, 184, 0.2));
  color: var(--text-muted, #94a3b8);
`;

export const ColorSwatch = styled.span<{ $color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-block;
  background: ${({ $color }) => $color || 'var(--accent-secondary, #8B5CF6)'};
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.28));
`;

export const InlineConfirm = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
`;

export const ConfirmButton = styled.button`
  min-height: 44px;
  border: none;
  background: var(--danger-soft, rgba(239, 68, 68, 0.2));
  color: var(--feedback-error, #ef4444);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
`;

export const CancelButton = styled.button`
  min-height: 44px;
  border: none;
  background: var(--surface-muted, rgba(148, 163, 184, 0.2));
  color: var(--text-muted, #94a3b8);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
`;

export const DangerIconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--danger-border, rgba(239, 68, 68, 0.4));
  background: var(--danger-soft, rgba(239, 68, 68, 0.15));
  color: var(--feedback-error, #ef4444);
  border-radius: 8px;
  padding: 0.4rem;
  cursor: pointer;

  &:hover {
    background: var(--danger-hover, rgba(239, 68, 68, 0.25));
  }
`;

export const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
`;

export const ColorPicker = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

export const ColorInput = styled.input`
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

export const ColorPreview = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $color }) => $color || 'var(--accent-secondary, #8B5CF6)'};
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.28));
`;
