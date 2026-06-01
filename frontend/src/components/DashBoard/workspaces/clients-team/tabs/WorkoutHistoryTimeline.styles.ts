import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.div`
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const TitleIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

export const WorkoutCard = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  background: var(--bg-surface, #1A1A24);
  margin-bottom: 12px;
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;
`;

export const WorkoutHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  min-height: 56px;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

export const DateBadge = styled.div`
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const WorkoutInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const WorkoutTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const WorkoutMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.85));
  display: flex;
  gap: 12px;
  margin-top: 2px;
  flex-wrap: wrap;
`;

export const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const ExerciseList = styled.div`
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

export const ExerciseGroup = styled.div`
  margin-top: 10px;
`;

export const ExerciseName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  margin-bottom: 4px;
`;

export const SetRow = styled.div`
  display: grid;
  grid-template-columns: 40px 70px 70px 60px auto;
  gap: 6px;
  align-items: center;
  padding: 3px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const SetHeaderRow = styled(SetRow)`
  margin-bottom: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-size: 10px;
  font-weight: 700;
`;

export const SetNote = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-size: 11px;
`;

export const SetLabel = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-size: 11px;
`;

export const EditInput = styled.input`
  width: 100%;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  text-align: center;

  &:focus {
    outline: none;
    box-shadow: 0 0 6px var(--accent-primary-glow, rgba(96, 192, 240, 0.3));
  }
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px 12px;
  justify-content: flex-end;
`;

export const SmallBtn = styled.button<{ $variant?: 'save' | 'cancel' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  ${({ $variant }) => {
    if ($variant === 'save') return 'background: var(--accent-primary-soft, rgba(96, 192, 240, 0.15)); color: var(--accent-primary, #60C0F0);';
    if ($variant === 'danger') return 'background: var(--danger-soft, rgba(201, 42, 84, 0.15)); color: var(--danger, #C92A54);';
    return 'background: var(--button-muted-bg, rgba(224, 236, 244, 0.08)); color: var(--text-muted, rgba(224, 236, 244, 0.6));';
  }}

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const AddSetButton = styled(SmallBtn)`
  margin-top: 4px;
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px;
  text-align: center;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
`;

export const EmptyIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
`;

export const EmptyTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

export const EmptyText = styled.div`
  font-size: 13px;
`;

export const StatusBadge = styled.span<{ $status: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  ${({ $status }) => {
    if ($status === 'completed') return 'background: var(--success-soft, rgba(16, 185, 129, 0.15)); color: var(--success, #10B981);';
    if ($status === 'planned') return 'background: var(--info-soft, rgba(59, 130, 246, 0.15)); color: var(--info, #3B82F6);';
    if ($status === 'skipped') return 'background: var(--neutral-soft, rgba(107, 114, 128, 0.15)); color: var(--neutral, #6B7280);';
    return 'background: var(--button-muted-bg, rgba(224, 236, 244, 0.08)); color: var(--text-muted, rgba(224, 236, 244, 0.85));';
  }}
`;
