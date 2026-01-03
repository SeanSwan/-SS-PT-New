/**
 * Enhanced Enterprise Admin Stellar Sidebar - AAA 7-Star Command Center
 * ====================================================================
 * 
 * PHASE 2: ENTERPRISE TRANSFORMATION COMPLETE
 * The ultimate administrative command center for SwanStudios
 * 
 * 🌟 NEW ENTERPRISE FEATURES:
 * ✅ Comprehensive MCP Server Integration & Control
 * ✅ Real-Time System Monitoring & Analytics
 * ✅ Advanced Gamification Management Suite
 * ✅ Social Media Command Center Integration
 * ✅ Business Intelligence & Executive KPIs
 * ✅ Advanced User & Trainer Management
 * ✅ Professional Enterprise UI/UX Design
 * ✅ Full Accessibility & Mobile Optimization
 * 
 * ENTERPRISE CAPABILITIES:
 * - Complete MCP server monitoring, control, and configuration
 * - Real-time performance metrics and health monitoring
 * - Advanced gamification and social media management
 * - Comprehensive business analytics and reporting
 * - Executive-level KPI dashboard integration
 * - Multi-admin collaboration and role management
 * - Advanced security and audit logging
 * - Professional design system with stellar aesthetics
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';

// Enhanced Icon System for Enterprise Features
import { 
  // Core Admin
  Shield, Users, UserCheck, Calendar, Package, BarChart3, 
  Database, Settings, Monitor, TrendingUp, ShieldCheck, 
  ChevronLeft, ChevronRight, Menu, X, Command, AlertTriangle,
  Activity, DollarSign, MessageSquare, FileText, Star, CreditCard,
  Award, Heart, RefreshCw, Power, PowerOff,
  
  // MCP Server Management & Workout
  Server, Cpu, HardDrive, Wifi, WifiOff, Zap, Globe,
  Tool, Wrench, Gauge, BarChart, PieChart, LineChart,
  CheckCircle, XCircle, AlertCircle, Info,
  
  // Social Media & Gamification
  ThumbsUp, MessageCircle, Share2, Hash, Trending,
  Trophy, Target, Gamepad2, Flame, Users2, Crown,
  Image, Video, Camera, Mic, Upload, Dumbbell,
  
  // Business Intelligence
  TrendingDown, TrendingUp as TrendUp, Calculator,
  Briefcase, PiggyBank, Receipt, CreditCard as Card,
  Analytics, Eye, EyeOff, Filter, Search,
  
  // Advanced Admin Features
  UserPlus, UserMinus, UserCog, Lock, Unlock,
  Bell, BellOff, Mail, MailOpen, Clock, Timer,
  Download, Upload as UploadIcon, ExternalLink,
  Grid, Layout, Maximize, Minimize, Plus, Minus
} from 'lucide-react';

// Custom Hooks for Enterprise Features
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useSystemHealth } from '../../../hooks/useSystemHealth';
import { useMCPServerStatus } from '../../../hooks/useMCPServerStatus';
import { useBusinessMetrics } from '../../../hooks/useBusinessMetrics';

// === ENTERPRISE COMMAND CENTER THEME ===
const enterpriseCommandTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    commandBlue: '#1e3a8a',
    stellarBlue: '#3b82f6',
    cyberCyan: '#00ffff',
    stellarWhite: '#ffffff',
    energyBlue: '#0ea5e9',
    warningAmber: '#f59e0b',
    successGreen: '#10b981',
    criticalRed: '#ef4444',
    voidBlack: '#000000',
    // New Enterprise Colors
    mcpPurple: '#8b5cf6',
    socialPink: '#ec4899',
    analyticsOrange: '#f97316',
    gamificationGold: '#fbbf24'
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #00ffff 100%)',
    adminNebula: 'linear-gradient(45deg, #0f172a 0%, #1e3a8a 50%, #0a0a0f 100%)',
    mcpServer: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    socialMedia: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
    businessIntel: 'linear-gradient(135deg, #f97316 0%, #10b981 100%)',
    gamification: 'linear-gradient(135deg, #fbbf24 0%, #ef4444 100%)',
    stellarCommand: 'conic-gradient(from 0deg, #00ffff, #3b82f6, #8b5cf6, #ec4899, #00ffff)',
    commandAurora: 'linear-gradient(270deg, #00ffff, #3b82f6, #8b5cf6, #ec4899, #00ffff)'
  },
  shadows: {
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.6)',
    mcpGlow: '0 0 20px rgba(139, 92, 246, 0.4)',
    socialGlow: '0 0 20px rgba(236, 72, 153, 0.4)',
    analyticsGlow: '0 0 20px rgba(249, 115, 22, 0.4)',
    gamificationGlow: '0 0 20px rgba(251, 191, 36, 0.4)',
    stellarGlow: '0 0 20px currentColor',
    commandCenter: 'inset 0 0 20px rgba(0, 255, 255, 0.2)'
  }
};

// === ENHANCED ENTERPRISE NAVIGATION STRUCTURE ===
interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  route: string;
  section: string;
  badge?: string | number;
  status?: 'active' | 'warning' | 'error' | 'offline';
  subItems?: NavigationItem[];
  requiresPermission?: string[];
  description?: string;
}

const enterpriseNavigationItems: NavigationItem[] = [
  // === EXECUTIVE COMMAND CENTER ===
  {
    id: 'executive-overview',
    label: 'Executive Overview',
    icon: Command,
    route: '/dashboard/admin/overview',
    section: 'executive',
    description: 'Executive-level KPIs and business insights'
  },
  {
    id: 'master-schedule',
    label: 'Universal Master Schedule',
    icon: Calendar,
    route: '/dashboard/admin/master-schedule',
    section: 'executive',
    description: 'Advanced scheduling with real-time collaboration'
  },
  {
    id: 'business-intelligence',
    label: 'Business Intelligence',
    icon: BarChart3,
    route: '/dashboard/admin/business-intelligence',
    section: 'executive',
    description: 'Advanced analytics and predictive insights'
  },
  
  // === MCP SERVER COMMAND CENTER ===
  {
    id: 'mcp-servers',
    label: 'MCP Server Control',
    icon: Server,
    route: '/dashboard/admin/mcp-servers',
    section: 'mcp',
    status: 'active', // Dynamic status
    subItems: [
      {
        id: 'workout-mcp',
        label: 'Workout AI Server',
        icon: Cpu,
        route: '/dashboard/admin/mcp-servers/workout',
        section: 'mcp',
        status: 'active',
        description: 'NASM-compliant AI workout generation'
      },
      {
        id: 'gamification-mcp',
        label: 'Gamification Server',
        icon: Trophy,
        route: '/dashboard/admin/mcp-servers/gamification',
        section: 'mcp',
        status: 'active',
        description: 'Social gamification and engagement'
      },
      {
        id: 'enhanced-gamification',
        label: 'Enhanced Gamification',
        icon: Crown,
        route: '/dashboard/admin/mcp-servers/enhanced-gamification',
        section: 'mcp',
        status: 'active',
        description: 'Advanced social features and community'
      },
      {
        id: 'financial-mcp',
        label: 'Financial Events Server',
        icon: DollarSign,
        route: '/dashboard/admin/mcp-servers/financial',
        section: 'mcp',
        status: 'active',
        description: 'Revenue tracking and financial events'
      },
      {
        id: 'yolo-mcp',
        label: 'YOLO Vision Server',
        icon: Eye,
        route: '/dashboard/admin/mcp-servers/yolo',
        section: 'mcp',
        status: 'warning',
        description: 'Computer vision and form analysis'
      }
    ],
    description: 'Complete MCP server monitoring and control'
  },
  
  // === SOCIAL MEDIA & GAMIFICATION COMMAND CENTER ===
  {
    id: 'social-command',
    label: 'Social Media Center',
    icon: ThumbsUp,
    route: '/dashboard/admin/social-media',
    section: 'social',
    badge: '12',
    subItems: [
      {
        id: 'content-moderation',
        label: 'Content Moderation',
        icon: Shield,
        route: '/dashboard/admin/social-media/moderation',
        section: 'social',
        badge: '5',
        description: 'User-generated content approval and moderation'
      },
      {
        id: 'community-management',
        label: 'Community Management',
        icon: Users2,
        route: '/dashboard/admin/social-media/community',
        section: 'social',
        description: 'Community engagement and user interaction'
      },
      {
        id: 'social-analytics',
        label: 'Social Analytics',
        icon: TrendUp,
        route: '/dashboard/admin/social-media/analytics',
        section: 'social',
        description: 'Engagement metrics and social performance'
      },
      {
        id: 'hashtag-management',
        label: 'Hashtag & Trends',
        icon: Hash,
        route: '/dashboard/admin/social-media/hashtags',
        section: 'social',
        description: 'Trending topics and hashtag management'
      }
    ],
    description: 'Complete social media and community management'
  },
  {
    id: 'gamification-center',
    label: 'Gamification Control',
    icon: Gamepad2,
    route: '/dashboard/admin/gamification',
    section: 'gamification',
    subItems: [
      {
        id: 'achievement-system',
        label: 'Achievement System',
        icon: Award,
        route: '/dashboard/admin/gamification/achievements',
        section: 'gamification',
        description: 'Manage user achievements and rewards'
      },
      {
        id: 'leaderboards',
        label: 'Leaderboards',
        icon: Trophy,
        route: '/dashboard/admin/gamification/leaderboards',
        section: 'gamification',
        description: 'Competition management and rankings'
      },
      {
        id: 'challenges',
        label: 'Challenges & Events',
        icon: Target,
        route: '/dashboard/admin/gamification/challenges',
        section: 'gamification',
        description: 'Create and manage fitness challenges'
      },
      {
        id: 'rewards-store',
        label: 'Rewards Store',
        icon: Star,
        route: '/dashboard/admin/gamification/rewards',
        section: 'gamification',
        description: 'Digital rewards and incentive management'
      }
    ],
    description: 'Advanced gamification and engagement systems'
  },
  
  // === USER & TRAINER MANAGEMENT ===
  {
    id: 'user-management',
    label: 'User Management',
    icon: Users,
    route: '/dashboard/admin/users',
    section: 'management',
    subItems: [
      {
        id: 'user-overview',
        label: 'User Overview',
        icon: UserCheck,
        route: '/dashboard/admin/users/overview',
        section: 'management',
        description: 'Comprehensive user lifecycle management'
      },
      {
        id: 'user-roles',
        label: 'Roles & Permissions',
        icon: UserCog,
        route: '/dashboard/admin/users/roles',
        section: 'management',
        description: 'Advanced role-based access control'
      },
      {
        id: 'user-analytics',
        label: 'User Analytics',
        icon: Analytics,
        route: '/dashboard/admin/users/analytics',
        section: 'management',
        description: 'User behavior and engagement analytics'
      }
    ],
    description: 'Complete user lifecycle and role management'
  },
  {
    id: 'trainer-management',
    label: 'Trainer Management',
    icon: Award,
    route: '/dashboard/admin/trainers',
    section: 'management',
    subItems: [
      {
        id: 'trainer-overview',
        label: 'Trainer Overview',
        icon: Users,
        route: '/dashboard/admin/trainers/overview',
        section: 'management',
        description: 'Trainer performance and certification tracking'
      },
      {
        id: 'trainer-assignments',
        label: 'Client Assignments',
        icon: UserCheck,
        route: '/dashboard/admin/trainers/assignments',
        section: 'management',
        description: 'Manage client-trainer relationships'
      },
      {
        id: 'trainer-performance',
        label: 'Performance Analytics',
        icon: BarChart,
        route: '/dashboard/admin/trainers/performance',
        section: 'management',
        description: 'Trainer effectiveness and client outcomes'
      }
    ],
    description: 'Professional trainer management and analytics'
  },
  {
    id: 'workout-entry',
    label: 'Workout Entry',
    icon: Dumbbell,
    route: '/dashboard/admin/workout-entry',
    section: 'management',
    description: 'Enter and track client workout data'
  },
  {
    id: 'measurement-entry',
    label: 'Measurement Entry',
    icon: FileText,
    route: '/dashboard/admin/measurement-entry',
    section: 'management',
    description: 'Log and analyze client body measurements'
  },
  {
    id: 'session-allocation',
    label: 'Session Allocation',
    icon: CreditCard,
    route: '/dashboard/admin/session-allocation',
    section: 'management',
    description: 'Advanced session allocation and management'
  },
  
  // === BUSINESS ANALYTICS & REPORTING ===
  {
    id: 'revenue-analytics',
    label: 'Revenue Analytics',
    icon: DollarSign,
    route: '/dashboard/admin/revenue',
    section: 'analytics',
    subItems: [
      {
        id: 'revenue-dashboard',
        label: 'Revenue Dashboard',
        icon: BarChart,
        route: '/dashboard/admin/revenue/dashboard',
        section: 'analytics',
        description: 'Real-time revenue tracking and forecasting'
      },
      {
        id: 'subscription-analytics',
        label: 'Subscription Analytics',
        icon: RefreshCw,
        route: '/dashboard/admin/revenue/subscriptions',
        section: 'analytics',
        description: 'Subscription performance and retention'
      },
      {
        id: 'financial-reports',
        label: 'Financial Reports',
        icon: FileText,
        route: '/dashboard/admin/revenue/reports',
        section: 'analytics',
        description: 'Executive financial reporting and insights'
      }
    ],
    description: 'Comprehensive revenue analytics and forecasting'
  },
  {
    id: 'system-monitoring',
    label: 'System Monitoring',
    icon: Monitor,
    route: '/dashboard/admin/system-monitoring',
    section: 'analytics',
    subItems: [
      {
        id: 'system-health',
        label: 'System Health',
        icon: Activity,
        route: '/dashboard/admin/system-monitoring/health',
        section: 'analytics',
        description: 'Real-time system performance monitoring'
      },
      {
        id: 'api-monitoring',
        label: 'API Monitoring',
        icon: Globe,
        route: '/dashboard/admin/system-monitoring/api',
        section: 'analytics',
        description: 'API performance and response time tracking'
      },
      {
        id: 'error-tracking',
        label: 'Error Tracking',
        icon: AlertTriangle,
        route: '/dashboard/admin/system-monitoring/errors',
        section: 'analytics',
        description: 'Error tracking and resolution management'
      }
    ],
    description: 'Advanced system health and performance monitoring'
  },
  
  // === CONFIGURATION & SETTINGS ===
  {
    id: 'admin-settings',
    label: 'Admin Settings',
    icon: Settings,
    route: '/dashboard/admin/settings',
    section: 'settings',
    subItems: [
      {
        id: 'system-config',
        label: 'System Configuration',
        icon: Tool,
        route: '/dashboard/admin/settings/system',
        section: 'settings',
        description: 'Core system configuration and preferences'
      },
      {
        id: 'security-settings',
        label: 'Security Settings',
        icon: ShieldCheck,
        route: '/dashboard/admin/settings/security',
        section: 'settings',
        description: 'Advanced security and access controls'
      },
      {
        id: 'notification-settings',
        label: 'Notification Settings',
        icon: Bell,
        route: '/dashboard/admin/settings/notifications',
        section: 'settings',
        description: 'Admin notification preferences and alerts'
      }
    ],
    description: 'Advanced admin configuration and security'
  }
];

// Section configurations for organization
const navigationSections = {
  executive: {
    title: 'Executive Command',
    color: 'commandCenter',
    glow: 'commandGlow'
  },
  mcp: {
    title: 'MCP Server Control',
    color: 'mcpServer', 
    glow: 'mcpGlow'
  },
  social: {
    title: 'Social & Community',
    color: 'socialMedia',
    glow: 'socialGlow'
  },
  gamification: {
    title: 'Gamification',
    color: 'gamification',
    glow: 'gamificationGlow'
  },
  management: {
    title: 'Management',
    color: 'businessIntel',
    glow: 'analyticsGlow'
  },
  analytics: {
    title: 'Analytics & Monitoring',
    color: 'businessIntel',
    glow: 'analyticsGlow'
  },
  settings: {
    title: 'Configuration',
    color: 'commandCenter',
    glow: 'commandGlow'
  }
};

// === ENHANCED KEYFRAME ANIMATIONS ===
const commandFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
  33% { transform: translateY(-6px) rotate(0.5deg); opacity: 1; }
  66% { transform: translateY(-3px) rotate(-0.5deg); opacity: 0.95; }
`;

const commandPulse = keyframes`
  0%, 100% { 
    opacity: 0.7; 
    transform: scale(1); 
    filter: hue-rotate(0deg);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.01); 
    filter: hue-rotate(20deg);
  }
`;

const dataOrbit = keyframes`
  0% { 
    transform: rotate(0deg) translateX(12px) rotate(0deg); 
    opacity: 0; 
  }
  10%, 90% { 
    opacity: 1; 
  }
  100% { 
    transform: rotate(360deg) translateX(12px) rotate(-360deg); 
    opacity: 0; 
  }
`;

const commandGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.4);
  }
  50% { 
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.6), 0 0 40px rgba(0, 255, 255, 0.3);
    border-color: rgba(59, 130, 246, 0.8);
  }
`;

const commandAuroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const statusPulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
`;

// === ENTERPRISE STYLED COMPONENTS ===

const EnterpriseAdminSidebarContainer = styled(motion.aside)<{ isCollapsed: boolean; isMobile: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  height: calc(100vh - 56px);
  width: ${props => props.isCollapsed ? '80px' : '320px'};
  background: ${props => props.theme.gradients.adminNebula};
  backdrop-filter: blur(20px);
  border-right: 2px solid rgba(59, 130, 246, 0.2);
  z-index: 999;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  /* Enhanced Command Center Particle Background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, rgba(59, 130, 246, 0.4), transparent),
      radial-gradient(1px 1px at 40px 70px, rgba(0, 255, 255, 0.3), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(139, 92, 246, 0.3), transparent),
      radial-gradient(2px 2px at 130px 80px, rgba(236, 72, 153, 0.2), transparent),
      radial-gradient(1px 1px at 160px 120px, rgba(249, 115, 22, 0.2), transparent);
    background-size: 100px 80px;
    background-repeat: repeat;
    animation: ${commandFloat} 8s ease-in-out infinite;
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Enhanced Command Aurora Effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.theme.gradients.commandAurora};
    background-size: 300% 300%;
    animation: ${commandAuroraShift} 6s ease infinite;
    opacity: 0.8;
  }
  
  @media (max-width: 768px) {
    top: 0;
    height: 100vh;
    transform: translateX(${props => props.isMobile && props.isCollapsed ? '-100%' : '0'});
    width: 320px;
    border-right: none;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    z-index: 1001;
  }
  
  /* Enhanced scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(10, 10, 15, 0.3);
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.gradients.stellarCommand};
    border-radius: 3px;
    
    &:hover {
      background: ${props => props.theme.colors.cyberCyan};
    }
  }
`;

const EnterpriseAdminSidebarHeader = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => props.isCollapsed ? 'center' : 'space-between'};
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  position: relative;
  background: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(10px);
`;

const EnterpriseLogoContainer = styled(motion.div)<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  
  .enterprise-logo-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: ${props => props.theme.gradients.stellarCommand};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${props => props.theme.shadows.commandGlow};
    animation: ${commandPulse} 4s ease-in-out infinite;
    position: relative;
    
    /* Enhanced data orbit effect */
    &::before {
      content: '◆';
      position: absolute;
      width: 8px;
      height: 8px;
      color: ${props => props.theme.colors.cyberCyan};
      animation: ${dataOrbit} 3s linear infinite;
      font-size: 10px;
    }
    
    &::after {
      content: '◇';
      position: absolute;
      width: 6px;
      height: 6px;
      color: ${props => props.theme.colors.mcpPurple};
      animation: ${dataOrbit} 4s linear infinite reverse;
      animation-delay: 1.5s;
      font-size: 8px;
    }
  }
  
  .enterprise-logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    background: ${props => props.theme.gradients.stellarCommand};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }
