import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import {
  Award,
  Edit,
  Trash2,
  Plus,
  Star,
  Gift,
  TrendingUp,
  Trophy,
  Heart,
  Target,
  Zap,
  Calendar,
  Clock,
  Dumbbell,
  Medal,
  Eye,
  EyeOff,
  DollarSign,
  Image,
  Search,
  Tag,
  X
} from 'lucide-react';

import {
  RewardGrid,
  RewardItem,
  RewardHeader,
  RewardIcon,
  RewardContent,
  RewardName,
  RewardDescription,
  RewardFooter,
  RewardPoints,
  RewardBadge
} from '../styled-gamification-system';

/* ─── Galaxy-Swan Theme Tokens ─── */
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgLight: 'rgba(30,41,59,0.8)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.15)',
  glass: 'rgba(15,23,42,0.85)',
  overlay: 'rgba(0,0,0,0.6)',
};

/* ─── Styled Components ─── */

const Container = styled.div``;

const ControlsBar = styled.div`
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
  position: relative;
  flex-grow: 1;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: ${theme.textMuted};
  pointer-events: none;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 38px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const SelectWrapper = styled.div`
  position: relative;
  min-width: 120px;
`;

const SelectLabel = styled.label`
  position: absolute;
  top: -8px;
  left: 10px;
  font-size: 0.7rem;
  color: ${theme.textMuted};
  background: rgba(15,23,42,1);
  padding: 0 4px;
  z-index: 1;
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${theme.accent};
  }

  option {
    background: #1e293b;
    color: ${theme.text};
  }
`;

const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  min-height: 44px;
  user-select: none;
  color: ${theme.text};
  font-size: 0.875rem;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  background: ${({ $checked }) => $checked ? theme.accent : 'rgba(100,116,139,0.5)'};
  border-radius: 11px;
  transition: background 0.2s;
  flex-shrink: 0;
`;

const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => $checked ? '20px' : '2px'};
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.2s;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 10px 20px;
  background: ${theme.accent};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${theme.accentHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: ${theme.accent};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${theme.accent};
    background: rgba(14,165,233,0.08);
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 16px;
  background: transparent;
  color: ${theme.textMuted};
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${theme.text};
    background: rgba(255,255,255,0.05);
  }
`;

const StatusPositioner = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
`;

