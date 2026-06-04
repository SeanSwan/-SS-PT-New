import styled from 'styled-components';

const textPrimary = 'var(--text-primary, #E0ECF4)';
const textMuted = 'var(--text-secondary, rgba(224, 236, 244, 0.68))';
const accent = 'var(--accent-primary, #60C0F0)';
const success = 'var(--feedback-success, #22C55E)';
const warning = 'var(--feedback-warning, #F59E0B)';
const danger = 'var(--feedback-danger, #EF4444)';
const glassBorder = 'var(--border-subtle, rgba(198, 168, 75, 0.25))';

export const TrainerZone = styled.div<{ $activeDrop?: boolean }>`
  border: 1px solid ${({ $activeDrop }) => ($activeDrop ? accent : glassBorder)};
  background: ${({ $activeDrop }) => ($activeDrop ? 'rgba(80, 160, 240, 0.18)' : 'rgba(0, 32, 96, 0.33)')};
  border-radius: 12px;
  padding: 0.75rem;
  min-height: 180px;
`;

export const TrainerHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;

  .title {
    color: ${textPrimary};
    font-size: 0.86rem;
    font-weight: 600;
  }

  .sub {
    color: ${textMuted};
    font-size: 0.72rem;
  }
`;

export const Capacity = styled.span<{ $full?: boolean }>`
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  border: 1px solid;
  color: ${({ $full }) => ($full ? warning : success)};
  border-color: ${({ $full }) => ($full ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)')};
  background: ${({ $full }) => ($full ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)')};
`;

export const AssignmentItem = styled.div`
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(0, 32, 96, 0.45);
  border-radius: 10px;
  padding: 0.5rem;
  margin-bottom: 0.45rem;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.45rem;
  }

  .name {
    color: ${textPrimary};
    font-size: 0.78rem;
    font-weight: 600;
  }

  .meta {
    color: ${textMuted};
    font-size: 0.7rem;
    margin-top: 0.2rem;
  }
`;

export const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.12);
  color: ${danger};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const Banner = styled.div<{ $tone: 'error' | 'warn' }>`
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.8rem;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;

  ${({ $tone }) =>
    $tone === 'error'
      ? `background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.35); color: ${danger};`
      : `background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: ${warning};`}
`;

export const Empty = styled.div`
  color: ${textMuted};
  font-size: 0.82rem;
  text-align: center;
  padding: 0.9rem 0.3rem;
`;