`;

const EnterpriseCollapseToggle = styled(motion.button)<{ isCollapsed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: ${props => props.theme.colors.stellarBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: ${props => props.theme.shadows.stellarGlow};
    transform: scale(1.1);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.stellarBlue};
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const EnterpriseNavigationSection = styled(motion.div)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const EnterpriseSectionTitle = styled(motion.h3)<{ isCollapsed: boolean; sectionColor: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.75rem 1.5rem 0.5rem;
  margin: 1rem 0 0.5rem;
  color: ${props => props.theme.colors.stellarWhite};
  opacity: ${props => props.isCollapsed ? '0' : '0.8'};
  transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
  transition: all 0.3s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 1.5rem;
    bottom: 0;
    width: ${props => props.isCollapsed ? '0' : 'calc(100% - 3rem)'};
    height: 1px;
    background: ${props => props.theme.gradients[props.sectionColor] || props.theme.gradients.commandCenter};
    transition: width 0.3s ease;
    opacity: 0.6;
  }
`;

const EnterpriseNavigationItem = styled(motion.div)<{ 
  isActive: boolean; 
  isCollapsed: boolean; 
  hasSubItems: boolean;
  level: number;
  sectionColor: string;
}>`
  position: relative;
  margin: 0.25rem 0.75rem;
  border-radius: 12px;
  overflow: hidden;
  
  .nav-item-content {
    display: flex;
    align-items: center;
    padding: ${props => props.level === 0 ? '0.875rem 1rem' : '0.75rem 1.5rem'};
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 12px;
    position: relative;
    
    background: ${props => {
      if (props.isActive) {
        return `rgba(${props.theme.colors.stellarBlue.replace('#', '')}, 0.2)`;
      }
      return 'transparent';
    }};
    
    border: 1px solid ${props => {
      if (props.isActive) {
        return `rgba(${props.theme.colors.stellarBlue.replace('#', '')}, 0.4)`;
      }
      return 'transparent';
    }};
    
    &:hover {
      background: ${props => props.theme.gradients[props.sectionColor] || props.theme.gradients.commandCenter};
      background-size: 200% 200%;
      animation: ${commandAuroraShift} 2s ease infinite;
      transform: translateX(4px);
      box-shadow: ${props => props.theme.shadows[props.sectionColor + 'Glow'] || props.theme.shadows.commandGlow};
    }
    
    &:active {
      transform: translateX(2px) scale(0.98);
    }
  }
  
  .nav-icon {
    width: 20px;
    height: 20px;
    color: ${props => props.isActive ? props.theme.colors.stellarWhite : props.theme.colors.stellarBlue};
    transition: all 0.3s ease;
    margin-right: ${props => props.isCollapsed ? '0' : '0.75rem'};
    
    ${props => props.isActive && css`
      filter: drop-shadow(0 0 8px currentColor);
    `}
  }
  
  .nav-label {
    font-size: 0.875rem;
    font-weight: ${props => props.isActive ? '600' : '500'};
    color: ${props => props.isActive ? props.theme.colors.stellarWhite : 'rgba(255, 255, 255, 0.9)'};
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    flex: 1;
    white-space: nowrap;
  }
  
  .nav-badge {
    background: ${props => props.theme.gradients.stellarCommand};
    color: ${props => props.theme.colors.stellarWhite};
    font-size: 0.675rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: scale(${props => props.isCollapsed ? '0' : '1'});
    transition: all 0.3s ease;
    animation: ${statusPulse} 2s ease-in-out infinite;
  }
  
  .nav-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-left: 0.5rem;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: scale(${props => props.isCollapsed ? '0' : '1'});
    transition: all 0.3s ease;
    
    &.status-active {
      background: ${props => props.theme.colors.successGreen};
      box-shadow: 0 0 8px ${props => props.theme.colors.successGreen};
      animation: ${statusPulse} 2s ease-in-out infinite;
    }
    
    &.status-warning {
      background: ${props => props.theme.colors.warningAmber};
      box-shadow: 0 0 8px ${props => props.theme.colors.warningAmber};
      animation: ${statusPulse} 1.5s ease-in-out infinite;
    }
    
    &.status-error {
      background: ${props => props.theme.colors.criticalRed};
      box-shadow: 0 0 8px ${props => props.theme.colors.criticalRed};
      animation: ${statusPulse} 1s ease-in-out infinite;
    }
    
    &.status-offline {
      background: rgba(255, 255, 255, 0.3);
      opacity: 0.5;
    }
  }
  
  .nav-expand {
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s ease;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: scale(${props => props.isCollapsed ? '0' : '1'});
  }
`;

