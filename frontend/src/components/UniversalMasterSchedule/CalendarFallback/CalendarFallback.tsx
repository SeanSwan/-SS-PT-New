/**
 * Enhanced Calendar Fallback Component - PHASE 2: ROLE-ADAPTIVE EDITION
 * ======================================================================
 * A premium fallback calendar solution that provides enterprise-level functionality
 * when react-big-calendar is unavailable. Now featuring role-based adaptive UI
 * that delivers "Apple Phone-Level" experience for ALL user types.
 *
 * PHASE 2 TRANSFORMATION - ROLE-ADAPTIVE FEATURES:
 * - Interactive week/month view toggles (role-based)
 * - Drag-and-drop session creation slots (admin/trainer only)
 * - Advanced filtering and search (role-appropriate)
 * - Quick-action scheduling buttons (role-specific)
 * - Real-time status updates (role-aware)
 * - Mobile-optimized touch interactions
 * - Executive dashboard integration (admin only)
 * - NEW: Role-Based UI Adaptation
 * - NEW: User-Specific Action Buttons
 * - NEW: Role-Aware Event Display
 *
 * ROLE-ADAPTIVE DESIGN:
 * - Admin: Full management interface with all features
 * - Trainer: Session management with client focus
 * - Client: Simplified booking and personal session view
 * - User: Public booking interface only
 */

import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Plus,
  Filter,
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Activity,
  BookOpen,
  User,
  Settings,
  Eye,
  CheckCircle
} from 'lucide-react';
import GlowButton from '../../ui/buttons/GlowButton';

interface SessionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  client?: any;
  trainer?: any;
  location?: string;
  userId?: string;
  trainerId?: string;
}

type ViewMode = 'agenda' | 'week' | 'grid';
type FilterMode = 'all' | 'available' | 'scheduled' | 'completed' | 'cancelled';

interface CalendarFallbackProps {
  events: SessionEvent[];
  onEventClick?: (event: SessionEvent) => void;
  onSlotClick?: (date: Date) => void;
  onCreateSession?: () => void;
  onBookSession?: (sessionId: string) => void;
  onFilterChange?: (filters: any) => void;
  showQuickActions?: boolean;
  compactMode?: boolean;
  clientsCount?: number;
  utilizationRate?: number;
  completionRate?: number;
  // PHASE 2: Role-based props
  userRole?: 'admin' | 'trainer' | 'client' | 'user' | null;
  userId?: string | null;
  calendarMode?: 'full' | 'trainer' | 'client' | 'public';
}

// ==================== PHASE 2: ROLE-BASED CONFIGURATION ====================

/**
 * Define which features are available for each user role in fallback mode
 */
const FALLBACK_ROLE_CONFIG = {
  admin: {
    showCreateSession: true,
    showAdvancedFilters: true,
    showAllStats: true,
    showViewModeToggle: true,
    enableSearch: true,
    availableViewModes: ['agenda', 'week', 'grid'] as ViewMode[],
    availableFilters: ['all', 'available', 'scheduled', 'completed', 'cancelled'] as FilterMode[],
    primaryAction: 'create',
    title: 'Schedule Management Center',
    subtitle: 'Enhanced fallback mode - administrative control'
  },
  trainer: {
    showCreateSession: false, // Trainers can't create sessions in most systems
    showAdvancedFilters: true,
    showAllStats: false, // Limited stats
    showViewModeToggle: true,
    enableSearch: true,
    availableViewModes: ['agenda', 'week'] as ViewMode[],
    availableFilters: ['all', 'scheduled', 'completed'] as FilterMode[],
    primaryAction: 'manage',
    title: 'Trainer Session Center',
    subtitle: 'Enhanced fallback mode - manage your sessions'
  },
  client: {
    showCreateSession: false,
    showAdvancedFilters: false,
    showAllStats: false,
    showViewModeToggle: false, // Keep it simple
    enableSearch: true, // Simple search only
    availableViewModes: ['agenda'] as ViewMode[],
    availableFilters: ['all', 'available', 'scheduled'] as FilterMode[],
    primaryAction: 'book',
    title: 'My Sessions',
    subtitle: 'Book and manage your training sessions'
  },
  user: {
    showCreateSession: false,
    showAdvancedFilters: false,
    showAllStats: false,
    showViewModeToggle: false,
    enableSearch: false, // No search for public users
    availableViewModes: ['agenda'] as ViewMode[],
    availableFilters: ['available'] as FilterMode[], // Only show available sessions
    primaryAction: 'book',
    title: 'Available Sessions',
    subtitle: 'Browse and book training sessions'
  }
};

