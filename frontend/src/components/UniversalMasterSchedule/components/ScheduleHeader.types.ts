import type { CalendarView, DensityMode, LayoutMode } from '../types';

export type AdminViewScope = 'my' | 'global';

export interface ScheduleHeaderProps {
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
  adminViewScope?: AdminViewScope;
  onAdminViewScopeChange?: (scope: AdminViewScope) => void;
  trainers?: Array<{ id: number | string; firstName: string; lastName: string }>;
  selectedTrainerId?: number | string | null;
  onTrainerFilterChange?: (trainerId: number | string | null) => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  density?: DensityMode;
  onDensityChange?: (density: DensityMode) => void;
  currentUser?: { firstName: string; lastName: string; profileImageUrl?: string };
  headerTitle?: string;
  headerSubtitle?: string;
  headerImageUrl?: string;
}
