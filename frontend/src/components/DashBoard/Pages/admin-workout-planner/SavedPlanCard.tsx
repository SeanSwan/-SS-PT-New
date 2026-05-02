/**
 * SavedPlanCard.tsx
 *
 * Plan Library slice (REV 2 receipt §5.2). Extracted from WorkoutPlannerPage.tsx
 * to keep the parent under control vs rule-4 line cap and to localize the
 * stopPropagation matrix (card-body click loads, action-button clicks do NOT
 * trigger load — Codex correction #4).
 *
 * Card-body click + Enter/Space → Load.
 * Each action button calls event.stopPropagation() so click bubbling does NOT
 * trigger Load when the user wanted Activate/Rename/Duplicate/Archive.
 *
 * Archive button is DISABLED for the currently-active plan when no other plan
 * is available — frontend half of REV 2 §5.4 archive guard. Backend is
 * permissive; the strict no-zero-active rule is enforced at the UI layer to
 * keep WorkoutLogger / Coach reading from a real plan.
 */

import React, { useCallback, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Play, Copy, Edit3, Archive, Check, X } from 'lucide-react';

// ============================================================================
// SECTION: Types
// ============================================================================

export type SavedPlanStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface SavedPlanSummary {
  id: string;
  name: string;
  status: SavedPlanStatus | string;
  createdAt: string;
  goal: string;
}

export interface SavedPlanCardProps {
  plan: SavedPlanSummary;
  loaded: boolean;
  /** True if this plan is the only active plan and archiving it would leave
   *  the client with zero active plans. The card disables Archive in that
   *  case per REV 2 §5.4. */
  archiveBlocked: boolean;
  onLoad: (planId: string, planName: string) => void;
  onActivate: (planId: string, planName: string) => void;
  onRename: (planId: string, newName: string) => void;
  onDuplicate: (planId: string, planName: string) => void;
  onArchive: (planId: string, planName: string) => void;
}

// ============================================================================
// SECTION: Styled components — token+fallback per rule 6
// ============================================================================

const cardEntry = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const motionGuarded = css`
  @media (prefers-reduced-motion: no-preference) {
    animation: ${cardEntry} 200ms ease-out;
  }
`;

const Card = styled.div<{ $loaded: boolean; $isCurrent: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-surface, rgba(0, 32, 96, 0.45));
  border: 1px solid ${({ $loaded, $isCurrent }) =>
    $isCurrent
      ? 'var(--accent-gold, #C6A84B)'
      : $loaded
        ? 'var(--accent-primary, #60C0F0)'
        : 'var(--border-soft, rgba(96, 192, 240, 0.18))'};
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  outline: none;
  ${motionGuarded}

  ${({ $isCurrent }) => $isCurrent && css`
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent);
  `}

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const CardTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${({ $status }) => {
    if ($status === 'active') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent)';
    if ($status === 'paused') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)';
    if ($status === 'draft') return 'color-mix(in srgb, var(--text-secondary, rgba(224,236,244,0.5)) 12%, transparent)';
    return 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.3)) 10%, transparent)';
  }};
  color: ${({ $status }) => {
    if ($status === 'active') return 'var(--accent-gold, #C6A84B)';
    if ($status === 'paused') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--text-secondary, rgba(224,236,244,0.7))';
  }};
`;

const CardMeta = styled.div`
  display: flex;
  gap: 12px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.55));
`;

const CardActionRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

const CardActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* rule 2: 44x44 minimum touch target */
  min-height: 44px;
  min-width: 44px;
  padding: 6px 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-gold, #C6A84B)'
      : $variant === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 35%, transparent)'
        : 'var(--border-soft, rgba(96, 192, 240, 0.2))'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent)'
      : $variant === 'danger'
        ? 'color-mix(in srgb, var(--danger, #C92A54) 8%, transparent)'
        : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? 'var(--accent-gold, #C6A84B)'
      : $variant === 'danger'
        ? 'var(--danger, #C92A54)'
        : 'var(--text-primary, #E0ECF4)'};
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent)'
        : $variant === 'danger'
          ? 'color-mix(in srgb, var(--danger, #C92A54) 16%, transparent)'
          : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const RenameInput = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 8px 12px;
  background: var(--bg-base, #030712);
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 1px;
  }
`;

// ============================================================================
// SECTION: Component
// ============================================================================