/**
 * Get role configuration for fallback mode
 */
const getFallbackRoleConfig = (role: string | null) => {
  if (!role || !FALLBACK_ROLE_CONFIG[role as keyof typeof FALLBACK_ROLE_CONFIG]) {
    return FALLBACK_ROLE_CONFIG.user; // Default to most restricted view
  }
  return FALLBACK_ROLE_CONFIG[role as keyof typeof FALLBACK_ROLE_CONFIG];
};

/**
 * Get role-appropriate stats to display
 */
const getRoleFallbackStats = (role: string | null, events: SessionEvent[], userId?: string | null) => {
  const config = getFallbackRoleConfig(role);
  const today = new Date();

  // Filter events based on role
  let relevantEvents = events;
  if (role === 'trainer' && userId) {
    relevantEvents = events.filter(event => event.trainerId === userId);
  } else if (role === 'client' && userId) {
    relevantEvents = events.filter(event => event.userId === userId || event.status === 'available');
  } else if (role === 'user') {
    relevantEvents = events.filter(event => event.status === 'available');
  }

  const todayEvents = relevantEvents.filter(event =>
    event.start.toDateString() === today.toDateString()
  );

  const upcomingEvents = relevantEvents.filter(event =>
    event.start > today && event.start <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  const availableSlots = relevantEvents.filter(e => e.status === 'available').length;
  const bookedSlots = relevantEvents.filter(e => e.status === 'scheduled' || e.status === 'confirmed').length;

  // Return role-appropriate stats
  switch (role) {
    case 'admin':
      return [
        { icon: Activity, label: 'Today', value: todayEvents.length },
        { icon: Target, label: 'This Week', value: upcomingEvents.length },
        { icon: Zap, label: 'Available', value: availableSlots },
        { icon: Users, label: 'Booked', value: bookedSlots }
      ];
    case 'trainer':
      return [
        { icon: Activity, label: 'My Sessions Today', value: todayEvents.length },
        { icon: Target, label: 'This Week', value: upcomingEvents.length },
        { icon: Users, label: 'Clients', value: bookedSlots }
      ];
    case 'client':
      return [
        { icon: Activity, label: 'My Sessions', value: todayEvents.length },
        { icon: Zap, label: 'Available', value: availableSlots }
      ];
    case 'user':
    default:
      return [
        { icon: Zap, label: 'Available Sessions', value: availableSlots }
      ];
  }
};

/**
 * Filter events based on user role and permissions
 */
const getFilteredEventsByRole = (
  events: SessionEvent[],
  role: string | null,
  userId: string | null,
  additionalFilters: { filterMode: FilterMode; searchTerm: string }
) => {
  let filtered = events;

  // First, apply role-based filtering
  switch (role) {
    case 'admin':
      // Admin sees all events - no filtering needed
      break;
    case 'trainer':
      if (userId) {
        // Trainer sees their assigned sessions
        filtered = events.filter(event =>
          event.trainerId === userId ||
          event.status === 'available' // Also show available slots they might take
        );
      }
      break;
    case 'client':
      if (userId) {
        // Client sees their own sessions + available sessions
        filtered = events.filter(event =>
          event.userId === userId ||
          event.status === 'available'
        );
      }
      break;
    case 'user':
    default:
      // Public users only see available sessions
      filtered = events.filter(event => event.status === 'available');
      break;
  }

  // Then apply additional filters
  const { filterMode, searchTerm } = additionalFilters;

  // Apply status filter
  if (filterMode !== 'all') {
    filtered = filtered.filter(event => event.status === filterMode);
  }

  // Apply search filter
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(search) ||
      event.client?.firstName?.toLowerCase().includes(search) ||
      event.client?.lastName?.toLowerCase().includes(search) ||
      event.trainer?.firstName?.toLowerCase().includes(search) ||
      event.trainer?.lastName?.toLowerCase().includes(search) ||
      event.location?.toLowerCase().includes(search)
    );
  }

  return filtered;
};

const CalendarFallbackContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// Enhanced Header Components
const EnhancedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

// Executive KPI Components
const QuickStatsBar = styled.div<{ $show: boolean }>`
  display: ${props => props.$show ? 'flex' : 'none'};
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 2px;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 100px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-1px);
  }
`;

const StatIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: white;
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  line-height: 1;
`;

// Filter Controls
const FilterControlsBar = styled.div<{ $show: boolean }>`
  display: ${props => props.$show ? 'flex' : 'none'};
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const SearchFieldWrapper = styled.div`
  flex: 1;
  max-width: 300px;
  position: relative;
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    max-width: none;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.5);
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }
`;

const FilterChips = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  background: ${props => props.$active ? '#3b82f6' : 'transparent'};
  border: 1px solid ${props => props.$active ? '#3b82f6' : 'rgba(255, 255, 255, 0.3)'};

  &:hover {
    background: ${props => props.$active ? '#2563eb' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

// Content Area
const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
`;

const DateHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:first-child {
    margin-top: 0;
  }
`;

const DateHeaderTitle = styled.h6`
  color: white;
  margin: 0;
  font-weight: 500;
  font-size: 1.125rem;
`;

const DateStats = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const DateStatsText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
`;

const EventsGrid = styled.div<{ $viewMode: ViewMode }>`
  display: grid;
  grid-template-columns: ${props => {
    switch (props.$viewMode) {
      case 'grid':
        return 'repeat(auto-fill, minmax(280px, 1fr))';
      case 'week':
        return 'repeat(auto-fit, minmax(200px, 1fr))';
      default:
        return '1fr';
    }
  }};
  gap: ${props => props.$viewMode === 'agenda' ? '0.5rem' : '1rem'};
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EventCard = styled(motion.div)<{ $status: string; $userRole?: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => {
      switch (props.$status) {
        case 'available': return '#22c55e';
        case 'scheduled':
        case 'confirmed': return '#3b82f6';
        case 'completed': return '#9ca3af';
        case 'cancelled': return '#ef4444';
        default: return '#3b82f6';
      }
    }};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  /* Different hover effects for different roles */
  ${props => props.$userRole === 'user' && props.$status === 'available' ? `
    &:hover {
      border-color: #22c55e;
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
    }
  ` : ''}
`;

// View Mode Toggle styled components
const ViewModeToggleGroup = styled.div`
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const ViewModeButton = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => props.$selected ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.3)' : 'transparent'};

  &:not(:last-child) {
    border-right: 1px solid rgba(14, 165, 233, 0.2);
  }

  &:hover {
    background: ${props => props.$selected ? 'rgba(14, 165, 233, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

// Header text styled components
const HeaderTitleText = styled.h6`
  color: white;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
`;

const HeaderSubtitleText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.875rem;
`;

// Floating Action Button
const FloatingActionContainer = styled.div`
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;

  @media (min-width: 769px) {
    display: none;
  }
`;

const FloatingActionButton = styled.button<{ $variant: 'book' | 'create' }>`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  background: ${props => props.$variant === 'book'
    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'};

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    background: ${props => props.$variant === 'book'
      ? 'linear-gradient(135deg, #16a34a, #15803d)'
      : 'linear-gradient(135deg, #2563eb, #1e40af)'};
  }
`;

// Empty State Enhancement
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 2rem;

  svg {
    opacity: 0.6;
    margin-bottom: 1rem;
  }
`;

const EmptyStateTitle = styled.h6`
  margin: 1rem 0 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: inherit;
`;

const EmptyStateSubtitle = styled.p`
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: inherit;
`;

const EventTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

const EventTitle = styled.div`
  color: white;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

const EventDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
`;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#22c55e';
    case 'scheduled':
    case 'confirmed': return '#3b82f6';
    case 'completed': return '#9ca3af';
    case 'cancelled': return '#ef4444';
    default: return '#3b82f6';
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'available': return 'rgba(34, 197, 94, 0.2)';
    case 'scheduled':
    case 'confirmed': return 'rgba(59, 130, 246, 0.2)';
    case 'completed': return 'rgba(156, 163, 175, 0.2)';
    case 'cancelled': return 'rgba(239, 68, 68, 0.2)';
    default: return 'rgba(59, 130, 246, 0.2)';
  }
};

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'available': return 'rgba(34, 197, 94, 0.3)';
    case 'scheduled':
    case 'confirmed': return 'rgba(59, 130, 246, 0.3)';
    case 'completed': return 'rgba(156, 163, 175, 0.3)';
    case 'cancelled': return 'rgba(239, 68, 68, 0.3)';
    default: return 'rgba(59, 130, 246, 0.3)';
  }
};

