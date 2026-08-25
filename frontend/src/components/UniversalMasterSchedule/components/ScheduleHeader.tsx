import React from 'react';
import { Calendar, RefreshCw, Bell, Plus, Clock, ChevronDown, Settings, Repeat, Users, User, Columns, Rows, Maximize, Minimize } from 'lucide-react';
import {
  FlexBox,
  Box,
  PageTitle,
  IconButton as StyledIconButton,
  OutlinedButton,
} from '../ui';
import ForgeButton from '../../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ViewSelector from '../Views/ViewSelector';
import '../types';
import Dropdown from '../../common/Dropdown/Dropdown';
import type { ScheduleHeaderProps } from './ScheduleHeader.types';
import {
  AdminScopeToggle,
  HeaderActions,
  HeaderAvatar,
  HeaderContainer,
  HeaderSubtitleText,
  LayoutDensityBar,
  MenuItemButton,
  ScopeButton,
  ToggleButton,
  ToggleGroup,
  TrainerSelect,
} from './ScheduleHeader.styles';

export type { AdminViewScope, ScheduleHeaderProps } from './ScheduleHeader.types';

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  mode,
  activeView,
  currentDate,
  onViewChange,
  onDateChange,
  onRefresh,
  onOpenNotifications,
  onOpenAvailability,
  onOpenBlocked,
  onOpenRecurring,
  onOpenPayment,
  onOpenCreate,
  onOpenSessionTypes,
  onOpenClientRecurring,
  canManageAvailability,
  canBlockTime,
  canCreateRecurring,
  canCreateSessions,
  canManageSessionTypes,
  // MindBody Parity props
  adminViewScope = 'global',
  onAdminViewScopeChange,
  trainers = [],
  selectedTrainerId,
  onTrainerFilterChange,
  // Layout & Density
  layoutMode = 'columns',
  onLayoutModeChange,
  density = 'comfortable',
  onDensityChange,
  currentUser,
  headerTitle: headerTitleProp,
  headerSubtitle,
  headerImageUrl
}) => {
  const headerTitle = headerTitleProp || (currentUser
    ? `${currentUser.firstName}'s Schedule`
    : 'Universal Master Schedule');
  const headerSub = headerSubtitle || (currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : 'Professional session management system');
  const headerImage = headerImageUrl || currentUser?.profileImageUrl;

  return (
    <>
      <HeaderContainer>
        <FlexBox align="center" gap="1rem">
          {headerImage ? (
            <HeaderAvatar src={headerImage} alt={headerSub} />
          ) : (
            <Calendar size={32} color="var(--accent-primary, #60C0F0)" />
          )}
          <Box>
            <PageTitle className="lens2-display">{headerTitle}</PageTitle>
            <HeaderSubtitleText secondary>
              {headerSub}
            </HeaderSubtitleText>
          </Box>
        </FlexBox>

        <HeaderActions>
          {/* MindBody Parity: Admin View Scope Toggle */}
          {mode === 'admin' && onAdminViewScopeChange && (
            <AdminScopeToggle>
              <ScopeButton
                $active={adminViewScope === 'my'}
                onClick={() => onAdminViewScopeChange('my')}
                title="View only your schedule"
              >
                <User size={14} />
                My Schedule
              </ScopeButton>
              <ScopeButton
                $active={adminViewScope === 'global'}
                onClick={() => onAdminViewScopeChange('global')}
                title="View all trainers"
              >
                <Users size={14} />
                All Trainers
              </ScopeButton>
            </AdminScopeToggle>
          )}

          {/* Trainer Filter (admin global view only) */}
          {mode === 'admin' && adminViewScope === 'global' && onTrainerFilterChange && (
            <TrainerSelect
              value={selectedTrainerId?.toString() || ''}
              onChange={(e) => onTrainerFilterChange(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">All Trainers</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id.toString()}>
                  {trainer.firstName} {trainer.lastName}
                </option>
              ))}
            </TrainerSelect>
          )}

          {/* Layout & Density toggles (Day view only) */}
          {activeView === 'day' && onLayoutModeChange && (
            <LayoutDensityBar>
              <ToggleGroup aria-label="Layout mode">
                <ToggleButton
                  $active={layoutMode === 'columns'}
                  onClick={() => onLayoutModeChange('columns')}
                  title="Column layout"
                  aria-label="Column layout"
                >
                  <Columns size={14} />
                </ToggleButton>
                <ToggleButton
                  $active={layoutMode === 'stacked'}
                  onClick={() => onLayoutModeChange('stacked')}
                  title="Stacked layout"
                  aria-label="Stacked layout"
                >
                  <Rows size={14} />
                </ToggleButton>
              </ToggleGroup>
              {onDensityChange && (
                <ToggleGroup aria-label="Density mode">
                  <ToggleButton
                    $active={density === 'comfortable'}
                    onClick={() => onDensityChange('comfortable')}
                    title="Comfortable density"
                    aria-label="Comfortable density"
                  >
                    <Maximize size={14} />
                  </ToggleButton>
                  <ToggleButton
                    $active={density === 'compact'}
                    onClick={() => onDensityChange('compact')}
                    title="Compact density"
                    aria-label="Compact density"
                  >
                    <Minimize size={14} />
                  </ToggleButton>
                </ToggleGroup>
              )}
            </LayoutDensityBar>
          )}

          <StyledIconButton
            onClick={onRefresh}
            aria-label="Refresh sessions"
            size="medium"
          >
            <RefreshCw size={20} />
          </StyledIconButton>
          {mode === 'client' && onOpenClientRecurring && (
            <ForgeButton
              variant="primary"
              size="medium"
              onClick={onOpenClientRecurring}
              title="Book Recurring Sessions"
              leftIcon={<Repeat size={16} />}
            >
              Book Recurring
            </ForgeButton>
          )}
          {(canCreateSessions || canCreateRecurring || canBlockTime) && (
            <Dropdown
              align="right"
              ariaLabel="Create schedule actions"
              trigger={(
                <ForgeButton
                  variant="primary"
                  size="medium"
                  title="Create Session (N)"
                  rightIcon={<ChevronDown size={16} />}
                >
                  Create
                </ForgeButton>
              )}
            >
              {canCreateSessions && (
                <MenuItemButton onClick={onOpenCreate}>
                  <Plus size={16} />
                  Create Session
                </MenuItemButton>
              )}
              {canCreateRecurring && (
                <MenuItemButton onClick={onOpenRecurring}>
                  <Calendar size={16} />
                  Create Recurring
                </MenuItemButton>
              )}
              {canBlockTime && (
                <MenuItemButton onClick={onOpenBlocked}>
                  <Clock size={16} />
                  Block Time
                </MenuItemButton>
              )}
            </Dropdown>
          )}

          {(canManageAvailability || canCreateSessions || canManageSessionTypes) && (
            <Dropdown
              align="right"
              ariaLabel="Manage schedule actions"
              trigger={(
                <OutlinedButton>
                  Manage
                  <ChevronDown size={16} />
                </OutlinedButton>
              )}
            >
              {canManageAvailability && (
                <MenuItemButton onClick={onOpenAvailability}>
                  <Calendar size={16} />
                  Manage Availability
                </MenuItemButton>
              )}
              <MenuItemButton onClick={onOpenNotifications}>
                <Bell size={16} />
                Notification Settings
              </MenuItemButton>
              {canManageSessionTypes && (
                <MenuItemButton onClick={onOpenSessionTypes}>
                  <Settings size={16} />
                  Session Types
                </MenuItemButton>
              )}
              {canCreateSessions && (
                <MenuItemButton onClick={onOpenPayment}>
                  Apply Payment
                </MenuItemButton>
              )}
            </Dropdown>
          )}
        </HeaderActions>
      </HeaderContainer>

      <ViewSelector
        activeView={activeView}
        onViewChange={onViewChange}
        currentDate={currentDate}
        onDateChange={onDateChange}
      />
    </>
  );
};

export default ScheduleHeader;