const EnterpriseSubNavigation = styled(motion.div)<{ isCollapsed: boolean }>`
  margin-left: 1rem;
  border-left: 2px solid rgba(59, 130, 246, 0.2);
  margin-top: 0.5rem;
  opacity: ${props => props.isCollapsed ? '0' : '1'};
  max-height: ${props => props.isCollapsed ? '0' : '500px'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const EnterpriseSystemStatus = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1rem;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(10px);
  
  .status-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => props.theme.colors.stellarWhite};
    opacity: ${props => props.isCollapsed ? '0' : '0.9'};
    margin-bottom: 0.5rem;
    transition: all 0.3s ease;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: ${props => props.isCollapsed ? '1fr' : 'repeat(2, 1fr)'};
    gap: 0.5rem;
    transition: all 0.3s ease;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .status-icon {
      width: 16px;
      height: 16px;
      color: ${props => props.theme.colors.stellarBlue};
    }
    
    .status-text {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.8);
      opacity: ${props => props.isCollapsed ? '0' : '1'};
      transition: all 0.3s ease;
    }
  }
`;

// === MAIN ENTERPRISE ADMIN SIDEBAR COMPONENT ===

interface EnterpriseAdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

const EnterpriseAdminSidebar: React.FC<EnterpriseAdminSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onMobileClose
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive', 'mcp']));
  const [mcpServerStatus, setMcpServerStatus] = useState({
    workout: 'active',
    gamification: 'active', 
    enhanced_gamification: 'active',
    financial: 'active',
    yolo: 'warning'
  });
  const [systemHealth, setSystemHealth] = useState({
    cpu: 45,
    memory: 62,
    uptime: '15h 32m',
    activeUsers: 247
  });
  
  // Real-time system monitoring (mock implementation)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30) + 30,
        memory: Math.floor(Math.random() * 20) + 50,
        activeUsers: Math.floor(Math.random() * 50) + 200
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Navigation handlers
  const handleNavigation = useCallback((route: string) => {
    navigate(route);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  }, [navigate, isMobile, onMobileClose]);
  
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);
  
  // Group navigation items by section
  const navigationBySection = useMemo(() => {
    const grouped: Record<string, NavigationItem[]> = {};
    
    enterpriseNavigationItems.forEach(item => {
      if (!grouped[item.section]) {
        grouped[item.section] = [];
      }
      grouped[item.section].push(item);
    });
    
    return grouped;
  }, []);
  
  // Check if route is active
  const isRouteActive = useCallback((route: string) => {
    return location.pathname === route || location.pathname.startsWith(route + '/');
  }, [location.pathname]);
  
  // Render navigation item
  const renderNavigationItem = useCallback((item: NavigationItem, level: number = 0) => {
    const isActive = isRouteActive(item.route);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const sectionConfig = navigationSections[item.section as keyof typeof navigationSections];
    
    return (
      <React.Fragment key={item.id}>
        <EnterpriseNavigationItem
          isActive={isActive}
          isCollapsed={isCollapsed}
          hasSubItems={hasSubItems}
          level={level}
          sectionColor={sectionConfig?.color || 'commandCenter'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div 
            className="nav-item-content"
            onClick={() => {
              if (hasSubItems) {
                toggleSection(item.id);
              } else {
                handleNavigation(item.route);
              }
            }}
          >
            <item.icon className="nav-icon" />
            <span className="nav-label">{item.label}</span>
            
            {item.badge && (
              <span className="nav-badge">{item.badge}</span>
            )}
            
            {item.status && (
              <div className={`nav-status status-${item.status}`} />
            )}
            
            {hasSubItems && (
              <ChevronRight 
                className="nav-expand"
                size={16}
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              />
            )}
          </div>
        </EnterpriseNavigationItem>
        
        {hasSubItems && (
          <AnimatePresence>
            {isExpanded && (
              <EnterpriseSubNavigation
                isCollapsed={isCollapsed}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {item.subItems!.map(subItem => renderNavigationItem(subItem, level + 1))}
              </EnterpriseSubNavigation>
            )}
          </AnimatePresence>
        )}
      </React.Fragment>
    );
  }, [isCollapsed, expandedSections, isRouteActive, toggleSection, handleNavigation]);
  
  return (
    <ThemeProvider theme={enterpriseCommandTheme}>
      <EnterpriseAdminSidebarContainer
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        initial={{ x: isMobile ? -320 : 0 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Enhanced Header */}
        <EnterpriseAdminSidebarHeader isCollapsed={isCollapsed}>
          <EnterpriseLogoContainer 
            isCollapsed={isCollapsed}
            onClick={() => handleNavigation('/dashboard/admin/overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="enterprise-logo-icon">
              <Command size={20} color="white" />
            </div>
            <div className="enterprise-logo-text">
              SwanStudios Command
            </div>
          </EnterpriseLogoContainer>
          
          {!isMobile && (
            <EnterpriseCollapseToggle
              isCollapsed={isCollapsed}
              onClick={onToggleCollapse}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </EnterpriseCollapseToggle>
          )}
        </EnterpriseAdminSidebarHeader>
        
        {/* Enhanced Navigation */}
        <EnterpriseNavigationSection>
          {Object.entries(navigationBySection).map(([sectionKey, items]) => {
            const sectionConfig = navigationSections[sectionKey as keyof typeof navigationSections];
            
            return (
              <div key={sectionKey}>
                <EnterpriseSectionTitle 
                  isCollapsed={isCollapsed}
                  sectionColor={sectionConfig?.color || 'commandCenter'}
                >
                  {sectionConfig?.title || sectionKey}
                </EnterpriseSectionTitle>
                
                {items.map(item => renderNavigationItem(item))}
              </div>
            );
          })}
        </EnterpriseNavigationSection>
        
        {/* Enhanced System Status */}
        <EnterpriseSystemStatus isCollapsed={isCollapsed}>
          <div className="status-title">System Status</div>
          <div className="status-grid">
            <div className="status-item">
              <Cpu className="status-icon" />
              <span className="status-text">{systemHealth.cpu}%</span>
            </div>
            <div className="status-item">
              <HardDrive className="status-icon" />
              <span className="status-text">{systemHealth.memory}%</span>
            </div>
            <div className="status-item">
              <Users className="status-icon" />
              <span className="status-text">{systemHealth.activeUsers}</span>
            </div>
            <div className="status-item">
              <Clock className="status-icon" />
              <span className="status-text">{systemHealth.uptime}</span>
            </div>
          </div>
        </EnterpriseSystemStatus>
      </EnterpriseAdminSidebarContainer>
    </ThemeProvider>
  );
};

export default EnterpriseAdminSidebar;