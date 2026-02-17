import React, { useState } from 'react';
import styled from 'styled-components';
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
  Search
} from 'lucide-react';

import {
  AchievementGrid,
  AchievementItem,
  AchievementIcon,
  AchievementName,
  AchievementDescription,
  AchievementReward,
  AchievementBadge
} from '../styled-gamification-system';

// ─── Styled Components ───────────────────────────────────────────────

const ControlsRow = styled.div`
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex-grow: 1;
  min-width: 200px;
  max-width: 300px;
  display: flex;
  align-items: center;
`;

const SearchIconBox = styled.div`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: #94a3b8;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px 8px 38px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #0ea5e9;
  }
`;

const StyledSelect = styled.select`
  min-height: 44px;
  min-width: 120px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #0ea5e9;
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #e2e8f0;
  font-size: 14px;
  min-height: 44px;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchTrack = styled.div<{ $checked: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  background: ${({ $checked }) => $checked ? '#0ea5e9' : 'rgba(14, 165, 233, 0.2)'};
  border-radius: 11px;
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

const SwitchThumb = styled.div<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => $checked ? '20px' : '2px'};
  width: 18px;
  height: 18px;
  background: #e2e8f0;
  border-radius: 50%;
  transition: left 0.2s ease;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: #0ea5e9;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: #0284c7;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }
`;

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  background: transparent;
  color: #0ea5e9;
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }
`;

const HiddenFileInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

const StatusPositioner = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
`;

const TooltipButton = styled.button<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: ${({ $isActive }) => $isActive ? '#0ea5e9' : '#64748b'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
  }
`;

const ChipRequirement = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
`;

const ChipSpan = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 16px;
  color: #e2e8f0;
  font-size: 12px;
  margin-bottom: 8px;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
  gap: 8px;
  width: 100%;
`;

const IconActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: ${({ $variant }) => $variant === 'danger' ? '#ef4444' : '#0ea5e9'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $variant }) => $variant === 'danger'
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(14, 165, 233, 0.1)'};
  }
`;

// ─── Dialog Styled Components ────────────────────────────────────────

const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1300;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const DialogPanel = styled.div`
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
`;

const DialogTitleBar = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
`;

const DialogTitleText = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
`;

const DialogContentArea = styled.div`
  padding: 24px;
`;

const DialogActionsBar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(14, 165, 233, 0.2);
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormFieldFull = styled.div`
  grid-column: 1 / -1;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
`;

const FormInput = styled.input`
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #0ea5e9;
  }
`;

const FormInputWithIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: #0ea5e9;
  }

  input {
    flex: 1;
    min-height: 42px;
    padding: 0;
    background: transparent;
    border: none;
    color: #e2e8f0;
    font-size: 14px;
    outline: none;
  }
`;

const FormTextarea = styled.textarea`
  min-height: 88px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #0ea5e9;
  }
`;

const FormSelect = styled.select`
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #0ea5e9;
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(14, 165, 233, 0.2);
  margin: 4px 0;
`;

const SectionTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
`;

const TierSwatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  vertical-align: middle;
  margin-right: 6px;
`;

const BadgePreview = styled.div`
  margin-top: 12px;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
  }
