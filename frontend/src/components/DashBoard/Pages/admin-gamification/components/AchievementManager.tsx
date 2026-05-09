/**
 * Canonical admin achievement manager tab.
 * Owns filtering and dialog state while delegating card/dialog rendering.
 */
import React, { useState } from 'react';
import { AchievementGrid } from '../styled-gamification-system';
import { createDefaultAchievement } from './AchievementManager.data';
import { AchievementManagerCard } from './AchievementManagerCard';
import { AchievementManagerDialog } from './AchievementManagerDialog';
import { AchievementManagerFilters } from './AchievementManagerFilters';
import {
  EmptyGridState,
  EmptyStateIcon,
} from './AchievementManagerControls.styles';
import type {
  Achievement,
  AchievementDraft,
  AchievementManagerProps,
  AchievementTier,
} from './AchievementManager.types';

const AchievementManager: React.FC<AchievementManagerProps> = ({
  achievements,
  onCreateAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
  onToggleStatus,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [draftAchievement, setDraftAchievement] = useState<AchievementDraft>(createDefaultAchievement());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<AchievementTier | 'all'>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  const filteredAchievements = achievements.filter(achievement => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      achievement.name.toLowerCase().includes(normalizedSearch) ||
      achievement.description.toLowerCase().includes(normalizedSearch);
    const matchesTier = filterTier === 'all' || achievement.tier === filterTier;
    const matchesStatus = showInactiveOnly ? !achievement.isActive : true;

    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleOpenCreateDialog = () => {
    setEditingAchievement(null);
    setDraftAchievement(createDefaultAchievement());
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setDraftAchievement({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      pointValue: achievement.pointValue,
      requirementType: achievement.requirementType,
      requirementValue: achievement.requirementValue,
      tier: achievement.tier,
      isActive: achievement.isActive,
      badgeImageUrl: achievement.badgeImageUrl,
    });
    setDialogOpen(true);
  };

  const handleSaveAchievement = () => {
    if (editingAchievement) {
      onUpdateAchievement(editingAchievement.id, draftAchievement);
    } else {
      onCreateAchievement(draftAchievement);
    }
    setDialogOpen(false);
  };

  return (
    <div>
      <AchievementManagerFilters
        searchQuery={searchQuery}
        filterTier={filterTier}
        showInactiveOnly={showInactiveOnly}
        onSearchChange={setSearchQuery}
        onTierChange={setFilterTier}
        onInactiveOnlyChange={setShowInactiveOnly}
        onCreateAchievement={handleOpenCreateDialog}
      />

      <AchievementGrid>
        {filteredAchievements.length === 0 ? (
          <EmptyGridState>
            <EmptyStateIcon />
            <h3>No Achievements Yet</h3>
            <p>
              Create your first achievement to start rewarding your clients for their fitness journey.
              Achievements drive engagement and help clients stay motivated.
            </p>
          </EmptyGridState>
        ) : (
          filteredAchievements.map(achievement => (
            <AchievementManagerCard
              key={achievement.id}
              achievement={achievement}
              onEdit={handleOpenEditDialog}
              onDelete={onDeleteAchievement}
              onToggleStatus={onToggleStatus}
            />
          ))
        )}
      </AchievementGrid>

      <AchievementManagerDialog
        open={dialogOpen}
        editingAchievement={editingAchievement}
        draftAchievement={draftAchievement}
        onDraftChange={setDraftAchievement}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveAchievement}
      />
    </div>
  );
};

export default AchievementManager;
