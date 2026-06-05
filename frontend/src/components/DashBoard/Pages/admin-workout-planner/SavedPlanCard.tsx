/**
 * SavedPlanCard.tsx
 *
 * Saved workout-plan library card with guarded load, activate, rename,
 * duplicate, and archive actions.
 */

import React, { useCallback, useState } from 'react';
import { Play, Copy, Edit3, Archive, Check, X } from 'lucide-react';
import {
  Card,
  CardActionButton,
  CardActionRow,
  CardHeader,
  CardMeta,
  CardTitle,
  RenameInput,
  StatusBadge,
} from './SavedPlanCard.styles';

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
  archiveBlocked: boolean;
  onLoad: (planId: string, planName: string) => void;
  onActivate: (planId: string, planName: string) => void;
  onRename: (planId: string, newName: string) => void;
  onDuplicate: (planId: string, planName: string) => void;
  onArchive: (planId: string, planName: string) => void;
}

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

  const handleCardClick = useCallback(() => {
    if (renaming) return;
    onLoad(plan.id, plan.name);
  }, [renaming, onLoad, plan.id, plan.name]);

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (renaming) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLoad(plan.id, plan.name);
    }
  }, [renaming, onLoad, plan.id, plan.name]);

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
    else e.stopPropagation();
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