const IconBtn = styled.button<{ $color?: 'accent' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  color: ${({ $color }) =>
    $color === 'error' ? theme.error :
    $color === 'accent' ? theme.accent :
    theme.textMuted
  };

  &:hover {
    background: ${({ $color }) =>
      $color === 'error' ? theme.errorBg :
      'rgba(14,165,233,0.12)'
    };
    color: ${({ $color }) =>
      $color === 'error' ? '#f87171' :
      theme.accentHover
    };
  }
`;

const ChipsRow = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Chip = styled.span<{ $variant?: 'error' | 'outlined' }>`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: ${({ $variant }) => $variant === 'outlined' ? 'default' : 'pointer'};
  transition: background 0.2s;

  ${({ $variant }) => {
    if ($variant === 'error') return css`
      background: ${theme.errorBg};
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.3);
    `;
    if ($variant === 'outlined') return css`
      background: transparent;
      color: ${theme.accent};
      border: 1px solid ${theme.border};
    `;
    return css`
      background: rgba(14,165,233,0.12);
      color: ${theme.accent};
      border: 1px solid rgba(14,165,233,0.2);
    `;
  }}

  &:hover {
    ${({ $variant }) => $variant !== 'outlined' && css`
      background: rgba(14,165,233,0.2);
    `}
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
  gap: 0.25rem;
  width: 100%;
`;

const Spacer = styled.div`
  margin-top: auto;
`;

/* ─── Dialog / Modal ─── */

const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: ${theme.overlay};
  padding: 1rem;
`;

const DialogPanel = styled.div<{ $maxWidth?: string }>`
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth || '720px'};
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  overflow: hidden;
`;

const DialogTitleBar = styled.h2`
  margin: 0;
  padding: 1.25rem 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
  border-bottom: 1px solid ${theme.border};
`;

const DialogBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${theme.border};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormFieldFull = styled.div`
  grid-column: 1 / -1;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.8rem;
  color: ${theme.textMuted};
  font-weight: 500;
`;

const FieldInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const FieldInputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIconLeft = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: ${theme.textMuted};
  pointer-events: none;
`;

const InputWithPadding = styled(FieldInput)`
  padding-left: 38px;
`;

const FieldTextarea = styled.textarea`
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;

  &::placeholder {
    color: ${theme.textMuted};
  }

  &:focus {
    border-color: ${theme.accent};
  }
`;

const FieldSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: auto;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${theme.accent};
  }

  option {
    background: #1e293b;
    color: ${theme.text};
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 0.5rem 0;
`;

const SectionLabel = styled.p`
  margin: 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
`;

const ImagePreview = styled.div`
  margin-top: 0.75rem;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
  }
`;

const TierDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

/* ─── Interfaces ─── */

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

interface RewardManagerProps {
  rewards: Reward[];
  onCreateReward: (reward: Omit<Reward, 'id' | 'redemptionCount'>) => void;
  onUpdateReward: (id: string, reward: Partial<Reward>) => void;
  onDeleteReward: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onUpdateStock: (id: string, stock: number) => void;
}

const icons = [
  { name: 'Gift', component: <Gift /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Star', component: <Star /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Tag', component: <Tag /> },
  { name: 'DollarSign', component: <DollarSign /> },
  { name: 'Award', component: <Award /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Clock', component: <Clock /> },
];

const tiers = [
  { value: 'bronze', label: 'Bronze', color: '#CD7F32' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'gold', label: 'Gold', color: '#FFD700' },
  { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
];

/**
 * RewardManager Component
 * Admin interface for managing rewards in the gamification system
 */
const RewardManager: React.FC<RewardManagerProps> = ({
  rewards,
  onCreateReward,
  onUpdateReward,
  onDeleteReward,
  onToggleStatus,
  onUpdateStock
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [newReward, setNewReward] = useState<Omit<Reward, 'id' | 'redemptionCount'>>({
    name: '',
    description: '',
    icon: 'Gift',
    pointCost: 500,
    tier: 'bronze',
    stock: 10,
    isActive: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [newStockValue, setNewStockValue] = useState(0);

  // Get filtered rewards
  const filteredRewards = rewards.filter(r => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Tier filter
    const matchesTier = filterTier === 'all' || r.tier === filterTier;

    // Active status filter
    const matchesStatus = showInactiveOnly ? !r.isActive : true;

    return matchesSearch && matchesTier && matchesStatus;
  });

  // Handle opening the dialog for creating new reward
  const handleOpenCreateDialog = () => {
    setEditingReward(null);
    setNewReward({
      name: '',
      description: '',
      icon: 'Gift',
      pointCost: 500,
      tier: 'bronze',
      stock: 10,
      isActive: true
    });
    setDialogOpen(true);
  };

  // Handle opening the dialog for editing a reward
  const handleOpenEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setNewReward({
      name: reward.name,
      description: reward.description,
      icon: reward.icon,
      pointCost: reward.pointCost,
      tier: reward.tier,
      stock: reward.stock,
      isActive: reward.isActive,
      expiresAt: reward.expiresAt,
      imageUrl: reward.imageUrl
    });
    setDialogOpen(true);
  };

  // Handle opening stock update dialog
  const handleOpenStockDialog = (rewardId: string, currentStock: number) => {
    setSelectedRewardId(rewardId);
    setNewStockValue(currentStock);
    setStockDialogOpen(true);
  };

  // Handle saving reward (create or update)
  const handleSaveReward = () => {
    if (editingReward) {
      onUpdateReward(editingReward.id, newReward);
    } else {
      onCreateReward(newReward);
    }
    setDialogOpen(false);
  };

  // Handle updating stock
  const handleUpdateStock = () => {
    onUpdateStock(selectedRewardId, newStockValue);
    setStockDialogOpen(false);
  };

  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    const icon = icons.find(i => i.name === iconName);
    return icon ? icon.component : <Gift />;
  };

  return (
    <Container>
      {/* Search and filter controls */}
      <ControlsBar>
        <SearchWrapper>
          <SearchIcon><Search size={18} /></SearchIcon>
          <StyledInput
            placeholder="Search rewards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchWrapper>

        <SelectWrapper>
          <SelectLabel>Tier</SelectLabel>
          <StyledSelect
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <option value="all">All Tiers</option>
            {tiers.map(tier => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </StyledSelect>
        </SelectWrapper>

        <SwitchContainer>
          <HiddenCheckbox
            checked={showInactiveOnly}
            onChange={(e) => setShowInactiveOnly(e.target.checked)}
          />
          <SwitchTrack $checked={showInactiveOnly}>
            <SwitchThumb $checked={showInactiveOnly} />
          </SwitchTrack>
          Inactive Only
        </SwitchContainer>

        <PrimaryButton
          onClick={handleOpenCreateDialog}
          data-testid="create-reward-button"
        >
          <Plus size={18} />
          New Reward
        </PrimaryButton>
      </ControlsBar>

      {/* Display rewards in a grid */}
      <RewardGrid>
        {filteredRewards.map((reward) => (
          <RewardItem
            key={reward.id}
            tier={reward.tier}
            whileHover={{
              y: -5,
              transition: { duration: 0.2 }
            }}
            style={{ opacity: reward.isActive ? 1 : 0.6 }}
          >
            <RewardBadge tier={reward.tier}>
              {reward.tier.toUpperCase()}
            </RewardBadge>

            <StatusPositioner>
              <IconBtn
                $color="accent"
                onClick={() => onToggleStatus(reward.id, !reward.isActive)}
                title={reward.isActive ? "Active" : "Inactive"}
              >
                {reward.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
              </IconBtn>
            </StatusPositioner>

            <RewardHeader>
              <RewardIcon tier={reward.tier}>
                {getIconComponent(reward.icon)}
              </RewardIcon>

              <RewardContent>
                <RewardName>{reward.name}</RewardName>
                <RewardDescription>
                  {reward.description}
                </RewardDescription>
              </RewardContent>
            </RewardHeader>

            <ChipsRow>
              <Chip
                $variant={reward.stock <= 3 ? 'error' : undefined}
                onClick={() => handleOpenStockDialog(reward.id, reward.stock)}
              >
                Stock: {reward.stock}
              </Chip>
              <Chip $variant="outlined">
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
              <IconBtn
                $color="accent"
                onClick={() => handleOpenEditDialog(reward)}
              >
                <Edit size={16} />
              </IconBtn>
              <IconBtn
                $color="error"
                onClick={() => onDeleteReward(reward.id)}
              >
                <Trash2 size={16} />
              </IconBtn>
            </ActionRow>
          </RewardItem>
        ))}
      </RewardGrid>

      {/* Create/Edit Reward Dialog */}
      <DialogOverlay $open={dialogOpen} onClick={() => setDialogOpen(false)}>
        <DialogPanel $maxWidth="720px" onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>
            {editingReward ? 'Edit Reward' : 'Create New Reward'}
          </DialogTitleBar>
          <DialogBody>
            <FormGrid>
              <FormFieldFull>
                <FieldLabel>Reward Name *</FieldLabel>
                <FieldInput
                  value={newReward.name}
                  onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                  placeholder="Enter reward name"
                />
              </FormFieldFull>

              <FormFieldFull>
                <FieldLabel>Description *</FieldLabel>
                <FieldTextarea
                  value={newReward.description}
                  onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                  placeholder="Enter reward description"
                  rows={3}
                />
              </FormFieldFull>

              <div>
                <FieldLabel>Icon</FieldLabel>
                <FieldSelect
                  value={newReward.icon}
                  onChange={(e) => setNewReward({ ...newReward, icon: e.target.value })}
                >
                  {icons.map(icon => (
                    <option key={icon.name} value={icon.name}>
                      {icon.name}
                    </option>
                  ))}
                </FieldSelect>
              </div>

              <div>
                <FieldLabel>Tier</FieldLabel>
                <FieldSelect
                  value={newReward.tier}
                  onChange={(e) => setNewReward({
                    ...newReward,
                    tier: e.target.value as 'bronze' | 'silver' | 'gold' | 'platinum'
                  })}
                >
                  {tiers.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </FieldSelect>
              </div>

              <div>
                <FieldLabel>Point Cost *</FieldLabel>
                <FieldInputWithIcon>
                  <InputIconLeft><Star size={16} color="#FFC107" /></InputIconLeft>
                  <InputWithPadding
                    type="number"
                    value={newReward.pointCost}
                    onChange={(e) => setNewReward({
                      ...newReward,
                      pointCost: parseInt(e.target.value) || 0
                    })}
                  />
                </FieldInputWithIcon>
              </div>

              <div>
                <FieldLabel>Stock *</FieldLabel>
                <FieldInput
                  type="number"
                  value={newReward.stock}
                  onChange={(e) => setNewReward({
                    ...newReward,
                    stock: parseInt(e.target.value) || 0
                  })}
                />
              </div>

              <div>
                <FieldLabel>&nbsp;</FieldLabel>
                <SwitchContainer>
                  <HiddenCheckbox
                    checked={newReward.isActive}
                    onChange={(e) => setNewReward({
                      ...newReward,
                      isActive: e.target.checked
                    })}
                  />
                  <SwitchTrack $checked={newReward.isActive}>
                    <SwitchThumb $checked={newReward.isActive} />
                  </SwitchTrack>
                  Active
                </SwitchContainer>
              </div>

              <div>
                <FieldLabel>Expiration Date (Optional)</FieldLabel>
                <FieldInput
                  type="date"
                  value={newReward.expiresAt ? new Date(newReward.expiresAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewReward({
                    ...newReward,
                    expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                  })}
                />
              </div>

              <FormFieldFull>
                <Divider />
                <SectionLabel>Reward Image (Optional)</SectionLabel>
              </FormFieldFull>

              <FormFieldFull>
                <OutlinedButton as="label">
                  <Image size={18} />
                  Upload Reward Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      // File upload would be implemented in a real application
                      // This is just a placeholder for the UI
                      console.log("File selected:", e.target.files?.[0]);
                    }}
                  />
                </OutlinedButton>
                {newReward.imageUrl && (
                  <ImagePreview>
                    <img
                      src={newReward.imageUrl}
                      alt="Reward"
                    />
                  </ImagePreview>
                )}
              </FormFieldFull>
            </FormGrid>
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setDialogOpen(false)}>
              Cancel
            </GhostButton>
            <PrimaryButton
              onClick={handleSaveReward}
              disabled={!newReward.name || !newReward.description}
            >
              {editingReward ? 'Update' : 'Create'}
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>

      {/* Update Stock Dialog */}
      <DialogOverlay $open={stockDialogOpen} onClick={() => setStockDialogOpen(false)}>
        <DialogPanel $maxWidth="400px" onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>Update Stock</DialogTitleBar>
          <DialogBody>
            <FieldLabel>Stock Quantity</FieldLabel>
            <FieldInput
              type="number"
              value={newStockValue}
              onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
              min={0}
            />
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setStockDialogOpen(false)}>
              Cancel
            </GhostButton>
            <PrimaryButton onClick={handleUpdateStock}>
              Update
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </DialogOverlay>
    </Container>
  );
};

export default RewardManager;
