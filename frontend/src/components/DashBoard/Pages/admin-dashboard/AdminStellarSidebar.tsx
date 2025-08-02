/**
 * AdminStellarSidebar.tsx
 * =======================
 * 
 * Professional Stellar Command Center Sidebar for Admin Dashboard
 * Adapted from Client Dashboard's StellarSidebar with blue-focused command center theme
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Command center constellation navigation with professional blue palette
 * - Stellar gradients adapted for administrative authority
 * - Advanced micro-interactions with command-level glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 * 
 * Master Prompt v28 Alignment:
 * - Professional aesthetics with cosmic command center grandeur
 * - Award-winning gradient systems with blue-focused palette
 * - Mobile-first ultra-responsive design
 * - Accessibility as art with inclusive design
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { 
  Shield, Users, UserCheck, Calendar, Package, BarChart3, 
  Database, Settings, Monitor, TrendingUp, ShieldCheck, 
  ChevronLeft, ChevronRight, Menu, X, Command, AlertTriangle,
  Activity, DollarSign, MessageSquare, FileText, Star, CreditCard,
  Award, Heart, Dumbbell, Gamepad2, Eye, Zap, HardDrive
} from 'lucide-react';

// === ADMIN COMMAND CENTER THEME ===
const adminCommandTheme = {
  colors: {
    deepSpace: '#0a0a0f',
    commandBlue: '#1e3a8a',      // Professional navy blue (replaces cosmic purple)
    stellarBlue: '#3b82f6',      // Bright professional blue
    cyberCyan: '#00ffff',        // Keep signature cyan
    stellarWhite: '#ffffff',
    energyBlue: '#0ea5e9',       // Enhanced blue energy
    warningAmber: '#f59e0b',     // Status indicators
    successGreen: '#10b981',     // Positive states
    criticalRed: '#ef4444',      // Alert states
    voidBlack: '#000000'
  },
  gradients: {
    commandCenter: 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #00ffff 100%)',
    adminNebula: 'linear-gradient(45deg, #0f172a 0%, #1e3a8a 50%, #0a0a0f 100%)',
    dataFlow: 'radial-gradient(ellipse at top, #3b82f6 0%, #1e3a8a 50%, #0a0a0f 100%)',
    stellarCommand: 'conic-gradient(from 0deg, #00ffff, #3b82f6, #1e3a8a, #00ffff)',
    commandAurora: 'linear-gradient(270deg, #00ffff, #3b82f6, #1e3a8a, #00ffff)'
  },
  shadows: {
    commandGlow: '0 0 30px rgba(59, 130, 246, 0.6)',
    adminNebula: '0 0 40px rgba(30, 58, 138, 0.4)',
    dataVisualization: '0 20px 40px rgba(0, 0, 0, 0.6)',
    stellarGlow: '0 0 20px currentColor',
    commandCenter: 'inset 0 0 20px rgba(0, 255, 255, 0.2)'
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

// === STYLED COMPONENTS ===

const AdminSidebarContainer = styled(motion.aside)<{ isCollapsed: boolean; isMobile: boolean }>`
  position: fixed;
  top: 56px;
  left: 0;
  height: calc(100vh - 56px);
  width: ${props => props.isCollapsed ? '80px' : '280px'};
  background: ${props => props.theme.gradients.adminNebula};
  backdrop-filter: blur(20px);
  border-right: 2px solid rgba(59, 130, 246, 0.2);
  z-index: 999;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  /* Command Center Particle Background */
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
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.2), transparent),
      radial-gradient(2px 2px at 130px 80px, rgba(59, 130, 246, 0.3), transparent);
    background-size: 100px 80px;
    background-repeat: repeat;
    animation: ${commandFloat} 8s ease-in-out infinite;
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Command Aurora Effect */
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
    width: 280px;
    border-right: none;
    box-shadow: ${props => props.theme.shadows.dataVisualization};
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
    background: ${props => props.theme.gradients.commandCenter};
    border-radius: 3px;
    
    &:hover {
      background: ${props => props.theme.colors.cyberCyan};
    }
  }
`;

const AdminSidebarHeader = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => props.isCollapsed ? 'center' : 'space-between'};
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  position: relative;
  background: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(10px);
`;

