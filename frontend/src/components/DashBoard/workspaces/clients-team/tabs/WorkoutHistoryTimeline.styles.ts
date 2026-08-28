import styled, { keyframes } from 'styled-components';
import { swanClientActionButton, swanDataCardShell, swanPill } from '../clientCardSystem';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.div`
  padding: 16px;
  min-width: 0;
  max-width: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 280px);

  @media (max-width: 560px) {
    padding: 10px 0 0;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
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
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const TitleIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

export const WorkoutCard = styled.div`
  --swan-card-padding: 0;
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  margin-bottom: 12px;
  overflow: hidden;
  animation: ${fadeIn} 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const WorkoutHeader = styled.button`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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

  & > svg {
    flex: 0 0 auto;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
  }
`;

export const DateBadge = styled.div`
  ${swanPill}

  padding: 6px 10px;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const WorkoutInfo = styled.div`
  flex: 1 1 180px;
  min-width: 0;
`;

export const WorkoutTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
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
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const ExerciseList = styled.div`
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

export const CircuitSection = styled.section`
  margin-top: 14px;
  padding: 10px 12px 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 10px;
  background: var(--bg-elevated, rgba(20, 20, 25, 0.62));
`;

export const CircuitTitle = styled.h4`
  margin: 0 0 8px;
  color: var(--accent-primary, #60C0F0);
  font: 700 12px 'Sora', sans-serif;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const StructureBadge = styled.span`
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--text-primary, #E0ECF4);
  background: var(--accent-secondary-soft, rgba(139, 92, 246, 0.18));
  font: 600 10px 'Sora', sans-serif;
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
  overflow-wrap: anywhere;
`;

export const SetRow = styled.div`
  display: grid;
  grid-template-columns: minmax(34px, 0.55fr) repeat(3, minmax(58px, 0.85fr)) minmax(64px, 1.1fr);
  gap: 6px;
  align-items: center;
  padding: 3px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));

  & > * {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(30px, 0.55fr) repeat(3, minmax(52px, 0.9fr)) minmax(44px, 0.9fr);
    gap: 4px;
    font-size: 11px;
  }
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
  overflow-wrap: anywhere;
`;

export const SetLabel = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-size: 11px;
`;

export const EditInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px 6px;
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
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px 12px;
  justify-content: flex-end;

  @media (max-width: 560px) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
    padding: 8px 12px 12px;
  }
`;

export const SmallBtn = styled.button<{ $variant?: 'save' | 'cancel' | 'danger' }>`
  ${({ $variant }) => {
    if ($variant === 'save') {
      return `
        --swan-action-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
        --swan-action-bg: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-base, #0A0A0F));
        --swan-action-fg: var(--accent-primary, #60C0F0);
      `;
    }
    if ($variant === 'danger') {
      return `
        --swan-action-border: color-mix(in srgb, var(--danger, #C92A54) 34%, transparent);
        --swan-action-bg: color-mix(in srgb, var(--danger, #C92A54) 15%, var(--bg-base, #0A0A0F));
        --swan-action-fg: var(--danger, #C92A54);
      `;
    }
    return `
      --swan-action-bg: var(--button-muted-bg, rgba(224, 236, 244, 0.08));
      --swan-action-fg: var(--text-muted, rgba(224, 236, 244, 0.72));
    `;
  }}
  ${swanClientActionButton}

  gap: 4px;
  padding: 8px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  overflow-wrap: anywhere;

  &:hover {
    opacity: 0.8;
  }
`;

export const AddSetButton = styled(SmallBtn)`
  margin-top: 4px;
`;

export const EmptyState = styled.div`
  --swan-card-radius: 14px;
  ${swanDataCardShell}

  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px;
  text-align: center;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  font-family: 'Sora', sans-serif;
  overflow-wrap: anywhere;
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
  overflow-wrap: anywhere;
`;

export const StatusBadge = styled.span<{ $status: string }>`
  ${swanPill}

  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  margin-left: auto;
  ${({ $status }) => {
    if ($status === 'completed') return 'background: var(--success-soft, rgba(16, 185, 129, 0.15)); color: var(--success, #10B981);';
    if ($status === 'planned') return 'background: var(--info-soft, rgba(59, 130, 246, 0.15)); color: var(--info, #3B82F6);';
    if ($status === 'skipped') return 'background: var(--neutral-soft, rgba(107, 114, 128, 0.15)); color: var(--neutral, #6B7280);';
    return 'background: var(--button-muted-bg, rgba(224, 236, 244, 0.08)); color: var(--text-muted, rgba(224, 236, 244, 0.85));';
  }}
`;