`;

// ─── Interfaces ──────────────────────────────────────────────────────

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
  badgeImageUrl?: string;
}

interface AchievementManagerProps {
  achievements: Achievement[];
  onCreateAchievement: (achievement: Omit<Achievement, 'id'>) => void;
  onUpdateAchievement: (id: string, achievement: Partial<Achievement>) => void;
  onDeleteAchievement: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

const icons = [
  { name: 'Award', component: <Award /> },
  { name: 'Trophy', component: <Trophy /> },
  { name: 'Medal', component: <Medal /> },
  { name: 'Star', component: <Star /> },
  { name: 'Dumbbell', component: <Dumbbell /> },
  { name: 'Heart', component: <Heart /> },
  { name: 'Target', component: <Target /> },
  { name: 'Zap', component: <Zap /> },
  { name: 'Calendar', component: <Calendar /> },
  { name: 'Clock', component: <Clock /> },
  { name: 'TrendingUp', component: <TrendingUp /> },
  { name: 'Gift', component: <Gift /> },
];

const requirementTypes = [
  { value: 'session_count', label: 'Session Count' },
  { value: 'exercise_count', label: 'Exercise Count' },
  { value: 'specific_exercise', label: 'Specific Exercise' },
  { value: 'level_reached', label: 'Level Reached' },
  { value: 'streak_days', label: 'Streak Days' },
  { value: 'specific_goal', label: 'Specific Goal' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'custom', label: 'Custom Achievement' },
];

const tiers = [
  { value: 'bronze', label: 'Bronze', color: '#CD7F32' },
  { value: 'silver', label: 'Silver', color: '#C0C0C0' },
  { value: 'gold', label: 'Gold', color: '#FFD700' },
  { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
];

/**
 * AchievementManager Component
 * Admin interface for managing achievements in the gamification system
 */
const AchievementManager: React.FC<AchievementManagerProps> = ({
  achievements,
  onCreateAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
  onToggleStatus
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [newAchievement, setNewAchievement] = useState<Omit<Achievement, 'id'>>({
    name: '',
    description: '',
    icon: 'Trophy',
    pointValue: 100,
    requirementType: 'session_count',
    requirementValue: 5,
    tier: 'bronze',
    isActive: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  // Get filtered achievements
  const filteredAchievements = achievements.filter(a => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Tier filter
    const matchesTier = filterTier === 'all' || a.tier === filterTier;

    // Active status filter
    const matchesStatus = showInactiveOnly ? !a.isActive : true;

    return matchesSearch && matchesTier && matchesStatus;
  });

  // Handle opening the dialog for creating new achievement
  const handleOpenCreateDialog = () => {
    setEditingAchievement(null);
    setNewAchievement({
      name: '',
      description: '',
      icon: 'Trophy',
      pointValue: 100,
      requirementType: 'session_count',
      requirementValue: 5,
      tier: 'bronze',
      isActive: true
    });
    setDialogOpen(true);
  };

  // Handle opening the dialog for editing an achievement
  const handleOpenEditDialog = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setNewAchievement({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      pointValue: achievement.pointValue,
      requirementType: achievement.requirementType,
      requirementValue: achievement.requirementValue,
      tier: achievement.tier,
      isActive: achievement.isActive,
      badgeImageUrl: achievement.badgeImageUrl
    });
    setDialogOpen(true);
  };

  // Handle saving achievement (create or update)
  const handleSaveAchievement = () => {
    if (editingAchievement) {
      onUpdateAchievement(editingAchievement.id, newAchievement);
    } else {
      onCreateAchievement(newAchievement);
    }
    setDialogOpen(false);
  };

  // Helper function to get icon component
  const getIconComponent = (iconName: string) => {
    const icon = icons.find(i => i.name === iconName);
    return icon ? icon.component : <Award />;
  };

  return (
    <div>
      {/* Search and filter controls */}
      <ControlsRow>
        <SearchInputWrapper>
          <SearchIconBox>
            <Search size={18} />
          </SearchIconBox>
          <StyledInput
            placeholder="Search achievements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInputWrapper>

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

        <SwitchLabel>
          <HiddenCheckbox
            checked={showInactiveOnly}
            onChange={(e) => setShowInactiveOnly(e.target.checked)}
          />
          <SwitchTrack $checked={showInactiveOnly}>
            <SwitchThumb $checked={showInactiveOnly} />
          </SwitchTrack>
          Inactive Only
        </SwitchLabel>

        <PrimaryButton
          onClick={handleOpenCreateDialog}
          data-testid="create-achievement-button"
        >
          <Plus size={18} />
          New Achievement
        </PrimaryButton>
      </ControlsRow>

      {/* Display achievements in a grid */}
      <AchievementGrid>
        {filteredAchievements.map((achievement) => (
          <AchievementItem
            key={achievement.id}
            tier={achievement.tier}
            whileHover={{
              y: -5,
              transition: { duration: 0.2 }
            }}
            style={{ opacity: achievement.isActive ? 1 : 0.6 }}
          >
            <AchievementBadge tier={achievement.tier}>
              {achievement.tier.toUpperCase()}
            </AchievementBadge>

            <StatusPositioner>
              <TooltipButton
                $isActive={achievement.isActive}
                onClick={() => onToggleStatus(achievement.id, !achievement.isActive)}
                title={achievement.isActive ? "Active" : "Inactive"}
              >
                {achievement.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
              </TooltipButton>
            </StatusPositioner>

            <AchievementIcon tier={achievement.tier}>
              {getIconComponent(achievement.icon)}
            </AchievementIcon>

            <AchievementName>{achievement.name}</AchievementName>

            <AchievementDescription>
              {achievement.description}
            </AchievementDescription>

            <ChipRequirement>
              <ChipSpan>
                {`${achievement.requirementValue} ${achievement.requirementType.replace('_', ' ')}`}
              </ChipSpan>
            </ChipRequirement>

            <AchievementReward>
              <Star size={18} /> {achievement.pointValue} points
            </AchievementReward>

            <ActionRow>
              <IconActionButton
                $variant="primary"
                onClick={() => handleOpenEditDialog(achievement)}
                title="Edit"
              >
                <Edit size={16} />
              </IconActionButton>
              <IconActionButton
                $variant="danger"
                onClick={() => onDeleteAchievement(achievement.id)}
                title="Delete"
              >
                <Trash2 size={16} />
              </IconActionButton>
            </ActionRow>
          </AchievementItem>
        ))}
      </AchievementGrid>

      {/* Create/Edit Achievement Dialog */}
      <DialogOverlay $open={dialogOpen} onClick={() => setDialogOpen(false)}>
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>
            <DialogTitleText>
              {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
            </DialogTitleText>
          </DialogTitleBar>
          <DialogContentArea>
            <FormGrid>
              <FormFieldFull>
                <FormField>
                  <FieldLabel>Achievement Name</FieldLabel>
                  <FormInput
                    value={newAchievement.name}
                    onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })}
                    placeholder="Achievement Name"
                    required
                  />
                </FormField>
              </FormFieldFull>

              <FormFieldFull>
                <FormField>
                  <FieldLabel>Description</FieldLabel>
                  <FormTextarea
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                    placeholder="Description"
                    rows={3}
                    required
                  />
                </FormField>
              </FormFieldFull>

              <FormField>
                <FieldLabel>Icon</FieldLabel>
                <FormSelect
                  value={newAchievement.icon}
                  onChange={(e) => setNewAchievement({ ...newAchievement, icon: e.target.value })}
                >
                  {icons.map(icon => (
                    <option key={icon.name} value={icon.name}>
                      {icon.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField>
                <FieldLabel>Tier</FieldLabel>
                <FormSelect
                  value={newAchievement.tier}
                  onChange={(e) => setNewAchievement({
                    ...newAchievement,
                    tier: e.target.value as 'bronze' | 'silver' | 'gold' | 'platinum'
                  })}
                >
                  {tiers.map(tier => (
                    <option key={tier.value} value={tier.value}>
                      {tier.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField>
                <FieldLabel>Point Value</FieldLabel>
                <FormInputWithIcon>
                  <Star size={16} color="#FFC107" />
                  <input
                    type="number"
                    value={newAchievement.pointValue}
                    onChange={(e) => setNewAchievement({
                      ...newAchievement,
                      pointValue: parseInt(e.target.value) || 0
                    })}
                    required
                  />
                </FormInputWithIcon>
              </FormField>

              <FormField>
                <FieldLabel>&nbsp;</FieldLabel>
                <SwitchLabel>
                  <HiddenCheckbox
                    checked={newAchievement.isActive}
                    onChange={(e) => setNewAchievement({
                      ...newAchievement,
                      isActive: e.target.checked
                    })}
                  />
                  <SwitchTrack $checked={newAchievement.isActive}>
                    <SwitchThumb $checked={newAchievement.isActive} />
                  </SwitchTrack>
                  Active
                </SwitchLabel>
              </FormField>

              <FormFieldFull>
                <StyledDivider />
                <SectionTitle>
                  Achievement Requirements
                </SectionTitle>
              </FormFieldFull>

              <FormField>
                <FieldLabel>Requirement Type</FieldLabel>
                <FormSelect
                  value={newAchievement.requirementType}
                  onChange={(e) => setNewAchievement({
                    ...newAchievement,
                    requirementType: e.target.value
                  })}
                >
                  {requirementTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </FormSelect>
              </FormField>

              <FormField>
                <FieldLabel>Requirement Value</FieldLabel>
                <FormInput
                  type="number"
                  value={newAchievement.requirementValue}
                  onChange={(e) => setNewAchievement({
                    ...newAchievement,
                    requirementValue: parseInt(e.target.value) || 0
                  })}
                  required
                />
              </FormField>

              <FormFieldFull>
                <StyledDivider />
                <SectionTitle>
                  Badge Image (Optional)
                </SectionTitle>
              </FormFieldFull>

              <FormFieldFull>
                <OutlinedButton as="label">
                  <Image size={18} />
                  Upload Badge Image
                  <HiddenFileInput
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      // File upload would be implemented in a real application
                      // This is just a placeholder for the UI
                      console.log("File selected:", e.target.files?.[0]);
                    }}
                  />
                </OutlinedButton>
                {newAchievement.badgeImageUrl && (
                  <BadgePreview>
                    <img
                      src={newAchievement.badgeImageUrl}
                      alt="Badge"
                    />
                  </BadgePreview>
                )}
              </FormFieldFull>
            </FormGrid>
          </DialogContentArea>
          <DialogActionsBar>
            <SecondaryButton onClick={() => setDialogOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleSaveAchievement}
              disabled={!newAchievement.name || !newAchievement.description}
            >
              {editingAchievement ? 'Update' : 'Create'}
            </PrimaryButton>
          </DialogActionsBar>
        </DialogPanel>
      </DialogOverlay>
    </div>
  );
};

export default AchievementManager;