const SavedPlanCard: React.FC<SavedPlanCardProps> = ({
  plan,
  loaded,
  archiveBlocked,
  onLoad,
  onActivate,
  onRename,
  onDuplicate,
  onArchive,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(plan.name);
  const isCurrent = plan.status === 'active';

  // Card-body click handler — Loads the plan into the builder.
  const handleCardClick = useCallback(() => {
    if (renaming) return; // rename input owns the card; ignore body clicks
    onLoad(plan.id, plan.name);
  }, [renaming, onLoad, plan.id, plan.name]);

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (renaming) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLoad(plan.id, plan.name);
    }
  }, [renaming, onLoad, plan.id, plan.name]);

  // Stop event propagation so action buttons never trigger card-body Load.
  const handleActivate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onActivate(plan.id, plan.name);
  }, [onActivate, plan.id, plan.name]);

  const handleRenameStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(plan.name);
    setRenaming(true);
  }, [plan.name]);

  const handleRenameSave = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== plan.name) {
      onRename(plan.id, trimmed);
    }
    setRenaming(false);
  }, [renameValue, plan.name, plan.id, onRename]);

  const handleRenameCancel = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setRenameValue(plan.name);
    setRenaming(false);
  }, [plan.name]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRenameSave(e);
    else if (e.key === 'Escape') handleRenameCancel(e);
    else e.stopPropagation(); // typing should not bubble Enter/Space to card
  }, [handleRenameSave, handleRenameCancel]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(plan.id, plan.name);
  }, [onDuplicate, plan.id, plan.name]);

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (archiveBlocked) return;
    onArchive(plan.id, plan.name);
  }, [archiveBlocked, onArchive, plan.id, plan.name]);

  const stopProp = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Card
      $loaded={loaded}
      $isCurrent={isCurrent}
      role="button"
      tabIndex={0}
      aria-label={`Load plan: ${plan.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      data-testid={`saved-plan-card-${plan.id}`}
    >
      <CardHeader>
        {renaming ? (
          <RenameInput
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={stopProp}
            onKeyDown={handleRenameKeyDown}
            autoFocus
            aria-label="Rename plan"
            data-testid={`rename-input-${plan.id}`}
          />
        ) : (
          <CardTitle title={plan.name}>{plan.name}</CardTitle>
        )}
        <StatusBadge
          $status={plan.status}
          data-testid={isCurrent ? 'current-badge' : `status-badge-${plan.status}`}
        >
          {isCurrent ? 'Current' : plan.status}
        </StatusBadge>
      </CardHeader>

      {plan.goal && (
        <CardMeta>
          <span>Goal: {plan.goal.replace(/_/g, ' ')}</span>
        </CardMeta>
      )}

      <CardActionRow>
        {renaming ? (
          <>
            <CardActionButton
              type="button"
              $variant="primary"
              onClick={handleRenameSave}
              aria-label="Save name"
              data-testid={`rename-save-${plan.id}`}
            >
              <Check size={14} /> Save
            </CardActionButton>
            <CardActionButton
              type="button"
              onClick={handleRenameCancel}
              aria-label="Cancel rename"
              data-testid={`rename-cancel-${plan.id}`}
            >
              <X size={14} /> Cancel
            </CardActionButton>
          </>
        ) : (
          <>
            {!isCurrent && (
              <CardActionButton
                type="button"
                $variant="primary"
                onClick={handleActivate}
                aria-label={`Make ${plan.name} the current plan`}
                data-testid={`action-activate-${plan.id}`}
              >
                <Play size={14} /> Make Current
              </CardActionButton>
            )}
            <CardActionButton
              type="button"
              onClick={handleRenameStart}
              aria-label={`Rename ${plan.name}`}
              data-testid={`action-rename-${plan.id}`}
            >
              <Edit3 size={14} /> Rename
            </CardActionButton>
            <CardActionButton
              type="button"
              onClick={handleDuplicate}
              aria-label={`Duplicate ${plan.name}`}
              data-testid={`action-duplicate-${plan.id}`}
            >
              <Copy size={14} /> Duplicate
            </CardActionButton>
            <CardActionButton
              type="button"
              $variant="danger"
              onClick={handleArchive}
              disabled={archiveBlocked}
              aria-label={archiveBlocked
                ? `Cannot archive: ${plan.name} is the only active plan`
                : `Archive ${plan.name}`}
              title={archiveBlocked ? 'Activate another plan first' : undefined}
              data-testid={`action-archive-${plan.id}`}
            >
              <Archive size={14} /> Archive
            </CardActionButton>
          </>
        )}
      </CardActionRow>
    </Card>
  );
};

export default SavedPlanCard;