const AdminLogoContainer = styled(motion.div)<{ isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  
  .admin-logo-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${props => props.theme.gradients.commandCenter};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: ${props => props.theme.shadows.commandGlow};
    animation: ${commandPulse} 4s ease-in-out infinite;
    position: relative;
    
    /* Data orbit effect */
    &::before {
      content: '⬢';
      position: absolute;
      width: 8px;
      height: 8px;
      color: ${props => props.theme.colors.cyberCyan};
      animation: ${dataOrbit} 3s linear infinite;
    }
    
    &::after {
      content: '⬡';
      position: absolute;
      width: 6px;
      height: 6px;
      color: ${props => props.theme.colors.stellarBlue};
      animation: ${dataOrbit} 4s linear infinite reverse;
      animation-delay: 1.5s;
    }
  }
  
  .admin-logo-text {
    font-size: 1.4rem;
    font-weight: 700;
    background: ${props => props.theme.gradients.commandCenter};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
  }
`;

const AdminCollapseToggle = styled(motion.button)<{ isCollapsed: boolean }>`
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

const AdminNavigationSection = styled(motion.div)`
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const AdminSectionTitle = styled(motion.h3)<{ isCollapsed: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
  margin: 1.5rem 1rem 0.75rem;
  opacity: ${props => props.isCollapsed ? '0' : '1'};
  transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '⬢';
    color: ${props => props.theme.colors.stellarBlue};
    animation: ${commandPulse} 3s ease-in-out infinite;
  }
`;

const AdminNavItem = styled(motion.button)<{ isActive: boolean; isCollapsed: boolean }>`
  width: 100%;
  padding: ${props => props.isCollapsed ? '1rem' : '1rem 1.5rem'};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${props => props.isActive 
    ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(30, 58, 138, 0.1) 100%)'
    : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.isActive 
    ? props.theme.colors.stellarBlue 
    : 'transparent'};
  color: ${props => props.isActive 
    ? props.theme.colors.stellarBlue 
    : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  justify-content: ${props => props.isCollapsed ? 'center' : 'flex-start'};
  
  /* Command glow effect for active items */
  ${props => props.isActive && css`
    animation: ${commandGlow} 3s ease-in-out infinite;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: ${props => props.theme.gradients.commandCenter};
      border-radius: 0 2px 2px 0;
    }
  `}
  
  .admin-nav-icon {
    min-width: 24px;
    min-height: 24px;
    position: relative;
    transition: all 0.3s ease;
    
    /* Command effect for active icons */
    ${props => props.isActive && css`
      filter: drop-shadow(0 0 8px currentColor);
      
      &::before {
        content: '⚡';
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 0.7rem;
        color: ${props => props.theme.colors.cyberCyan};
        animation: ${commandFloat} 2s ease-in-out infinite;
      }
    `}
  }
  
  .admin-nav-text {
    font-size: 0.95rem;
    font-weight: 500;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transform: translateX(${props => props.isCollapsed ? '-20px' : '0'});
    transition: all 0.3s ease;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }
  
  /* Tooltip for collapsed state */
  .admin-nav-tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(10, 10, 15, 0.9);
    color: ${props => props.theme.colors.stellarWhite};
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    margin-left: 10px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: ${props => props.theme.shadows.commandGlow};
    z-index: 1000;
    
    &::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-right: 6px solid rgba(10, 10, 15, 0.9);
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
    }
  }
  
  &:hover {
    background: ${props => props.isActive 
      ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(30, 58, 138, 0.2) 100%)'
      : 'rgba(255, 255, 255, 0.05)'};
    color: ${props => props.theme.colors.stellarWhite};
    transform: translateX(${props => props.isCollapsed ? '0' : '4px'});
    
    .admin-nav-icon {
      transform: scale(1.1);
      filter: drop-shadow(0 0 12px currentColor);
    }
    
    .admin-nav-tooltip {
      opacity: ${props => props.isCollapsed ? '1' : '0'};
      transition: opacity 0.3s ease 0.2s;
    }
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.stellarBlue};
    outline-offset: -2px;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const AdminSidebarFooter = styled(motion.div)<{ isCollapsed: boolean }>`
  padding: 1rem;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(30, 58, 138, 0.3);
  backdrop-filter: blur(10px);
  
  .admin-version-info {
    text-align: center;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transition: all 0.3s ease;
  }
  
  .command-signature {
    background: ${props => props.theme.gradients.commandCenter};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 600;
    font-size: 0.8rem;
    text-align: center;
    margin-top: 0.5rem;
    opacity: ${props => props.isCollapsed ? '0' : '1'};
    transition: all 0.3s ease;
  }
