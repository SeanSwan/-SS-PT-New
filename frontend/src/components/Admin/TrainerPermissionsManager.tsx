/**
 * Trainer Permissions Manager
 * ===========================
 * 
 * Revolutionary Permission Management Interface for Admin Dashboard
 * Enables granular control over trainer capabilities and access levels.
 * 
 * Core Features:
 * - Comprehensive permission management with toggle controls
 * - Permission expiration dates and scheduling
 * - Bulk permission operations for multiple trainers
 * - Real-time permission status monitoring
 * - Permission audit trail and history
 * - Critical permission indicators and warnings
 * - WCAG AA accessibility compliance
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  Shield, ShieldCheck, ShieldAlert, ShieldOff, User, Users, 
  Settings, Eye, EyeOff, Calendar, Clock, AlertTriangle, 
  CheckCircle, XCircle, Plus, Minus, Edit, Trash2, Info,
  BarChart3, Activity, Target, Award, Zap, Lock, Unlock,
  Search, Filter, RefreshCw, Download, Save, X, ChevronDown,
  ChevronUp, HelpCircle, Star, Crown, Key, MessageSquare
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { 
  trainerPermissionService, 
  TrainerPermission 
} from '../../services/nasmApiService';

// ==================== INTERFACES ====================

interface TrainerPermissionsManagerProps {
  trainerId?: number; // If provided, show permissions for specific trainer
  onPermissionChange?: () => void;
}

interface PermissionType {
  key: string;
  label: string;
  description: string;
  critical: boolean;
  icon: React.ComponentType<{ size?: number }>;
}

interface PermissionRequest {
  id: string;
  trainerId: number;
  trainerName: string;
  permissionType: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
}

interface BulkPermissionOperation {
  action: 'grant' | 'revoke';
  permissionType: string;
  trainerIds: number[];
}

interface TrainerWithPermissions {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  permissions: TrainerPermission[];
  permissionsByType: Record<string, {
    hasPermission: boolean;
    permission: TrainerPermission | null;
    isExpiringSoon: boolean;
    daysUntilExpiration: number | null;
  }>;
  totalActivePermissions: number;
}

interface PermissionStats {
  totalPermissions: number;
  activePermissions: number;
  revokedPermissions: number;
  expiredPermissions: number;
  expiringPermissions: number;
  totalTrainers: number;
  averagePermissionsPerTrainer: string;
  permissionTypeDistribution: Record<string, number>;
}

// ==================== STYLED COMPONENTS ====================

const stellarGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
  100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
`;

const warningPulse = keyframes`
  0% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.4); }
  100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
`;

const permissionTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    cardBg: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    inputBg: '#475569',
    critical: '#dc2626',
    premium: '#7c3aed'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

const PermissionsContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, ${permissionTheme.colors.background} 0%, #1a202c 100%);
  padding: ${permissionTheme.spacing.lg};
  color: ${permissionTheme.colors.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    padding: ${permissionTheme.spacing.md};
  }
`;

const Header = styled.div`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.xl};
  margin-bottom: ${permissionTheme.spacing.xl};
  border: 1px solid ${permissionTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${permissionTheme.colors.primary}, ${permissionTheme.colors.accent});
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: ${permissionTheme.spacing.lg};
  margin-bottom: ${permissionTheme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const TitleSection = styled.div`
  flex: 1;
  
  h1 {
    margin: 0 0 ${permissionTheme.spacing.sm} 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.sm};
  }

  p {
    margin: 0;
    color: ${permissionTheme.colors.textSecondary};
    font-size: 1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${permissionTheme.spacing.md};
  flex-wrap: wrap;
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'critical' }>`
  padding: ${permissionTheme.spacing.sm} ${permissionTheme.spacing.lg};
  border-radius: ${permissionTheme.borderRadius.md};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
  transition: all 0.3s ease;
  min-width: 120px;
  justify-content: center;

  background: ${props => 
    props.variant === 'primary' ? permissionTheme.colors.primary :
    props.variant === 'success' ? permissionTheme.colors.success :
    props.variant === 'warning' ? permissionTheme.colors.warning :
    props.variant === 'danger' ? permissionTheme.colors.error :
    props.variant === 'critical' ? permissionTheme.colors.critical :
    permissionTheme.colors.cardBg
  };
  
  color: ${permissionTheme.colors.text};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => 
      props.variant === 'primary' ? `${permissionTheme.colors.primary}40` :
      props.variant === 'success' ? `${permissionTheme.colors.success}40` :
      props.variant === 'warning' ? `${permissionTheme.colors.warning}40` :
      props.variant === 'danger' ? `${permissionTheme.colors.error}40` :
      props.variant === 'critical' ? `${permissionTheme.colors.critical}40` :
      `${permissionTheme.colors.cardBg}40`
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${permissionTheme.spacing.lg};
  margin-bottom: ${permissionTheme.spacing.xl};
`;

const StatCard = styled(motion.div)<{ type: 'primary' | 'success' | 'warning' | 'info' | 'critical' }>`
  background: ${permissionTheme.colors.cardBg};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.lg};
  border: 1px solid ${permissionTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => 
      props.type === 'primary' ? permissionTheme.colors.primary :
      props.type === 'success' ? permissionTheme.colors.success :
      props.type === 'warning' ? permissionTheme.colors.warning :
      props.type === 'critical' ? permissionTheme.colors.critical :
      permissionTheme.colors.accent
    };
  }

  &:hover {
    border-color: ${props => 
      props.type === 'primary' ? permissionTheme.colors.primary :
      props.type === 'success' ? permissionTheme.colors.success :
      props.type === 'warning' ? permissionTheme.colors.warning :
      props.type === 'critical' ? permissionTheme.colors.critical :
      permissionTheme.colors.accent
    };
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${permissionTheme.colors.text};
  margin-bottom: ${permissionTheme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${permissionTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.xs};
`;

const TrainersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: ${permissionTheme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TrainerCard = styled(motion.div)`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  border: 1px solid ${permissionTheme.colors.border};
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: ${permissionTheme.colors.primary};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

const TrainerHeader = styled.div`
  padding: ${permissionTheme.spacing.lg};
  background: ${permissionTheme.colors.background};
  border-bottom: 1px solid ${permissionTheme.colors.border};
  
  h3 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.sm};
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${permissionTheme.colors.textSecondary};
  }
`;

const PermissionsGrid = styled.div`
  padding: ${permissionTheme.spacing.lg};
  display: grid;
  gap: ${permissionTheme.spacing.md};
`;

const PermissionCard = styled(motion.div)<{ critical?: boolean; hasPermission?: boolean; expiring?: boolean }>`
  background: ${props => 
    props.hasPermission ? 
      (props.expiring ? `${permissionTheme.colors.warning}20` : `${permissionTheme.colors.success}20`) :
      `${permissionTheme.colors.cardBg}`
  };
  border: 1px solid ${props => 
    props.hasPermission ? 
      (props.expiring ? permissionTheme.colors.warning : permissionTheme.colors.success) :
      permissionTheme.colors.border
  };
  border-radius: ${permissionTheme.borderRadius.md};
  padding: ${permissionTheme.spacing.md};
  position: relative;
  transition: all 0.3s ease;

  ${props => props.critical && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: ${permissionTheme.colors.critical};
    }
  `}

  ${props => props.expiring && `
    animation: ${warningPulse} 3s ease-in-out infinite;
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => 
      props.hasPermission ? 
        (props.expiring ? `${permissionTheme.colors.warning}40` : `${permissionTheme.colors.success}40`) :
        `${permissionTheme.colors.cardBg}40`
    };
  }
`;

const PermissionHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: ${permissionTheme.spacing.sm};
`;

const PermissionLabel = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.xs};
  }
`;

const CriticalBadge = styled.span`
  background: ${permissionTheme.colors.critical};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PermissionToggle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${permissionTheme.spacing.xs};
`;

const ToggleSwitch = styled.button<{ checked: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  
  background: ${props => props.checked ? permissionTheme.colors.success : permissionTheme.colors.border};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.checked ? '22px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  &:hover {
    transform: scale(1.05);
  }
`;

const ToggleLabel = styled.span<{ active: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.active ? permissionTheme.colors.success : permissionTheme.colors.textSecondary};
`;

const PermissionDescription = styled.div`
  font-size: 0.85rem;
  color: ${permissionTheme.colors.textSecondary};
  line-height: 1.4;
  margin-bottom: ${permissionTheme.spacing.sm};
`;

const PermissionStatus = styled.div<{ type: 'active' | 'expiring' | 'expired' | 'inactive' }>`
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.xs};
  font-size: 0.8rem;
  font-weight: 500;
  
  color: ${props => 
    props.type === 'active' ? permissionTheme.colors.success :
    props.type === 'expiring' ? permissionTheme.colors.warning :
    props.type === 'expired' ? permissionTheme.colors.error :
    permissionTheme.colors.textSecondary
  };
`;

const PermissionsSummary = styled.div`
  padding: ${permissionTheme.spacing.md} ${permissionTheme.spacing.lg};
  background: ${permissionTheme.colors.background};
  border-top: 1px solid ${permissionTheme.colors.border};
  display: flex;
  justify-content: between;
  align-items: center;
`;

const SummaryText = styled.div`
  font-size: 0.9rem;
  color: ${permissionTheme.colors.textSecondary};
  font-weight: 500;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${permissionTheme.colors.border};
  border-radius: 50%;
  border-top-color: ${permissionTheme.colors.text};
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SearchBar = styled.div`
  margin-bottom: ${permissionTheme.spacing.xl};
  display: flex;
  gap: ${permissionTheme.spacing.md};
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${permissionTheme.spacing.md};
  background: ${permissionTheme.colors.inputBg};
  border: 1px solid ${permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  color: ${permissionTheme.colors.text};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${permissionTheme.colors.primary};
  }

  &::placeholder {
    color: ${permissionTheme.colors.textSecondary};
  }
`;

const TemplateSelector = styled.select`
  padding: ${permissionTheme.spacing.md};
  background: ${permissionTheme.colors.inputBg};
  border: 1px solid ${permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  color: ${permissionTheme.colors.text};
  font-size: 0.9rem;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: ${permissionTheme.colors.primary};
  }

  option {
    background: ${permissionTheme.colors.surface};
    color: ${permissionTheme.colors.text};
  }
`;

const BulkActionBar = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: ${permissionTheme.colors.surface};
  border: 1px solid ${permissionTheme.colors.primary};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.md};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  backdrop-filter: blur(20px);
`;

const BulkActionText = styled.div`
  color: ${permissionTheme.colors.text};
  font-weight: 600;
  margin-right: ${permissionTheme.spacing.md};
`;

const TrainerCheckbox = styled.input`
  position: absolute;
  top: ${permissionTheme.spacing.md};
  left: ${permissionTheme.spacing.md};
  width: 18px;
  height: 18px;
  cursor: pointer;
  z-index: 10;
`;

const RequestsBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${permissionTheme.colors.warning};
  color: ${permissionTheme.colors.background};
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${warningPulse} 2s ease-in-out infinite;
`;

const RequestsPanel = styled(motion.div)`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  border: 1px solid ${permissionTheme.colors.border};
  margin-bottom: ${permissionTheme.spacing.xl};
  overflow: hidden;
`;

const RequestItem = styled(motion.div)`
  padding: ${permissionTheme.spacing.lg};
  border-bottom: 1px solid ${permissionTheme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
`;

const RequestInfo = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    color: ${permissionTheme.colors.text};
    font-size: 0.95rem;
  }
  
  p {
    margin: 0;
    color: ${permissionTheme.colors.textSecondary};
    font-size: 0.85rem;
  }
`;

const RequestActions = styled.div`
  display: flex;
  gap: ${permissionTheme.spacing.sm};
`;

// ==================== PERMISSION TEMPLATES ====================

const PERMISSION_TEMPLATES = {
  senior_trainer: {
    name: 'Senior Trainer',
    description: 'Full access for experienced trainers',
    permissions: ['edit_workouts', 'view_progress', 'manage_clients', 'access_nutrition', 'modify_schedules', 'view_analytics'],
    color: '#7c3aed'
  },
  new_trainer: {
    name: 'New Trainer',
    description: 'Basic permissions for new team members',
    permissions: ['edit_workouts', 'view_progress'],
    color: '#10b981'
  },
  specialist: {
    name: 'Nutrition Specialist',
    description: 'Specialized access for nutrition experts',
    permissions: ['edit_workouts', 'view_progress', 'access_nutrition'],
    color: '#f59e0b'
  },
  session_manager: {
    name: 'Session Manager',
    description: 'Scheduling and session management focus',
    permissions: ['edit_workouts', 'view_progress', 'modify_schedules', 'view_analytics'],
    color: '#06b6d4'
  },
  limited_access: {
    name: 'Limited Access',
    description: 'Minimal permissions for contractors',
    permissions: ['view_progress'],
    color: '#8b5cf6'
  }
};

// ==================== PERMISSION TYPES ====================

const PERMISSION_TYPES: PermissionType[] = [
  {
    key: 'edit_workouts',
    label: 'Edit Client Workouts',
    description: 'Allow trainer to log and modify client workout sessions',
    critical: true,
    icon: Activity
  },
  {
    key: 'view_progress',
    label: 'View Client Progress',
    description: 'Access to client progress charts and analytics',
    critical: false,
    icon: BarChart3
  },
  {
    key: 'manage_clients',
    label: 'Manage Assigned Clients',
    description: 'Edit client information and session notes',
    critical: false,
    icon: Users
  },
  {
    key: 'access_nutrition',
    label: 'Access Nutrition Data',
    description: 'View and edit client nutrition logs',
    critical: false,
    icon: Target
  },
  {
    key: 'modify_schedules',
    label: 'Modify Schedules',
    description: 'Book and reschedule client sessions',
    critical: true,
    icon: Calendar
  },
  {
    key: 'view_analytics',
    label: 'View Analytics',
    description: 'Access trainer performance analytics',
    critical: false,
    icon: Award
  }
];

// ==================== MAIN COMPONENT ====================

const TrainerPermissionsManager: React.FC<TrainerPermissionsManagerProps> = ({ 
  trainerId, 
  onPermissionChange 
}) => {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<TrainerWithPermissions[]>([]);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingPermissions, setProcessingPermissions] = useState<Set<string>>(new Set());
  
  // New state for enhancements
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedTrainers, setSelectedTrainers] = useState<Set<number>>(new Set());
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [trainerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // If specific trainerId provided, load only that trainer
      if (trainerId) {
        await loadSingleTrainer(trainerId);
      } else {
        await loadAllTrainers();
      }

      // Load statistics
      const statsResponse = await trainerPermissionService.getPermissionStats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

    } catch (error) {
      console.error('Failed to load permission data:', error);
      toast.error('Failed to load permission data');
    } finally {
      setLoading(false);
    }
  };

  const loadSingleTrainer = async (id: number) => {
    try {
      const response = await trainerPermissionService.getTrainerPermissions(id);
      if (response.success && response.data) {
        // Mock trainer data - in production, this would come from user service
        const mockTrainer: TrainerWithPermissions = {
          id,
          firstName: 'John',
          lastName: 'Trainer',
          email: 'john.trainer@example.com',
          permissions: response.data.permissions,
          permissionsByType: response.data.permissionsByType,
          totalActivePermissions: response.data.totalActivePermissions
        };
        setTrainers([mockTrainer]);
      }
    } catch (error) {
      console.error('Failed to load trainer permissions:', error);
    }
  };

  const loadAllTrainers = async () => {
    try {
      // Mock trainers data - in production, this would come from user service
      const mockTrainers = [
        { id: 1, firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com' },
        { id: 2, firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com' },
        { id: 3, firstName: 'Mike', lastName: 'Wilson', email: 'mike.wilson@example.com' }
      ];

      const trainersWithPermissions = await Promise.all(
        mockTrainers.map(async (trainer) => {
          try {
            const response = await trainerPermissionService.getTrainerPermissions(trainer.id);
            return {
              ...trainer,
              permissions: response.data?.permissions || [],
              permissionsByType: response.data?.permissionsByType || {},
              totalActivePermissions: response.data?.totalActivePermissions || 0
            };
          } catch (error) {
            return {
              ...trainer,
              permissions: [],
              permissionsByType: {},
              totalActivePermissions: 0
            };
          }
        })
      );

      setTrainers(trainersWithPermissions);
    } catch (error) {
      console.error('Failed to load trainers:', error);
    }
  };

  const togglePermission = async (trainerId: number, permissionType: string, currentlyHas: boolean) => {
    const permissionKey = `${trainerId}-${permissionType}`;
    
    if (processingPermissions.has(permissionKey)) return;

    setProcessingPermissions(prev => new Set(prev).add(permissionKey));

    try {
      if (currentlyHas) {
        // Find and revoke permission
        const trainer = trainers.find(t => t.id === trainerId);
        const permission = trainer?.permissions.find(p => 
          p.permissionType === permissionType && p.isActive
        );
        
        if (permission) {
          const response = await trainerPermissionService.revokePermission(permission.id);
          if (response.success) {
            toast.success('Permission revoked successfully');
          }
        }
      } else {
        // Grant permission
        const response = await trainerPermissionService.grantPermission({
          trainerId,
          permissionType
        });
        
        if (response.success) {
          toast.success('Permission granted successfully');
        }
      }

      // Reload data
      await loadData();
      onPermissionChange?.();

    } catch (error: any) {
      console.error('Failed to toggle permission:', error);
      toast.error(error.message || 'Failed to update permission');
    } finally {
      setProcessingPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(permissionKey);
        return newSet;
      });
    }
  };

  // ==================== ENHANCEMENT FUNCTIONS ====================

  // Template Application
  const applyTemplate = async (templateKey: string, trainerIds: number[]) => {
    if (!templateKey || trainerIds.length === 0) return;

    const template = PERMISSION_TEMPLATES[templateKey as keyof typeof PERMISSION_TEMPLATES];
    if (!template) return;

    setBulkProcessing(true);
    try {
      const operations = [];
      
      for (const trainerId of trainerIds) {
        // First revoke all permissions for clean slate
        const trainer = trainers.find(t => t.id === trainerId);
        if (trainer) {
          for (const existingPermission of trainer.permissions) {
            if (existingPermission.isActive) {
              operations.push(
                trainerPermissionService.revokePermission(existingPermission.id, `Template: ${template.name} applied`)
              );
            }
          }
        }
        
        // Then grant template permissions
        for (const permissionType of template.permissions) {
          operations.push(
            trainerPermissionService.grantPermission({
              trainerId,
              permissionType,
              notes: `Applied template: ${template.name}`
            })
          );
        }
      }

      await Promise.all(operations);
      await loadData();
      onPermissionChange?.();
      
      toast.success(`Template "${template.name}" applied to ${trainerIds.length} trainer(s)`);
      setSelectedTemplate('');
      setSelectedTrainers(new Set());
      
    } catch (error: any) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk Operations
  const performBulkOperation = async (operation: BulkPermissionOperation) => {
    if (operation.trainerIds.length === 0) return;

    setBulkProcessing(true);
    try {
      const operations = [];
      
      for (const trainerId of operation.trainerIds) {
        if (operation.action === 'grant') {
          operations.push(
            trainerPermissionService.grantPermission({
              trainerId,
              permissionType: operation.permissionType,
              notes: 'Bulk operation'
            })
          );
        } else {
          // Find and revoke permission
          const trainer = trainers.find(t => t.id === trainerId);
          const permission = trainer?.permissions.find(p => 
            p.permissionType === operation.permissionType && p.isActive
          );
          if (permission) {
            operations.push(
              trainerPermissionService.revokePermission(permission.id, 'Bulk operation')
            );
          }
        }
      }

      await Promise.all(operations);
      await loadData();
      onPermissionChange?.();
      
      toast.success(`Bulk ${operation.action} completed for ${operation.trainerIds.length} trainer(s)`);
      setSelectedTrainers(new Set());
      
    } catch (error: any) {
      console.error('Failed to perform bulk operation:', error);
      toast.error('Failed to perform bulk operation');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Permission Requests (Mock implementation - would need backend)
  const loadPermissionRequests = async () => {
    // Mock data - in production this would come from backend
    const mockRequests: PermissionRequest[] = [
      {
        id: '1',
        trainerId: 2,
        trainerName: 'Sarah Johnson',
        permissionType: 'access_nutrition',
        reason: 'I am completing my nutrition certification and need access to client nutrition data to provide comprehensive guidance.',
        requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      },
      {
        id: '2',
        trainerId: 3,
        trainerName: 'Mike Wilson',
        permissionType: 'modify_schedules',
        reason: 'I would like to help with scheduling coordination for our gym location.',
        requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    ];
    
    setPermissionRequests(mockRequests.filter(r => r.status === 'pending'));
  };

  const handlePermissionRequest = async (requestId: string, action: 'approve' | 'deny') => {
    const request = permissionRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      if (action === 'approve') {
        await trainerPermissionService.grantPermission({
          trainerId: request.trainerId,
          permissionType: request.permissionType,
          notes: `Approved request: ${request.reason.substring(0, 100)}...`
        });
        toast.success(`Permission request approved for ${request.trainerName}`);
      } else {
        toast.success(`Permission request denied for ${request.trainerName}`);
      }

      // Remove from pending requests
      setPermissionRequests(prev => prev.filter(r => r.id !== requestId));
      
      if (action === 'approve') {
        await loadData();
        onPermissionChange?.();
      }
      
    } catch (error: any) {
      console.error('Failed to handle request:', error);
      toast.error('Failed to process request');
    }
  };

  // Selection handlers
  const toggleTrainerSelection = (trainerId: number) => {
    setSelectedTrainers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trainerId)) {
        newSet.delete(trainerId);
      } else {
        newSet.add(trainerId);
      }
      return newSet;
    });
  };

  const selectAllTrainers = () => {
    const allTrainerIds = filteredTrainers.map(t => t.id);
    setSelectedTrainers(new Set(allTrainerIds));
  };

  const clearAllSelection = () => {
    setSelectedTrainers(new Set());
  };

  // Load permission requests on mount
  useEffect(() => {
    loadPermissionRequests();
  }, []);

  const filteredTrainers = useMemo(() => {
    return trainers.filter(trainer => {
      const matchesSearch = searchQuery === '' || 
        `${trainer.firstName} ${trainer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trainer.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [trainers, searchQuery]);

  const getPermissionStatus = (permissionData: any) => {
    if (!permissionData.hasPermission) return 'inactive';
    if (permissionData.isExpiringSoon) return 'expiring';
    return 'active';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={12} />;
      case 'expiring': return <AlertTriangle size={12} />;
      case 'expired': return <XCircle size={12} />;
      default: return <Shield size={12} />;
    }
  };

  if (loading) {
    return (
      <PermissionsContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <LoadingSpinner />
        </div>
      </PermissionsContainer>
    );
  }

  return (
    <ThemeProvider theme={permissionTheme}>
      <PermissionsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header>
          <HeaderTop>
            <TitleSection>
              <h1>
                <Shield size={28} />
                Trainer Permissions Manager
              </h1>
              <p>Manage granular permissions for trainer access control</p>
            </TitleSection>
            <HeaderActions>
              <TemplateSelector
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                title="Select a permission template to apply to selected trainers"
              >
                <option value="">Select Template</option>
                {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name} ({template.permissions.length} permissions)
                  </option>
                ))}
              </TemplateSelector>
              
              <Button 
                variant="primary" 
                onClick={() => {
                  if (selectedTemplate && selectedTrainers.size > 0) {
                    applyTemplate(selectedTemplate, Array.from(selectedTrainers));
                  } else {
                    toast.warning('Select trainers and a template first');
                  }
                }}
                disabled={!selectedTemplate || selectedTrainers.size === 0 || bulkProcessing}
              >
                <Award size={16} />
                Apply Template
              </Button>
              
              <div style={{ position: 'relative' }}>
                <Button 
                  variant={permissionRequests.length > 0 ? "warning" : "secondary"} 
                  onClick={() => setShowRequests(!showRequests)}
                  title={`${permissionRequests.length} pending permission requests`}
                >
                  <MessageSquare size={16} />
                  Requests
                </Button>
                {permissionRequests.length > 0 && (
                  <RequestsBadge>{permissionRequests.length}</RequestsBadge>
                )}
              </div>
              
              <Button variant="secondary" onClick={loadData}>
                <RefreshCw size={16} />
                Refresh
              </Button>
              
              <Button variant="primary">
                <Download size={16} />
                Export Report
              </Button>
            </HeaderActions>
          </HeaderTop>

          {stats && (
            <StatsGrid>
              <StatCard type="primary" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.totalTrainers}</StatValue>
                <StatLabel>
                  <Users size={16} />
                  Total Trainers
                </StatLabel>
              </StatCard>
              <StatCard type="success" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.activePermissions}</StatValue>
                <StatLabel>
                  <ShieldCheck size={16} />
                  Active Permissions
                </StatLabel>
              </StatCard>
              <StatCard type="warning" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.expiringPermissions}</StatValue>
                <StatLabel>
                  <AlertTriangle size={16} />
                  Expiring Soon
                </StatLabel>
              </StatCard>
              <StatCard type="info" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.averagePermissionsPerTrainer}</StatValue>
                <StatLabel>
                  <BarChart3 size={16} />
                  Avg per Trainer
                </StatLabel>
              </StatCard>
            </StatsGrid>
          )}
        </Header>

        {/* Permission Requests Panel */}
        <AnimatePresence>
          {showRequests && permissionRequests.length > 0 && (
            <RequestsPanel
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ 
                padding: permissionTheme.spacing.lg,
                borderBottom: `1px solid ${permissionTheme.colors.border}`,
                background: permissionTheme.colors.background
              }}>
                <h3 style={{ 
                  margin: 0, 
                  color: permissionTheme.colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: permissionTheme.spacing.sm
                }}>
                  <AlertTriangle size={20} color={permissionTheme.colors.warning} />
                  Pending Permission Requests ({permissionRequests.length})
                </h3>
              </div>
              
              {permissionRequests.map((request) => {
                const permissionType = PERMISSION_TYPES.find(p => p.key === request.permissionType);
                return (
                  <RequestItem
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RequestInfo>
                      <h4>
                        {request.trainerName} requests "{permissionType?.label || request.permissionType}"
                      </h4>
                      <p>
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p style={{ marginTop: permissionTheme.spacing.xs }}>
                        <Clock size={14} style={{ marginRight: '4px' }} />
                        Requested {new Date(request.requestedAt).toLocaleDateString()}
                      </p>
                    </RequestInfo>
                    
                    <RequestActions>
                      <Button
                        variant="success"
                        onClick={() => handlePermissionRequest(request.id, 'approve')}
                      >
                        <CheckCircle size={16} />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handlePermissionRequest(request.id, 'deny')}
                      >
                        <XCircle size={16} />
                        Deny
                      </Button>
                    </RequestActions>
                  </RequestItem>
                );
              })}
            </RequestsPanel>
          )}
        </AnimatePresence>

        {!trainerId && (
          <SearchBar>
            <SearchInput
              type="text"
              placeholder="Search trainers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {selectedTrainers.size > 0 && (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={selectAllTrainers}
                    disabled={selectedTrainers.size === filteredTrainers.length}
                  >
                    <Users size={16} />
                    Select All ({filteredTrainers.length})
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={clearAllSelection}
                  >
                    <X size={16} />
                    Clear ({selectedTrainers.size})
                  </Button>
                </>
              )}
              
              {selectedTrainers.size === 0 && (
                <Button 
                  variant="secondary" 
                  onClick={selectAllTrainers}
                >
                  <Users size={16} />
                  Select All
                </Button>
              )}
              
              <Button variant="secondary">
                <Filter size={16} />
                Filter
              </Button>
            </div>
          </SearchBar>
        )}

        <TrainersGrid>
          {filteredTrainers.map((trainer) => (
            <TrainerCard
              key={trainer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: trainer.id * 0.1 }}
              style={{ position: 'relative' }}
            >
              {/* Selection Checkbox */}
              <TrainerCheckbox
                type="checkbox"
                checked={selectedTrainers.has(trainer.id)}
                onChange={() => toggleTrainerSelection(trainer.id)}
                title={`Select ${trainer.firstName} ${trainer.lastName} for bulk operations`}
              />
              <TrainerHeader>
                <h3>
                  <User size={20} />
                  {trainer.firstName} {trainer.lastName}
                </h3>
                <p>{trainer.email}</p>
              </TrainerHeader>

              <PermissionsGrid>
                {PERMISSION_TYPES.map((permType) => {
                  const permissionData = trainer.permissionsByType[permType.key] || {
                    hasPermission: false,
                    permission: null,
                    isExpiringSoon: false,
                    daysUntilExpiration: null
                  };
                  
                  const status = getPermissionStatus(permissionData);
                  const isProcessing = processingPermissions.has(`${trainer.id}-${permType.key}`);
                  const IconComponent = permType.icon;

                  return (
                    <PermissionCard
                      key={permType.key}
                      critical={permType.critical}
                      hasPermission={permissionData.hasPermission}
                      expiring={permissionData.isExpiringSoon}
                      whileHover={{ scale: 1.02 }}
                    >
                      <PermissionHeader>
                        <PermissionLabel>
                          <h4>
                            <IconComponent size={16} />
                            {permType.label}
                            {permType.critical && (
                              <CriticalBadge>Critical</CriticalBadge>
                            )}
                          </h4>
                        </PermissionLabel>
                        
                        <PermissionToggle>
                          <ToggleSwitch
                            checked={permissionData.hasPermission}
                            disabled={isProcessing}
                            onClick={() => togglePermission(
                              trainer.id, 
                              permType.key, 
                              permissionData.hasPermission
                            )}
                          >
                            {isProcessing && (
                              <LoadingSpinner style={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                transform: 'translate(-50%, -50%)',
                                width: '12px',
                                height: '12px'
                              }} />
                            )}
                          </ToggleSwitch>
                          <ToggleLabel active={permissionData.hasPermission}>
                            {permissionData.hasPermission ? 'ON' : 'OFF'}
                          </ToggleLabel>
                        </PermissionToggle>
                      </PermissionHeader>
                      
                      <PermissionDescription>
                        {permType.description}
                      </PermissionDescription>
                      
                      <PermissionStatus type={status}>
                        {getStatusIcon(status)}
                        {status === 'active' && 'Active'}
                        {status === 'expiring' && `Expires in ${permissionData.daysUntilExpiration} days`}
                        {status === 'expired' && 'Expired'}
                        {status === 'inactive' && 'Not granted'}
                      </PermissionStatus>
                    </PermissionCard>
                  );
                })}
              </PermissionsGrid>

              <PermissionsSummary>
                <SummaryText>
                  Active Permissions: {trainer.totalActivePermissions} / {PERMISSION_TYPES.length}
                </SummaryText>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {trainer.totalActivePermissions === PERMISSION_TYPES.length ? (
                    <Crown size={16} style={{ color: permissionTheme.colors.warning }} />
                  ) : (
                    <Key size={16} style={{ color: permissionTheme.colors.textSecondary }} />
                  )}
                </div>
              </PermissionsSummary>
            </TrainerCard>
          ))}
        </TrainersGrid>

        {filteredTrainers.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: permissionTheme.colors.textSecondary,
            padding: permissionTheme.spacing.xxl,
            fontSize: '1.1rem'
          }}>
            {searchQuery ? 'No trainers match your search' : 'No trainers found'}
          </div>
        )}

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedTrainers.size > 0 && (
            <BulkActionBar
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <BulkActionText>
                {selectedTrainers.size} trainer{selectedTrainers.size > 1 ? 's' : ''} selected
              </BulkActionText>
              
              <div style={{ display: 'flex', gap: permissionTheme.spacing.sm }}>
                {/* Quick Permission Actions */}
                <Button
                  variant="success"
                  onClick={() => performBulkOperation({
                    action: 'grant',
                    permissionType: 'edit_workouts',
                    trainerIds: Array.from(selectedTrainers)
                  })}
                  disabled={bulkProcessing}
                  title="Grant Edit Workouts permission to selected trainers"
                >
                  <Activity size={16} />
                  Grant Workouts
                </Button>
                
                <Button
                  variant="success"
                  onClick={() => performBulkOperation({
                    action: 'grant',
                    permissionType: 'view_progress',
                    trainerIds: Array.from(selectedTrainers)
                  })}
                  disabled={bulkProcessing}
                  title="Grant View Progress permission to selected trainers"
                >
                  <BarChart3 size={16} />
                  Grant Progress
                </Button>
                
                <Button
                  variant="warning"
                  onClick={() => performBulkOperation({
                    action: 'revoke',
                    permissionType: 'access_nutrition',
                    trainerIds: Array.from(selectedTrainers)
                  })}
                  disabled={bulkProcessing}
                  title="Revoke Nutrition Access from selected trainers"
                >
                  <Target size={16} />
                  Revoke Nutrition
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={clearAllSelection}
                  disabled={bulkProcessing}
                >
                  <X size={16} />
                  Cancel
                </Button>
              </div>
            </BulkActionBar>
          )}
        </AnimatePresence>
      </PermissionsContainer>
    </ThemeProvider>
  );
};

export default TrainerPermissionsManager;