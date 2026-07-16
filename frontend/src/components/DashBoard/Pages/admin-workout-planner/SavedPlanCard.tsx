/**
 * BLUEPRINT: saved workout-plan library card.
 * Purpose: render one admin/trainer plan arc with guarded card actions.
 * Data: SavedPlanSummary from the saved-plans hook.
 * A11y: keyboard-loadable card plus named 44px nested controls.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Check, Copy, Edit3, Play, Star, X } from 'lucide-react';
import SavedPlanPdfPanel from './SavedPlanPdfPanel';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';
import {
  Card,
  CardActionButton,
  CardActionRow,
  CardHeader,
  CardMeta,
  CardTitle,
  HorizonBadge,
  PlanArcRow,
  PlanNumberBadge,
  PlanTitleGroup,
  PrimaryArcBadge,
  RenameInput,
  StatusBadge,
} from './SavedPlanCard.styles';

export type SavedPlanStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface SavedPlanPdfFile {
  url: string;
  fileName: string;
  contentType: string;
  updatedAt?: string | null;
}

export interface SavedPlanSummary {
  id: string;
  name: string;
  status: SavedPlanStatus | string;
  createdAt: string;
  goal: string;
  contentRevision?: number;
  horizonKey?: string;
  horizonLabel?: string;
  isPrimary?: boolean;
  pdfFile?: SavedPlanPdfFile | null;
}

interface SavedPlanCardProps {
  plan: SavedPlanSummary;
  ordinal?: number;
  loaded: boolean;
  archiveBlocked: boolean;
  onLoad: (planId: string, planName: string) => void;
  onActivate: (planId: string, planName: string) => void;
  onRename: (planId: string, newName: string) => void;
  onDuplicate: (planId: string, planName: string) => void;
  onArchive: (planId: string, planName: string) => void;
  onSetPrimary: (planId: string, planName: string) => void;
  onViewPdf: (plan: SavedPlanSummary) => void;
  onUpdatePdf: (plan: SavedPlanSummary) => void;
}

const SavedPlanCard: React.FC<SavedPlanCardProps> = ({
  plan,
  ordinal,
  loaded,
  archiveBlocked,
  onLoad,
  onActivate,
  onRename,
  onDuplicate,
  onArchive,
  onSetPrimary,
  onViewPdf,
  onUpdatePdf,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(plan.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renaming]);
  const isCurrent = isWorkoutPlanActiveStatus(plan.status);
  const isPrimaryCurrent = isCurrent && Boolean(plan.isPrimary);
  const normalizedStatus = String(plan.status || '').trim().toLowerCase();
  const cardLoadLabel = ordinal
    ? `Load plan ${ordinal}: ${plan.name}`
    : `Load plan: ${plan.name}`;

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

  const handleSetPrimary = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCurrent) {
      onActivate(plan.id, plan.name);
      return;
    }
    onSetPrimary(plan.id, plan.name);
  }, [isCurrent, onActivate, onSetPrimary, plan.id, plan.name]);

  const stopProp = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Card
      className="lens2-row"
      $loaded={loaded}
      $isCurrent={isCurrent}
      role="button"
      tabIndex={0}
      aria-label={cardLoadLabel}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      data-testid={`saved-plan-card-${plan.id}`}
    >
      <CardHeader>
        <PlanTitleGroup>
          {ordinal && (
            <PlanNumberBadge data-testid={`saved-plan-number-${plan.id}`}>
              Plan {ordinal}
            </PlanNumberBadge>
          )}
          {renaming ? (
            <RenameInput
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={stopProp}
              onKeyDown={handleRenameKeyDown}
              aria-label="Rename plan"
              data-testid={`rename-input-${plan.id}`}
            />
          ) : (
            <CardTitle title={plan.name}>{plan.name}</CardTitle>
          )}
        </PlanTitleGroup>
        <StatusBadge
          $status={normalizedStatus}
          data-testid={isCurrent ? 'current-badge' : `status-badge-${normalizedStatus}`}
        >
          {isCurrent ? 'Current' : plan.status}
        </StatusBadge>
      </CardHeader>

      {plan.goal && (
        <CardMeta>
          <span>Goal: {plan.goal.replace(/_/g, ' ')}</span>
        </CardMeta>
      )}

      <PlanArcRow>
        <HorizonBadge>{plan.horizonLabel || '6 Month'}</HorizonBadge>
        {isPrimaryCurrent && (
          <PrimaryArcBadge data-testid="primary-arc-badge">
            <Star size={12} /> Primary Arc
          </PrimaryArcBadge>
        )}
      </PlanArcRow>

      <SavedPlanPdfPanel plan={plan} onViewPdf={onViewPdf} onUpdatePdf={onUpdatePdf} />

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
            {isCurrent && !plan.isPrimary && (
              <CardActionButton
                type="button"
                onClick={handleSetPrimary}
                aria-label={`Make ${plan.name} the primary training arc`}
                data-testid={`action-set-primary-${plan.id}`}
              >
                <Star size={14} /> Set Primary
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