`;

const AdminMobileBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const AdminMobileToggle = styled(motion.button)`
  position: fixed;
  top: calc(56px + 1rem);
  left: 1rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${props => props.theme.gradients.commandCenter};
  border: 2px solid rgba(59, 130, 246, 0.3);
  color: ${props => props.theme.colors.deepSpace};
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  box-shadow: ${props => props.theme.shadows.commandGlow};
  
  @media (max-width: 768px) {
    display: flex;
  }
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
  }
  
  &:focus {
    outline: 2px solid ${props => props.theme.colors.stellarBlue};
    outline-offset: 2px;
  }
`;

// === ENHANCED ADMIN NAVIGATION DATA WITH MCP INTEGRATION ===
interface AdminNavItemData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  section: 'overview' | 'management' | 'analytics' | 'system' | 'mcp' | 'social' | 'intelligence';
  badge?: number;
  route?: string;
  status?: 'online' | 'offline' | 'warning' | 'error';
  isNew?: boolean;
  isEnterprise?: boolean;
  subItems?: AdminNavItemData[];
}

// 🚀 MCP SERVER STATUS MONITORING
interface MCPServerStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'starting' | 'error';
  port: number;
  uptime?: string;
  lastSeen?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

const adminNavigationItems: AdminNavItemData[] = [
  // 🛡️ COMMAND CENTER
  { id: 'overview', label: 'Executive Dashboard', icon: Shield, section: 'overview', route: '/dashboard/default', isEnterprise: true },
  { id: 'analytics', label: 'Real-Time Analytics Hub', icon: BarChart3, section: 'overview', route: '/dashboard/analytics', isEnterprise: true },
  { id: 'business-intelligence', label: 'Business Intelligence Suite', icon: TrendingUp, section: 'overview', route: '/dashboard/business-intelligence', isNew: true, isEnterprise: true },
  
  // 🤖 MCP SERVER COMMAND CENTER
  { id: 'mcp-overview', label: 'MCP Command Center', icon: Database, section: 'mcp', route: '/dashboard/mcp-overview', isEnterprise: true },
  { id: 'workout-mcp', label: 'AI Workout Generator', icon: Dumbbell, section: 'mcp', route: '/dashboard/mcp/workout', status: 'online' },
  { id: 'gamification-mcp', label: 'Gamification Engine', icon: Gamepad2, section: 'mcp', route: '/dashboard/mcp/gamification', status: 'online' },
  { id: 'enhanced-gamification-mcp', label: 'Enhanced Gamification', icon: Star, section: 'mcp', route: '/dashboard/mcp/enhanced-gamification', status: 'online', isNew: true },
  { id: 'financial-events-mcp', label: 'Financial Events Engine', icon: DollarSign, section: 'mcp', route: '/dashboard/mcp/financial', status: 'online' },
  { id: 'yolo-mcp', label: 'YOLO Computer Vision', icon: Eye, section: 'mcp', route: '/dashboard/mcp/yolo', status: 'warning' },
  
  // 🌟 SOCIAL MEDIA & COMMUNITY COMMAND CENTER
  { id: 'social-overview', label: 'Social Media Command Center', icon: Heart, section: 'social', route: '/dashboard/social-overview', isEnterprise: true },
  { id: 'content-moderation', label: 'Content Moderation', icon: MessageSquare, section: 'social', route: '/dashboard/content-moderation', badge: 5 },
  { id: 'community-management', label: 'Community Management', icon: Users, section: 'social', route: '/dashboard/community', isEnterprise: true },
  { id: 'social-analytics', label: 'Social Analytics & Trends', icon: TrendingUp, section: 'social', route: '/dashboard/social-analytics', isNew: true },
  { id: 'engagement-optimization', label: 'Engagement Optimization', icon: Activity, section: 'social', route: '/dashboard/engagement', isEnterprise: true },
  
  // 👥 PLATFORM MANAGEMENT
  { id: 'user-management', label: 'User Management Suite', icon: Users, section: 'management', route: '/dashboard/user-management', isEnterprise: true },
  { id: 'trainers', label: 'Trainer Management', icon: UserCheck, section: 'management', route: '/dashboard/trainers' },
  { id: 'client-trainer-assignments', label: 'Client-Trainer Assignments', icon: Users, section: 'management', route: '/dashboard/client-trainer-assignments' },
  { id: 'client-management', label: 'Client Lifecycle Management', icon: Star, section: 'management', route: '/dashboard/client-management', isEnterprise: true },
  { id: 'admin-sessions', label: 'Session Management', icon: Calendar, section: 'management', route: '/dashboard/admin-sessions' },
  { id: 'master-schedule', label: 'Universal Master Schedule', icon: Calendar, section: 'management', route: '/dashboard/admin/master-schedule', isEnterprise: true },
  { id: 'session-allocation', label: 'Session Allocation Manager', icon: CreditCard, section: 'management', route: '/dashboard/admin/session-allocation', isEnterprise: true },
  { id: 'admin-packages', label: 'Package Management', icon: Package, section: 'management', route: '/dashboard/admin-packages' },
  
  // 📊 ADVANCED BUSINESS INTELLIGENCE
  { id: 'revenue-forecasting', label: 'Revenue Forecasting', icon: DollarSign, section: 'intelligence', route: '/dashboard/revenue-forecasting', isNew: true, isEnterprise: true },
  { id: 'predictive-analytics', label: 'Predictive Analytics', icon: TrendingUp, section: 'intelligence', route: '/dashboard/predictive-analytics', isNew: true, isEnterprise: true },
  { id: 'client-retention', label: 'Client Retention Analysis', icon: Heart, section: 'intelligence', route: '/dashboard/client-retention', isEnterprise: true },
  { id: 'performance-optimization', label: 'Performance Optimization', icon: Zap, section: 'intelligence', route: '/dashboard/performance-optimization', isEnterprise: true },
  { id: 'pending-orders', label: 'Order Management', icon: AlertTriangle, section: 'intelligence', route: '/dashboard/pending-orders', badge: 2 },
  { id: 'reports', label: 'Executive Reports', icon: FileText, section: 'intelligence', route: '/dashboard/reports', isEnterprise: true },
  { id: 'nasm-compliance', label: 'NASM Compliance Monitor', icon: Award, section: 'intelligence', route: '/dashboard/nasm-compliance' },
  
  // ⚙️ ENTERPRISE SYSTEM OPERATIONS
  { id: 'system-health', label: 'System Health Monitor', icon: Monitor, section: 'system', route: '/dashboard/system-health', status: 'online', isEnterprise: true },
  { id: 'database-optimization', label: 'Database Optimization', icon: Database, section: 'system', route: '/dashboard/database-optimization', isNew: true, isEnterprise: true },
  { id: 'api-monitoring', label: 'API Performance Monitor', icon: Activity, section: 'system', route: '/dashboard/api-monitoring', isEnterprise: true },
  { id: 'security', label: 'Security Command Center', icon: ShieldCheck, section: 'system', route: '/dashboard/security', isEnterprise: true },
  { id: 'audit-logs', label: 'Audit & Compliance Logs', icon: FileText, section: 'system', route: '/dashboard/audit-logs', isEnterprise: true },
  { id: 'backup-recovery', label: 'Backup & Recovery', icon: HardDrive, section: 'system', route: '/dashboard/backup-recovery', isEnterprise: true },
  { id: 'notifications', label: 'System Notifications', icon: MessageSquare, section: 'system', route: '/dashboard/notifications' },
  { id: 'settings', label: 'Enterprise Settings', icon: Settings, section: 'system', route: '/dashboard/settings', isEnterprise: true }
];

const adminSectionTitles = {
  overview: '🛡️ Executive Command Center',
  mcp: '🤖 MCP Server Operations',
  social: '🌟 Social Media & Community',
  management: '👥 Platform Management',
  intelligence: '📊 Business Intelligence',
  system: '⚙️ Enterprise System Operations'
};

// 🚀 MCP SERVER STATUS HOOKS
const useMCPServerStatus = () => {
  const [mcpServers, setMcpServers] = React.useState<MCPServerStatus[]>([
    { id: 'workout-mcp', name: 'AI Workout Generator', status: 'online', port: 3001, uptime: '2d 14h', memoryUsage: 45, cpuUsage: 12 },
    { id: 'gamification-mcp', name: 'Gamification Engine', status: 'online', port: 3002, uptime: '2d 14h', memoryUsage: 38, cpuUsage: 8 },
    { id: 'enhanced-gamification-mcp', name: 'Enhanced Gamification', status: 'online', port: 3003, uptime: '1d 8h', memoryUsage: 52, cpuUsage: 15 },
    { id: 'financial-events-mcp', name: 'Financial Events', status: 'online', port: 3004, uptime: '2d 14h', memoryUsage: 41, cpuUsage: 10 },
    { id: 'yolo-mcp', name: 'YOLO Computer Vision', status: 'warning', port: 3005, uptime: '6h 23m', memoryUsage: 78, cpuUsage: 25 }
  ]);
  
  // TODO: Replace with real API calls
  React.useEffect(() => {
    const fetchMCPStatus = async () => {
      try {
        // const response = await fetch('/api/admin/mcp-status');
        // const data = await response.json();
        // setMcpServers(data.servers);
      } catch (error) {
        console.warn('MCP status fetch failed, using mock data');
      }
    };
    
    fetchMCPStatus();
    const interval = setInterval(fetchMCPStatus, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return mcpServers;
};

// 🌟 MCP STATUS INDICATOR COMPONENT
const MCPStatusIndicator: React.FC<{ status: 'online' | 'offline' | 'starting' | 'error' | 'warning' }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'starting': return '#3b82f6';
      default: return '#6b7280';
    }
  };
  
  return (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        position: 'absolute',
        top: '2px',
        right: '2px',
        boxShadow: `0 0 6px ${getStatusColor()}`,
        animation: status === 'online' ? `${commandPulse} 2s ease-in-out infinite` : 'none'
      }}
    />
  );
};

// === COMPONENT PROPS ===
interface AdminStellarSidebarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
  className?: string;
}

// === MAIN COMPONENT ===
const AdminStellarSidebar: React.FC<AdminStellarSidebarProps> = ({
  activeSection: propActiveSection,
  onSectionChange,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 🚀 MCP Server Status Integration
  const mcpServers = useMCPServerStatus();
  
  // Determine active section from current route if not provided as prop
  const currentRoute = location.pathname;
  const activeSection = propActiveSection || (() => {
    const matchedItem = adminNavigationItems.find(item => 
      item.route && currentRoute.includes(item.route.replace('/dashboard', ''))
    );
    return matchedItem?.id || 'overview';
  })();
  
  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    const selectedItem = adminNavigationItems.find(item => item.id === sectionId);
    if (selectedItem?.route) {
      navigate(selectedItem.route);
    }
    
    // Call prop callback if provided
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
    
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };
  
  // Handle toggle
  const handleToggle = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };
  
  // Group navigation items by section
  const groupedItems = adminNavigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, AdminNavItemData[]>);
  
  // Animation variants
  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 }
  };
  
  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { staggerChildren: 0.05 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };
  
  return (
    <ThemeProvider theme={adminCommandTheme}>
      {/* Mobile Toggle */}
      <AdminMobileToggle
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle admin navigation menu"
        aria-expanded={isMobileOpen}
        role="button"
        tabIndex={0}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </AdminMobileToggle>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <AdminMobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Admin Sidebar Container */}
      <AdminSidebarContainer
        className={className}
        isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
        isMobile={isMobile}
        variants={!isMobile ? sidebarVariants : undefined}
        animate={!isMobile ? (isCollapsed ? 'collapsed' : 'expanded') : undefined}
        initial={false}
      >
        {/* Header */}
        <AdminSidebarHeader isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <AdminLogoContainer
            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
            onClick={() => handleSectionChange('overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="admin-logo-icon">
              <Command size={20} color={adminCommandTheme.colors.deepSpace} />
            </div>
            <span className="admin-logo-text">Command</span>
          </AdminLogoContainer>
          
          {!isMobile && (
            <AdminCollapseToggle
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
              aria-expanded={!isCollapsed}
              role="button"
              tabIndex={0}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </AdminCollapseToggle>
          )}
        </AdminSidebarHeader>
        
        {/* Navigation */}
        <AdminNavigationSection
          role="navigation"
          aria-label="Admin dashboard navigation"
        >
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <AdminSectionTitle 
                  isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                  variants={itemVariants}
                  role="heading"
                  aria-level={3}
                >
                  {adminSectionTitles[section as keyof typeof adminSectionTitles]}
                </AdminSectionTitle>
                
                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  
                  // 🚀 Get MCP server status if this is an MCP item
                  const mcpServer = mcpServers.find(server => server.id === item.id);
                  const effectiveStatus = item.status || mcpServer?.status;
                  
                  return (
                    <AdminNavItem
                      key={item.id}
                      isActive={isActive}
                      isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                      onClick={() => handleSectionChange(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSectionChange(item.id);
                        }
                      }}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-label={`Navigate to ${item.label}${item.badge ? ` - ${item.badge} pending items` : ''}${effectiveStatus ? ` - Status: ${effectiveStatus}` : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      role="menuitem"
                      tabIndex={0}
                    >
                      <div className="admin-nav-icon">
                        <IconComponent size={20} />
                        
                        {/* 🌟 MCP Status Indicator */}
                        {effectiveStatus && (
                          <MCPStatusIndicator status={effectiveStatus} />
                        )}
                        
                        {/* 🔔 Badge for pending items */}
                        {item.badge && (
                          <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: adminCommandTheme.colors.criticalRed,
                            color: 'white',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2
                          }}>
                            {item.badge}
                          </span>
                        )}
                        
                        {/* ⭐ Enterprise Badge */}
                        {item.isEnterprise && (
                          <span style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            background: adminCommandTheme.gradients.commandCenter,
                            color: adminCommandTheme.colors.deepSpace,
                            borderRadius: '3px',
                            width: '10px',
                            height: '6px',
                            fontSize: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            zIndex: 2
                          }}>
                            E
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <span className="admin-nav-text">{item.label}</span>
                        
                        {/* 🆕 NEW Badge */}
                        {item.isNew && (
                          <span style={{
                            background: adminCommandTheme.colors.successGreen,
                            color: 'white',
                            fontSize: '0.6rem',
                            padding: '0.125rem 0.25rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            animation: `${commandPulse} 3s ease-in-out infinite`
                          }}>
                            NEW
                          </span>
                        )}
                      </div>
                      
                      {/* 📊 Enhanced Tooltip with Status and Server Info */}
                      <div className="admin-nav-tooltip" style={{
                        minWidth: '200px',
                        padding: '0.75rem 1rem'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {item.label}
                        </div>
                        {mcpServer && (
                          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            <div>Port: {mcpServer.port}</div>
                            <div>Status: {mcpServer.status}</div>
                            <div>Uptime: {mcpServer.uptime}</div>
                            <div>Memory: {mcpServer.memoryUsage}%</div>
                            <div>CPU: {mcpServer.cpuUsage}%</div>
                          </div>
                        )}
                        {item.isEnterprise && (
                          <div style={{ 
                            fontSize: '0.6rem', 
                            color: adminCommandTheme.colors.cyberCyan,
                            marginTop: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            ENTERPRISE FEATURE
                          </div>
                        )}
                      </div>
                    </AdminNavItem>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </AdminNavigationSection>
        
        {/* Footer */}
        <AdminSidebarFooter isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <div className="admin-version-info">Admin Command v1.0</div>
          <div className="command-signature">Command Center by Seraphina</div>
        </AdminSidebarFooter>
      </AdminSidebarContainer>
    </ThemeProvider>
  );
};

export default AdminStellarSidebar;