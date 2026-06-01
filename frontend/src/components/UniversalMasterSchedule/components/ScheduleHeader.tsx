import React from 'react';
import styled from 'styled-components';
import { Calendar, RefreshCw, Bell, Plus, Clock, ChevronDown, Settings, Repeat, Users, User, Columns, Rows, Maximize, Minimize } from 'lucide-react';
import {
  FlexBox,
  Box,
  PageTitle,
  SmallText,
  IconButton as StyledIconButton,
  OutlinedButton,
} from '../ui';
import GlowButton from '../../ui/buttons/GlowButton';
import ViewSelector from '../Views/ViewSelector';
import { CalendarView } from '../types';
import type { LayoutMode, DensityMode } from '../types';
import Dropdown from '../../common/Dropdown/Dropdown';

// Admin View Scope Options (MindBody Parity)
export type AdminViewScope = 'my' | 'global';

interface ScheduleHeaderProps {
  mode: 'admin' | 'trainer' | 'client';
  activeView: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onRefresh: () => void;
  onOpenNotifications: () => void;
  onOpenAvailability: () => void;
  onOpenBlocked: () => void;
  onOpenRecurring: () => void;
  onOpenPayment: () => void;
  onOpenCreate: () => void;
  onOpenSessionTypes: () => void;
  onOpenClientRecurring?: () => void;
  canManageAvailability: boolean;
  canBlockTime: boolean;
  canCreateRecurring: boolean;
  canCreateSessions: boolean;
  canManageSessionTypes: boolean;
  // MindBody Parity: Admin view scope toggle
  adminViewScope?: AdminViewScope;
  onAdminViewScopeChange?: (scope: AdminViewScope) => void;
  // Trainer filter for admin global view
  trainers?: Array<{ id: number | string; firstName: string; lastName: string }>;
  selectedTrainerId?: number | string | null;
  onTrainerFilterChange?: (trainerId: number | string | null) => void;
  // Layout & Density toggles (MindBody stacked view)
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  density?: DensityMode;
  onDensityChange?: (density: DensityMode) => void;
  // User identity for personalized header
  currentUser?: { firstName: string; lastName: string; profileImageUrl?: string };
  headerTitle?: string;
  headerSubtitle?: string;
  headerImageUrl?: string;
}

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
            <img
              src={headerImage}
              alt={headerSub}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)' }}
            />
          ) : (
            <Calendar size={32} color="var(--accent-primary, #60C0F0)" />
          )}
          <Box>
            <PageTitle>{headerTitle}</PageTitle>
            <SmallText secondary style={{ marginTop: '0.25rem' }}>
              {headerSub}
            </SmallText>
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
            <GlowButton
              variant="primary"
              size="medium"
              onClick={onOpenClientRecurring}
              title="Book Recurring Sessions"
              leftIcon={<Repeat size={16} />}
            >
              Book Recurring
            </GlowButton>
          )}
          {(canCreateSessions || canCreateRecurring || canBlockTime) && (
            <Dropdown
              align="right"
              ariaLabel="Create schedule actions"
              trigger={(
                <GlowButton
                  variant="primary"
                  size="medium"
                  title="Create Session (N)"
                  rightIcon={<ChevronDown size={16} />}
                >
                  Create
                </GlowButton>
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

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent),
      color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent)
    );
  backdrop-filter: blur(10px);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  flex-shrink: 0;
  gap: 1rem;
  /* Ensure dropdowns render above ViewSelector below */
  position: relative;
  z-index: 10;

  @media (max-width: 1024px) {
    padding: 1.25rem 1.5rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 1rem;
    /* Disable backdrop-filter on mobile for better scroll performance */
    backdrop-filter: none;
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, var(--bg-surface, #1A1A24) 12%);
  }

  @media (max-width: 430px) {
    padding: 0.75rem 0.5rem;
    gap: 0.75rem;
  }

  @media (max-width: 375px) {
    padding: 0.625rem 0.375rem;
    gap: 0.625rem;
  }

  @media (max-width: 320px) {
    padding: 0.5rem 0.25rem;
    gap: 0.5rem;
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    padding: 2rem 2.5rem;
    gap: 1.5rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 2.5rem 3rem;
    gap: 2rem;
    font-size: 1.25rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 1024px) {
    gap: 0.375rem;
  }

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;

    button {
      width: 100%;
      justify-content: center;
      font-size: 0.75rem;
      padding: 0.55rem 0.6rem;
      min-height: 44px;
    }
  }

  @media (max-width: 375px) {
    grid-template-columns: 1fr;
    gap: 0.375rem;

    button {
      font-size: 0.7rem;
      padding: 0.5rem;
    }
  }

  @media (max-width: 320px) {
    gap: 0.25rem;

    button {
      min-height: 40px;
      font-size: 0.68rem;
      padding: 0.4rem;
    }
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    gap: 0.75rem;
  }

  @media (min-width: 3840px) {
    gap: 1rem;

    button {
      font-size: 1rem;
      padding: 0.7rem 1.2rem;
    }
  }
`;

const MenuItemButton = styled(OutlinedButton)`
  width: 100%;
  justify-content: flex-start;
  font-size: 0.85rem;
  padding: 0.55rem 0.75rem;
  min-height: 44px;
`;

// MindBody Parity: Admin View Scope Toggle Styles
const AdminScopeToggle = styled.div`
  display: flex;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border-radius: 8px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
    justify-content: center;
  }
`;

const ScopeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  white-space: nowrap;

  ${({ $active }) =>
    $active
      ? `
        background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 100%);
        color: var(--text-inverse, #0F172A);
        box-shadow: 0 2px 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
      `
      : `
        background: transparent;
        color: var(--text-secondary, rgba(224, 236, 244, 0.65));
        &:hover {
          background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
          color: var(--text-primary, #E0ECF4);
        }
      `}

  @media (max-width: 480px) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
    flex: 1;
    justify-content: center;
  }
`;

// Layout & Density Toggle Styles
const LayoutDensityBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
    justify-content: center;
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border-radius: 6px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $active }) =>
    $active
      ? `
        background: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
        color: var(--accent-primary, #60C0F0);
      `
      : `
        background: transparent;
        color: var(--text-muted, rgba(224, 236, 244, 0.4));
        &:hover {
          background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
          color: var(--text-primary, #E0ECF4);
        }
      `}

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`;

const TrainerSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 74%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  option {
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
  }

  @media (max-width: 480px) {
    grid-column: span 2;
    width: 100%;
  }
`;
