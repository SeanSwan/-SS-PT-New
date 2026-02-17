/**
 * Enhanced Trainer Data Management Dashboard
 * =========================================
 *
 * BUSINESS-CRITICAL: Comprehensive trainer data collection and management system
 * Handles complete trainer lifecycle from onboarding to performance tracking
 *
 * FEATURES:
 * - Complete trainer onboarding and certification tracking
 * - Performance analytics and client metrics
 * - Qualification verification and continuing education
 * - Revenue tracking and commission management
 * - Client assignment and scheduling oversight
 * - Mobile-optimized admin interface for gym management
 * - Advanced reporting and analytics
 *
 * TRAINER DATA COLLECTION:
 * - Personal and professional information
 * - Certifications and qualifications (NASM, ACE, etc.)
 * - Specialties and areas of expertise
 * - Availability and scheduling preferences
 * - Performance metrics and client outcomes
 * - Financial data and commission tracking
 * - Professional development and training history
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Lucide Icons
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Eye,
  UserPlus,
  Dumbbell,
  GraduationCap,
  Star,
  TrendingUp,
  Activity,
  BarChart3,
  Filter,
  XCircle,
  CheckCircle,
  XOctagon,
  AlertTriangle,
  Info,
  Settings,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  PersonStanding,
  Brain,
  Heart,
  MessageCircle,
  Bell,
  PieChart,
  Gauge,
  Repeat,
  Award,
  Users,
  DollarSign,
  Clock,
  CalendarCheck,
  ChevronDown,
  BarChart2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// === STYLED COMPONENTS ===
const DashboardContainer = styled.div`
  padding: 1.5rem;
  min-height: 100vh;
  background: transparent;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HeaderSection = styled(motion.div)`
  margin-bottom: 2rem;
  text-align: center;

  h1 {
    color: #ffffff;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #8b5cf6 0%, #00ffff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

const StatsOverview = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(motion.div)`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    border-color: #00ffff;
    box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
    transform: translateY(-4px);
  }

  .stat-icon {
    font-size: 3rem;
    color: #00ffff;
    margin-bottom: 1rem;
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .stat-change {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;

    &.negative {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
  }
`;

const ControlsSection = styled(motion.div)`
  background: rgba(120, 81, 169, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1.5rem;
  align-items: center;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const SearchSection = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #8b5cf6 0%, #00ffff 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.4);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DataTable = styled(motion.div)`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
`;

const TableHeader = styled.div`
  background: rgba(120, 81, 169, 0.3);
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);

  h3 {
    color: #ffffff;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
`;

const TrainerCard = styled(motion.div)`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    border-color: #00ffff;
    box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const SearchInput = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;

  svg {
    position: absolute;
    left: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    pointer-events: none;
  }

  input {
    width: 100%;
    min-height: 44px;
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 8px;
    color: #ffffff;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }

    &:hover {
      border-color: #00ffff;
    }

    &:focus {
      border-color: #00ffff;
      box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
    }
  }
`;

const StyledSelect = styled.select`
  min-height: 44px;
  min-width: 140px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #00ffff;
  }

  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  option {
    background: #1e1b4b;
    color: #ffffff;
  }
`;

const StyledTableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  background: rgba(120, 81, 169, 0.2);
`;

const StyledTh = styled.th`
  color: #ffffff;
  font-weight: 600;
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  white-space: nowrap;
`;

const StyledTr = styled.tr<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background 0.15s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
  }
`;

const StyledTd = styled.td<{ $colSpan?: number; $center?: boolean }>`
  color: #e2e8f0;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  vertical-align: middle;
`;

const TrainerCellWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AvatarCircle = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: ${({ $src }) => ($src ? `url(${$src}) center/cover no-repeat` : '#8b5cf6')};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
`;

const TrainerNameText = styled.span`
  color: #ffffff;
  font-weight: 500;
  display: block;
`;

const TrainerUsernameText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  display: block;
`;

const TrainerExpText = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  display: block;
`;

const ContactEmailText = styled.span`
  color: #ffffff;
  font-size: 0.875rem;
  display: block;
`;

const ContactPhoneText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  display: block;
`;

const ContactRateText = styled.span`
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  display: block;
`;

const SpecialtiesWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 200px;
`;

const SpecialtyChip = styled.span<{ $bgColor: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  background: ${({ $bgColor }) => $bgColor};
  color: #ffffff;
  font-size: 0.7rem;
  white-space: nowrap;
`;

const OverflowChip = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 0.7rem;
  white-space: nowrap;
`;

const PerformanceWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
`;

const StarIcon = styled(Star)<{ $filled: boolean }>`
  width: 14px;
  height: 14px;
  color: ${({ $filled }) => ($filled ? '#ffd700' : 'rgba(255,255,255,0.3)')};
  fill: ${({ $filled }) => ($filled ? '#ffd700' : 'none')};
`;

const RatingValueText = styled.span`
  color: #ffffff;
  font-size: 0.75rem;
`;

const PerformanceSubText = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  display: block;
`;

const PerformanceRevenueText = styled.span`
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  display: block;
`;

const StatusChip = styled.span<{ $isActive: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  background: ${({ $isActive }) => ($isActive ? '#10b981' : '#ef4444')};
  color: #ffffff;
  font-weight: 600;
  font-size: 0.75rem;
  white-space: nowrap;
`;

const ActionsWrapper = styled.div`
  display: flex;
  gap: 4px;
`;

const IconBtn = styled.button<{ $color?: string }>`
  background: none;
  border: none;
  border-radius: 8px;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ $color }) => $color || '#ffffff'};
  transition: background 0.15s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ProgressBar = styled.div`
  height: 4px;
  width: 100%;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 40%;
    background: #00ffff;
    border-radius: 2px;
    animation: indeterminate 1.5s ease-in-out infinite;
  }

  @keyframes indeterminate {
    0% { left: -40%; }
    100% { left: 100%; }
  }
`;

const EmptyStateText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 2rem 0;
  margin: 0;
`;

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1rem;
  color: #ffffff;
  font-size: 0.875rem;
  border-top: 1px solid rgba(139, 92, 246, 0.3);
  flex-wrap: wrap;

  @media (max-width: 600px) {
    justify-content: center;
  }
`;

const PaginationSelect = styled.select`
  min-height: 36px;
  padding: 0.25rem 1.75rem 0.25rem 0.5rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.4rem center;

  option {
    background: #1e1b4b;
    color: #ffffff;
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  min-width: 36px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  color: ${({ $disabled }) => ($disabled ? 'rgba(255,255,255,0.25)' : '#ffffff')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background 0.15s ease, border-color 0.15s ease;
  padding: 0;

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.15);
    border-color: #00ffff;
  }
`;

// === INTERFACES ===
interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  photo?: string;
  isActive: boolean;
  createdAt: string;

  // Professional Information
  specialties?: string[];
  certifications?: Certification[];
  bio?: string;
  experience?: number; // years
  hourlyRate?: number;

  // Availability
  availableDays?: string[];
  availableHours?: {
    start: string;
    end: string;
  };

  // Performance Metrics
  clientCount?: number;
  averageRating?: number;
  totalSessions?: number;
  monthlyRevenue?: number;
  retentionRate?: number;

  // Professional Development
  continuingEducation?: ContinuingEducation[];
  performanceGoals?: string[];
  notes?: string;
}

interface Certification {
  id: string;
  name: string;
  organization: string;
  obtainedDate: string;
  expirationDate: string;
  verified: boolean;
  certificateUrl?: string;
}

interface ContinuingEducation {
  id: string;
  title: string;
  provider: string;
  completedDate: string;
  hours: number;
  category: string;
}

interface TrainerStats {
  totalTrainers: number;
  activeTrainers: number;
  newTrainersThisMonth: number;
  averageRating: number;
  totalClients: number;
  monthlyRevenue: number;
  certificationExpiringCount: number;
}

// === MAIN COMPONENT ===
const EnhancedTrainerDataManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State management
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTrainers, setSelectedTrainers] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentTab, setCurrentTab] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [stats, setStats] = useState<TrainerStats>({
    totalTrainers: 0,
    activeTrainers: 0,
    newTrainersThisMonth: 0,
    averageRating: 0,
    totalClients: 0,
    monthlyRevenue: 0,
    certificationExpiringCount: 0
  });

  // Modal states
  const [trainerDetailsModalOpen, setTrainerDetailsModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);

  // Fetch trainers data
  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/trainers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrainers(data.trainers || []);

        // Calculate stats
        const totalTrainers = data.trainers?.length || 0;
        const activeTrainers = data.trainers?.filter((t: Trainer) => t.isActive).length || 0;
        const currentMonth = new Date().getMonth();
        const newTrainersThisMonth = data.trainers?.filter((t: Trainer) =>
          new Date(t.createdAt).getMonth() === currentMonth
        ).length || 0;

        const averageRating = totalTrainers > 0
          ? data.trainers.reduce((sum: number, t: Trainer) => sum + (t.averageRating || 0), 0) / totalTrainers
          : 0;

        const totalClients = data.trainers?.reduce((sum: number, t: Trainer) => sum + (t.clientCount || 0), 0) || 0;
        const monthlyRevenue = data.trainers?.reduce((sum: number, t: Trainer) => sum + (t.monthlyRevenue || 0), 0) || 0;

        setStats({
          totalTrainers,
          activeTrainers,
          newTrainersThisMonth,
          averageRating,
          totalClients,
          monthlyRevenue,
          certificationExpiringCount: 0 // Calculate from certifications
        });
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trainers data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial data load
  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  // Filter trainers based on search and filters
  const filteredTrainers = useMemo(() => {
    return trainers.filter(trainer => {
      const matchesSearch =
        trainer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainer.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSpecialty = filterSpecialty === 'all' ||
        trainer.specialties?.includes(filterSpecialty);

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && trainer.isActive) ||
        (filterStatus === 'inactive' && !trainer.isActive);

      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [trainers, searchTerm, filterSpecialty, filterStatus]);

  // Stats cards data
  const statsCards = [
    {
      icon: <Dumbbell className="stat-icon" size={48} />,
      number: stats.totalTrainers,
      label: 'Total Trainers',
      change: `+${stats.newTrainersThisMonth} this month`,
      changeType: 'positive'
    },
    {
      icon: <Users className="stat-icon" size={48} />,
      number: stats.totalClients,
      label: 'Total Clients',
      change: `${stats.activeTrainers} active trainers`,
      changeType: 'positive'
    },
    {
      icon: <Star className="stat-icon" size={48} />,
      number: stats.averageRating.toFixed(1),
      label: 'Avg Rating',
      change: 'Trainer performance',
      changeType: 'positive'
    },
    {
      icon: <DollarSign className="stat-icon" size={48} />,
      number: `$${stats.monthlyRevenue.toLocaleString()}`,
      label: 'Monthly Revenue',
      change: 'Total trainer revenue',
      changeType: 'positive'
    }
  ];

  const getSpecialtyColor = (specialty: string) => {
    const colors = {
      'strength': '#ef4444',
      'cardio': '#10b981',
      'yoga': '#8b5cf6',
      'crossfit': '#f59e0b',
      'pilates': '#06b6d4',
      'nutrition': '#84cc16',
      'rehabilitation': '#ec4899'
    };
    return colors[specialty.toLowerCase() as keyof typeof colors] || '#6b7280';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? '#10b981' : '#ef4444';
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredTrainers.length / rowsPerPage);
  const paginatedTrainers = filteredTrainers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const startIndex = filteredTrainers.length === 0 ? 0 : page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, filteredTrainers.length);

  // Simple star rating renderer
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<StarIcon key={i} $filled={i <= Math.round(rating)} size={14} />);
    }
    return stars;
  };

  return (
    <DashboardContainer>
      {/* Header Section */}
      <HeaderSection
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Enhanced Trainer Data Management</h1>
        <p>
          Comprehensive trainer data collection, certification tracking, and performance management.
          Monitor, develop, and optimize your training team.
        </p>
      </HeaderSection>

      {/* Statistics Overview */}
      <StatsOverview
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {statsCards.map((stat, index) => (
          <StatCard
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
          >
            {stat.icon}
            <div className="stat-number">{stat.number}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.change}
            </div>
          </StatCard>
        ))}
      </StatsOverview>

      {/* Controls Section */}
      <ControlsSection
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <ControlsGrid>
          <SearchSection>
            <SearchInput>
              <Search size={18} />
              <input
                placeholder="Search trainers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchInput>

            <StyledSelect
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
            >
              <option value="all">All Specialties</option>
              <option value="strength">Strength Training</option>
              <option value="cardio">Cardio/Endurance</option>
              <option value="yoga">Yoga</option>
              <option value="crossfit">CrossFit</option>
              <option value="pilates">Pilates</option>
              <option value="nutrition">Nutrition</option>
              <option value="rehabilitation">Rehabilitation</option>
            </StyledSelect>

            <StyledSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </StyledSelect>
          </SearchSection>

          <ActionButton
            onClick={() => navigate('/dashboard/admin/trainer-onboarding')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus size={18} />
            Add Trainer
          </ActionButton>

          <ActionButton
            onClick={fetchTrainers}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} />
            Refresh
          </ActionButton>
        </ControlsGrid>
      </ControlsSection>

      {/* Data Table */}
      <DataTable
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <TableHeader>
          <h3>Trainer Database ({filteredTrainers.length} trainers)</h3>
        </TableHeader>

        <StyledTableContainer>
          <StyledTable>
            <StyledThead>
              <tr>
                <StyledTh>Trainer</StyledTh>
                <StyledTh>Contact</StyledTh>
                <StyledTh>Specialties</StyledTh>
                <StyledTh>Performance</StyledTh>
                <StyledTh>Status</StyledTh>
                <StyledTh>Actions</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <StyledTd colSpan={6}>
                      <ProgressBar />
                    </StyledTd>
                  </tr>
                ))
              ) : filteredTrainers.length === 0 ? (
                <tr>
                  <StyledTd colSpan={6} $center>
                    <EmptyStateText>
                      No trainers found matching your criteria
                    </EmptyStateText>
                  </StyledTd>
                </tr>
              ) : (
                paginatedTrainers.map((trainer) => (
                    <StyledTr
                      key={trainer.id}
                      $clickable
                      onClick={() => {
                        setSelectedTrainer(trainer);
                        setTrainerDetailsModalOpen(true);
                      }}
                    >
                      <StyledTd>
                        <TrainerCellWrapper>
                          <AvatarCircle $src={trainer.photo || undefined}>
                            {!trainer.photo && trainer.firstName?.[0]?.toUpperCase()}
                          </AvatarCircle>
                          <div>
                            <TrainerNameText>
                              {trainer.firstName} {trainer.lastName}
                            </TrainerNameText>
                            <TrainerUsernameText>
                              @{trainer.username}
                            </TrainerUsernameText>
                            {trainer.experience && (
                              <TrainerExpText>
                                {trainer.experience} years experience
                              </TrainerExpText>
                            )}
                          </div>
                        </TrainerCellWrapper>
                      </StyledTd>
                      <StyledTd>
                        <div>
                          <ContactEmailText>
                            {trainer.email}
                          </ContactEmailText>
                          {trainer.phone && (
                            <ContactPhoneText>
                              {trainer.phone}
                            </ContactPhoneText>
                          )}
                          {trainer.hourlyRate && (
                            <ContactRateText>
                              ${trainer.hourlyRate}/hr
                            </ContactRateText>
                          )}
                        </div>
                      </StyledTd>
                      <StyledTd>
                        <SpecialtiesWrapper>
                          {trainer.specialties?.slice(0, 3).map((specialty, index) => (
                            <SpecialtyChip
                              key={index}
                              $bgColor={getSpecialtyColor(specialty)}
                            >
                              {specialty}
                            </SpecialtyChip>
                          ))}
                          {trainer.specialties && trainer.specialties.length > 3 && (
                            <OverflowChip>
                              +{trainer.specialties.length - 3}
                            </OverflowChip>
                          )}
                        </SpecialtiesWrapper>
                      </StyledTd>
                      <StyledTd>
                        <PerformanceWrapper>
                          <RatingRow>
                            {renderStars(trainer.averageRating || 0)}
                            <RatingValueText>
                              ({trainer.averageRating?.toFixed(1) || 'N/A'})
                            </RatingValueText>
                          </RatingRow>
                          <PerformanceSubText>
                            {trainer.clientCount || 0} clients &bull; {trainer.totalSessions || 0} sessions
                          </PerformanceSubText>
                          {trainer.monthlyRevenue && (
                            <PerformanceRevenueText>
                              ${trainer.monthlyRevenue.toLocaleString()}/mo
                            </PerformanceRevenueText>
                          )}
                        </PerformanceWrapper>
                      </StyledTd>
                      <StyledTd>
                        <StatusChip $isActive={trainer.isActive}>
                          {trainer.isActive ? 'Active' : 'Inactive'}
                        </StatusChip>
                      </StyledTd>
                      <StyledTd>
                        <ActionsWrapper>
                          <IconBtn
                            $color="#00ffff"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrainer(trainer);
                              setTrainerDetailsModalOpen(true);
                            }}
                          >
                            <Eye size={18} />
                          </IconBtn>
                          <IconBtn
                            $color="#ffffff"
                            title="Edit Trainer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle edit
                            }}
                          >
                            <Pencil size={18} />
                          </IconBtn>
                          <IconBtn
                            $color="#8b5cf6"
                            title="View Performance"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrainer(trainer);
                              setPerformanceModalOpen(true);
                            }}
                          >
                            <BarChart3 size={18} />
                          </IconBtn>
                        </ActionsWrapper>
                      </StyledTd>
                    </StyledTr>
                  ))
              )}
            </tbody>
          </StyledTable>
        </StyledTableContainer>

        <PaginationBar>
          <span>Rows per page:</span>
          <PaginationSelect
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </PaginationSelect>
          <span>
            {startIndex}-{endIndex} of {filteredTrainers.length}
          </span>
          <PaginationButton
            $disabled={page === 0}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft size={18} />
          </PaginationButton>
          <PaginationButton
            $disabled={page >= totalPages - 1}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <ChevronRight size={18} />
          </PaginationButton>
        </PaginationBar>
      </DataTable>
    </DashboardContainer>
  );
};

export default EnhancedTrainerDataManagement;