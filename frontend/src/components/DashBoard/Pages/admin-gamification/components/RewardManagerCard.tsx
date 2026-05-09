/**
 * SUB-COMPONENT: RewardManagerCard
 * PARENT: RewardManager
 * PURPOSE: Renders one reward economy card with status, stock, edit, and delete actions.
 * WIREFRAME: [status] [tier] [icon + name + description] [stock chips] [points] [actions]
 * Props: { reward, onEdit, onDelete, onToggleStatus, onOpenStockDialog }
 * CLICK-OUTCOMES:
 * Status button -> toggles active state through parent callback.
 * Stock chip -> opens parent-owned stock dialog.
 * Edit button -> opens parent-owned create/edit dialog.
 * Delete button -> delegates deletion to parent callback.
 * GAMIFICATION: Admin economy configuration only; no member XP is awarded here.
 */
import React from 'react';
import { Edit, Eye, EyeOff, Gift, Star, Trash2 } from 'lucide-react';
import {
  RewardBadge,
  RewardContent,
  RewardDescription,
  RewardFooter,
  RewardHeader,
  RewardIcon,
  RewardItem,
  RewardName,
  RewardPoints,
} from '../styled-gamification-system';
import { rewardIconOptions } from './RewardManager.data';
import {
  ActionRow,
  Chip,
  ChipsRow,
  IconBtn,
  Spacer,
  StatusPositioner,
} from './RewardManagerControls.styles';
import type { Reward } from './RewardManager.types';

interface RewardManagerCardProps {
  reward: Reward;
  onEdit: (reward: Reward) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onOpenStockDialog: (id: string, currentStock: number) => void;
}

const getIconComponent = (iconName: string) => {
  const icon = rewardIconOptions.find(option => option.name === iconName);
  return icon ? icon.component : <Gift />;
};

export const RewardManagerCard: React.FC<RewardManagerCardProps> = ({
  reward,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenStockDialog,
}) => (
  <RewardItem
    tier={reward.tier}
    whileHover={{
      y: -5,
      transition: { duration: 0.2 },
    }}
    style={{ opacity: reward.isActive ? 1 : 0.6 }}
  >
    <RewardBadge tier={reward.tier}>{reward.tier.toUpperCase()}</RewardBadge>

    <StatusPositioner>
      <IconBtn
        $color="accent"
        onClick={() => onToggleStatus(reward.id, !reward.isActive)}
        title={reward.isActive ? 'Active' : 'Inactive'}
        aria-label={`${reward.isActive ? 'Deactivate' : 'Activate'} ${reward.name}`}
      >
        {reward.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
      </IconBtn>
    </StatusPositioner>

    <RewardHeader>
      <RewardIcon tier={reward.tier}>{getIconComponent(reward.icon)}</RewardIcon>

      <RewardContent>
        <RewardName>{reward.name}</RewardName>
        <RewardDescription>{reward.description}</RewardDescription>
      </RewardContent>
    </RewardHeader>

    <ChipsRow>
      <Chip
        $variant={reward.stock <= 3 ? 'error' : undefined}
        onClick={() => onOpenStockDialog(reward.id, reward.stock)}
      >
        Stock: {reward.stock}
      </Chip>
      <Chip as="span" $variant="outlined">
        Redeemed: {reward.redemptionCount}
      </Chip>
    </ChipsRow>

    <Spacer />

    <RewardFooter>
      <RewardPoints tier={reward.tier}>
        <Star size={16} /> {reward.pointCost} points
      </RewardPoints>
    </RewardFooter>

    <ActionRow>
      <IconBtn $color="accent" onClick={() => onEdit(reward)} aria-label={`Edit ${reward.name}`}>
        <Edit size={16} />
      </IconBtn>
      <IconBtn $color="error" onClick={() => onDelete(reward.id)} aria-label={`Delete ${reward.name}`}>
        <Trash2 size={16} />
      </IconBtn>
    </ActionRow>
  </RewardItem>
);
