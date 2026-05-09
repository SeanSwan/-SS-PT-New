/**
 * COMPONENT: RewardManager
 * PURPOSE: Canonical admin reward marketplace tab for filtering, editing, and stock control.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Search + tier filter + inactive toggle + create]
 * [Reward grid: card | card | card]
 * [Create/Edit dialog] [Stock dialog]
 *
 * DATA FLOW:
 * Props In: rewards plus create/update/delete/status/stock callbacks.
 * State: filters, active reward draft, dialog visibility, selected stock value.
 * API Calls: none here; parent controller owns persistence callbacks.
 * Events: create reward, update reward, delete reward, toggle status, update stock.
 * Children: RewardManagerFilters, RewardManagerCard, RewardManagerDialog, RewardManagerStockDialog.
 *
 * ARCHITECTURE:
 * RewardManager -> RewardManagerFilters
 * RewardManager -> RewardManagerCard[]
 * RewardManager -> RewardManagerDialog
 * RewardManager -> RewardManagerStockDialog
 */
import React, { useState } from 'react';
import { RewardGrid } from '../styled-gamification-system';
import { createDefaultReward } from './RewardManager.data';
import { RewardManagerCard } from './RewardManagerCard';
import { RewardManagerDialog } from './RewardManagerDialog';
import { RewardManagerFilters } from './RewardManagerFilters';
import { RewardManagerStockDialog } from './RewardManagerStockDialog';
import { Container, EmptyGridState } from './RewardManagerControls.styles';
import type { Reward, RewardDraft, RewardManagerProps, RewardTier } from './RewardManager.types';

const RewardManager: React.FC<RewardManagerProps> = ({
  rewards,
  onCreateReward,
  onUpdateReward,
  onDeleteReward,
  onToggleStatus,
  onUpdateStock,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [draftReward, setDraftReward] = useState<RewardDraft>(createDefaultReward());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<RewardTier | 'all'>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [newStockValue, setNewStockValue] = useState(0);

  const filteredRewards = rewards.filter(reward => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      reward.name.toLowerCase().includes(normalizedSearch) ||
      reward.description.toLowerCase().includes(normalizedSearch);
    const matchesTier = filterTier === 'all' || reward.tier === filterTier;
    const matchesStatus = showInactiveOnly ? !reward.isActive : true;

    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleOpenCreateDialog = () => {
    setEditingReward(null);
    setDraftReward(createDefaultReward());
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setDraftReward({
      name: reward.name,
      description: reward.description,
      icon: reward.icon,
      pointCost: reward.pointCost,
      tier: reward.tier,
      stock: reward.stock,
      isActive: reward.isActive,
      expiresAt: reward.expiresAt,
      imageUrl: reward.imageUrl,
    });
    setDialogOpen(true);
  };

  const handleOpenStockDialog = (rewardId: string, currentStock: number) => {
    setSelectedRewardId(rewardId);
    setNewStockValue(currentStock);
    setStockDialogOpen(true);
  };

  const handleSaveReward = () => {
    if (editingReward) {
      onUpdateReward(editingReward.id, draftReward);
    } else {
      onCreateReward(draftReward);
    }
    setDialogOpen(false);
  };

  const handleUpdateStock = () => {
    onUpdateStock(selectedRewardId, newStockValue);
    setStockDialogOpen(false);
  };

  return (
    <Container>
      <RewardManagerFilters
        searchQuery={searchQuery}
        filterTier={filterTier}
        showInactiveOnly={showInactiveOnly}
        onSearchChange={setSearchQuery}
        onTierChange={setFilterTier}
        onInactiveOnlyChange={setShowInactiveOnly}
        onCreateReward={handleOpenCreateDialog}
      />

      <RewardGrid>
        {filteredRewards.length === 0 ? (
          <EmptyGridState>No rewards match the current filters.</EmptyGridState>
        ) : (
          filteredRewards.map(reward => (
            <RewardManagerCard
              key={reward.id}
              reward={reward}
              onEdit={handleOpenEditDialog}
              onDelete={onDeleteReward}
              onToggleStatus={onToggleStatus}
              onOpenStockDialog={handleOpenStockDialog}
            />
          ))
        )}
      </RewardGrid>

      <RewardManagerDialog
        open={dialogOpen}
        editingReward={editingReward}
        draftReward={draftReward}
        onDraftChange={setDraftReward}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveReward}
      />
      <RewardManagerStockDialog
        open={stockDialogOpen}
        stock={newStockValue}
        onStockChange={setNewStockValue}
        onClose={() => setStockDialogOpen(false)}
        onSave={handleUpdateStock}
      />
    </Container>
  );
};

export default RewardManager;