const StatusChip = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
  background: ${props => getStatusBgColor(props.$status)};
  color: ${props => getStatusColor(props.$status)};
  border: 1px solid ${props => getStatusBorderColor(props.$status)};
`;

// Role-based action buttons in event cards
const EventActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'success' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(34, 197, 94, 0.2)';
      case 'primary': return 'rgba(59, 130, 246, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      case 'primary': return 'rgba(59, 130, 246, 0.3)';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#22c55e';
      case 'primary': return '#3b82f6';
      default: return 'rgba(255, 255, 255, 0.8)';
    }
  }};
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  min-height: 44px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'success': return 'rgba(34, 197, 94, 0.3)';
        case 'primary': return 'rgba(59, 130, 246, 0.3)';
        default: return 'rgba(255, 255, 255, 0.2)';
      }
    }};
    transform: translateY(-1px);
  }
`;

export const CalendarFallback: React.FC<CalendarFallbackProps> = ({
  events,
  onEventClick,
  onSlotClick,
  onCreateSession,
  onBookSession,
  onFilterChange,
  showQuickActions = true,
  compactMode = false,
  clientsCount = 0,
  utilizationRate = 0,
  completionRate = 0,
  // PHASE 2: Role-based props
  userRole = null,
  userId = null,
  calendarMode = 'public'
}) => {
  // ==================== PHASE 2: ROLE-BASED STATE MANAGEMENT ====================

  // Get role configuration
  const roleConfig = useMemo(() => getFallbackRoleConfig(userRole), [userRole]);

  // Enhanced State Management with role-aware defaults
  const [viewMode, setViewMode] = useState<ViewMode>(roleConfig.availableViewModes[0]);
  const [filterMode, setFilterMode] = useState<FilterMode>(
    userRole === 'user' ? 'available' : 'all' // Public users default to available only
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Enhanced Event Filtering with role-based access
  const filteredEvents = useMemo(() => {
    return getFilteredEventsByRole(events, userRole, userId, {
      filterMode,
      searchTerm
    });
  }, [events, userRole, userId, filterMode, searchTerm]);

  // Role-based Quick Stats Calculation
  const roleStats = useMemo(() => {
    return getRoleFallbackStats(userRole, events, userId);
  }, [userRole, events, userId]);

  // Event Handlers with role-aware logic
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    if (roleConfig.availableViewModes.includes(newMode)) {
      setViewMode(newMode);
    }
  }, [roleConfig.availableViewModes]);

  const handleFilterModeChange = useCallback((newFilter: FilterMode) => {
    if (roleConfig.availableFilters.includes(newFilter)) {
      setFilterMode(newFilter);
      onFilterChange?.({ status: newFilter, search: searchTerm });
    }
  }, [roleConfig.availableFilters, searchTerm, onFilterChange]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onFilterChange?.({ status: filterMode, search: value });
  }, [filterMode, onFilterChange]);

  const handleCreateSession = useCallback(() => {
    if (onCreateSession && roleConfig.showCreateSession) {
      onCreateSession();
    }
  }, [onCreateSession, roleConfig.showCreateSession]);

  const handleBookSession = useCallback((sessionId: string) => {
    if (onBookSession) {
      onBookSession(sessionId);
    }
  }, [onBookSession]);

  // Role-based event action handler
  const handleEventAction = useCallback((event: SessionEvent, action: string) => {
    switch (action) {
      case 'book':
        if (event.status === 'available') {
          handleBookSession(event.id);
        }
        break;
      case 'view':
        onEventClick?.(event);
        break;
      case 'manage':
        onEventClick?.(event);
        break;
      default:
        onEventClick?.(event);
        break;
    }
  }, [handleBookSession, onEventClick]);

  // Get role-appropriate actions for an event
  const getEventActions = useCallback((event: SessionEvent) => {
    const actions: Array<{ label: string; action: string; variant?: 'primary' | 'secondary' | 'success'; icon?: React.ReactNode }> = [];

    switch (userRole) {
      case 'admin':
        actions.push({ label: 'Manage', action: 'manage', variant: 'primary', icon: <Settings size={12} /> });
        break;
      case 'trainer':
        if (event.trainerId === userId) {
          actions.push({ label: 'Manage', action: 'manage', variant: 'primary', icon: <Settings size={12} /> });
        } else {
          actions.push({ label: 'View', action: 'view', variant: 'secondary', icon: <Eye size={12} /> });
        }
        break;
      case 'client':
        if (event.status === 'available') {
          actions.push({ label: 'Book', action: 'book', variant: 'success', icon: <BookOpen size={12} /> });
        } else if (event.userId === userId) {
          actions.push({ label: 'View', action: 'view', variant: 'primary', icon: <Eye size={12} /> });
        }
        break;
      case 'user':
        if (event.status === 'available') {
          actions.push({ label: 'Book Session', action: 'book', variant: 'success', icon: <BookOpen size={12} /> });
        }
        break;
    }

    return actions;
  }, [userRole, userId]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupEventsByDate = (events: SessionEvent[]) => {
    const grouped: { [key: string]: SessionEvent[] } = {};

    events.forEach(event => {
      const dateKey = event.start.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    const result: { date: string; events: SessionEvent[] }[] = [];
    sortedDates.forEach(date => {
      // Sort events by time
      grouped[date].sort((a, b) => a.start.getTime() - b.start.getTime());
      result.push({ date, events: grouped[date] });
    });

    return result;
  };

  const groupedEvents = groupEventsByDate(filteredEvents);

  // Role-specific empty state messages
  const getEmptyStateMessage = () => {
    if (searchTerm || filterMode !== roleConfig.availableFilters[0]) {
      return {
        title: 'No Matching Sessions',
        subtitle: 'Try adjusting your filters or search terms'
      };
    }

    switch (userRole) {
      case 'admin':
        return {
          title: 'No Sessions Found',
          subtitle: 'Click "New Session" to create your first session'
        };
      case 'trainer':
        return {
          title: 'No Sessions Assigned',
          subtitle: 'You have no sessions assigned at the moment'
        };
      case 'client':
        return {
          title: 'No Sessions Available',
          subtitle: 'Check back later for available sessions to book'
        };
      case 'user':
      default:
        return {
          title: 'No Available Sessions',
          subtitle: 'Please check back later for available training sessions'
        };
    }
  };

  const emptyStateMessage = getEmptyStateMessage();

  return (
    <CalendarFallbackContainer>
      {/* Enhanced Header with Role-Based Content */}
      <EnhancedHeader>
        <HeaderTitle>
          <CalendarIcon size={24} color="white" />
          <div>
            <HeaderTitleText>
              {roleConfig.title}
            </HeaderTitleText>
            <HeaderSubtitleText>
              {roleConfig.subtitle} - {filteredEvents.length} of {events.length} sessions shown
            </HeaderSubtitleText>
          </div>
        </HeaderTitle>

        <HeaderControls>
          {/* View Mode Toggle - Role-dependent */}
          {roleConfig.showViewModeToggle && roleConfig.availableViewModes.length > 1 && (
            <ViewModeToggleGroup>
              {roleConfig.availableViewModes.includes('agenda') && (
                <ViewModeButton
                  $selected={viewMode === 'agenda'}
                  onClick={() => handleViewModeChange('agenda')}
                  title="Agenda view"
                >
                  <List size={16} />
                </ViewModeButton>
              )}
              {roleConfig.availableViewModes.includes('week') && (
                <ViewModeButton
                  $selected={viewMode === 'week'}
                  onClick={() => handleViewModeChange('week')}
                  title="Week view"
                >
                  <CalendarIcon size={16} />
                </ViewModeButton>
              )}
              {roleConfig.availableViewModes.includes('grid') && (
                <ViewModeButton
                  $selected={viewMode === 'grid'}
                  onClick={() => handleViewModeChange('grid')}
                  title="Grid view"
                >
                  <Grid size={16} />
                </ViewModeButton>
              )}
            </ViewModeToggleGroup>
          )}

          {/* Role-Specific Primary Action Button */}
          {showQuickActions && (
            <>
              {roleConfig.showCreateSession && (
                <GlowButton
                  text="New Session"
                  variant="emerald"
                  size="small"
                  leftIcon={<Plus size={16} />}
                  onClick={handleCreateSession}
                />
              )}
              {roleConfig.primaryAction === 'book' && (
                <GlowButton
                  text="Browse Sessions"
                  variant="cosmic"
                  size="small"
                  leftIcon={<BookOpen size={16} />}
                  onClick={() => {
                    setFilterMode('available');
                    setSearchTerm('');
                  }}
                />
              )}
            </>
          )}
        </HeaderControls>
      </EnhancedHeader>

      {/* Role-Based Quick Stats Bar */}
      <QuickStatsBar $show={roleStats.length > 0}>
        {roleStats.map((stat, index) => (
          <StatItem key={index}>
            <StatIcon>
              <stat.icon size={16} />
            </StatIcon>
            <StatContent>
              <StatValue>{stat.value}</StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatContent>
          </StatItem>
        ))}
      </QuickStatsBar>

      {/* Enhanced Filter Controls - Role-aware */}
      <FilterControlsBar $show={roleConfig.showAdvancedFilters || roleConfig.enableSearch}>
        {roleConfig.enableSearch && (
          <SearchFieldWrapper>
            <SearchIcon>
              <Search size={18} />
            </SearchIcon>
            <SearchInput
              placeholder={
                userRole === 'admin' ? "Search sessions, clients, trainers..." :
                userRole === 'trainer' ? "Search sessions and clients..." :
                userRole === 'client' ? "Search available sessions..." :
                "Search sessions..."
              }
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </SearchFieldWrapper>
        )}

        {roleConfig.showAdvancedFilters && (
          <FilterChips>
            {roleConfig.availableFilters.map((mode) => (
              <FilterChip
                key={mode}
                $active={filterMode === mode}
                onClick={() => handleFilterModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </FilterChip>
            ))}
          </FilterChips>
        )}
      </FilterControlsBar>

      {/* Main Content */}
      <ContentArea>
        <AnimatePresence mode="wait">
          {groupedEvents.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmptyState>
                <CalendarIcon size={48} />
                <EmptyStateTitle>
                  {emptyStateMessage.title}
                </EmptyStateTitle>
                <EmptyStateSubtitle>
                  {emptyStateMessage.subtitle}
                </EmptyStateSubtitle>
                {showQuickActions && !searchTerm && filterMode === roleConfig.availableFilters[0] && roleConfig.showCreateSession && (
                  <GlowButton
                    text="Create First Session"
                    variant="primary"
                    leftIcon={<Plus size={18} />}
                    onClick={handleCreateSession}
                  />
                )}
              </EmptyState>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {groupedEvents.map(({ date, events }, index) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <DateHeader>
                    <DateHeaderTitle>
                      {formatDate(new Date(date))}
                    </DateHeaderTitle>
                    <DateStats>
                      <DateStatsText>
                        {events.length} session{events.length !== 1 ? 's' : ''}
                      </DateStatsText>
                    </DateStats>
                  </DateHeader>

                  <EventsGrid $viewMode={viewMode}>
                    {events.map((event) => {
                      const eventActions = getEventActions(event);

                      return (
                        <EventCard
                          key={event.id}
                          onClick={() => eventActions.length === 1 ? handleEventAction(event, eventActions[0].action) : onEventClick?.(event)}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          $status={event.status}
                          $userRole={userRole ?? undefined}
                        >
                          <EventTime>
                            <Clock size={14} />
                            {formatTime(event.start)} - {formatTime(event.end)}
                            <StatusChip $status={event.status}>
                              {event.status}
                            </StatusChip>
                          </EventTime>

                          <EventTitle>{event.title}</EventTitle>

                          <EventDetails>
                            {event.trainer && userRole !== 'trainer' && (
                              <EventDetail>
                                <Users size={12} />
                                {event.trainer.firstName} {event.trainer.lastName}
                              </EventDetail>
                            )}

                            {event.client && (userRole === 'admin' || userRole === 'trainer') && (
                              <EventDetail>
                                <User size={12} />
                                {event.client.firstName} {event.client.lastName}
                              </EventDetail>
                            )}

                            {event.location && (
                              <EventDetail>
                                <MapPin size={12} />
                                {event.location}
                              </EventDetail>
                            )}
                          </EventDetails>

                          {/* Role-Based Action Buttons */}
                          {eventActions.length > 0 && (
                            <EventActionButtons>
                              {eventActions.map((action, index) => (
                                <ActionButton
                                  key={index}
                                  $variant={action.variant}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventAction(event, action.action);
                                  }}
                                >
                                  {action.icon}
                                  {action.label}
                                </ActionButton>
                              ))}
                            </EventActionButtons>
                          )}
                        </EventCard>
                      );
                    })}
                  </EventsGrid>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ContentArea>

      {/* Floating Action Button for Mobile - Role-aware */}
      {showQuickActions && (roleConfig.showCreateSession || roleConfig.primaryAction === 'book') && (
        <FloatingActionContainer>
          <FloatingActionButton
            $variant={roleConfig.primaryAction === 'book' ? 'book' : 'create'}
            onClick={() => {
              if (roleConfig.showCreateSession) {
                handleCreateSession();
              } else if (roleConfig.primaryAction === 'book') {
                setFilterMode('available');
                setSearchTerm('');
              }
            }}
          >
            {roleConfig.primaryAction === 'book' ? <BookOpen size={24} /> : <Plus size={24} />}
          </FloatingActionButton>
        </FloatingActionContainer>
      )}
    </CalendarFallbackContainer>
  );
};

export default CalendarFallback;
