/**
 * Enhanced Admin Client Management View
 * 7-Star AAA Personal Training & Social Media App
 *
 * Features:
 * - Advanced client profiles with photos and detailed assessments
 * - Real-time analytics and insights
 * - AI-powered features and recommendations
 * - Gamification integration
 * - Social features
 * - Professional assessment tools
 *
 * Migrated from MUI to styled-components + lucide-react
 * Galaxy-Swan theme (bg: rgba(15,23,42,0.95), border: rgba(14,165,233,0.2), text: #e2e8f0, accent: #0ea5e9)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import CreateClientModal from './CreateClientModal';
import ClientDetailsModal from './components/ClientDetailsModal';
import ClientAnalyticsPanel from './components/ClientAnalyticsPanel';
import ClientAssessmentModal from './components/ClientAssessmentModal';
import BulkActionDialog from './components/BulkActionDialog';
import ClientProgressDashboard from './components/ClientProgressDashboard';
import AIInsightsPanel from './components/AIInsightsPanel';
import GamificationOverview from './components/GamificationOverview';
import CommunicationCenter from './components/CommunicationCenter';

// lucide-react icons
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Eye,
  UserPlus,
  Key,
  Filter,
  XCircle,
  CheckCircle2,
  X,
  TrendingUp,
  Activity,
  ClipboardList,
  Settings,
  Save,
  Phone,
  Mail,
  MessageSquare,
  Video,
  Brain,
  Users,
  Share2,
  Bell,
  BarChart3,
  PieChart,
  LineChart,
  TrendingDown,
  Gauge,
  Star,
  Flame,
  Timer,
  Calendar,
  Clock,
  FileText,
  Camera,
  Paperclip,
  Send,
  ChevronRight,
  Home,
  Zap,
  Sparkles,
  Bot,
  Lightbulb,
  Monitor,
  ThumbsUp,
  ThumbsDown,
  Flag,
  AlertTriangle,
  ShieldOff,
  HeartPulse,
  Weight,
  Ruler,
  Cake,
  UserCircle,
  Trophy,
  Dumbbell,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';

// ─── Animations ───────────────────────────────────────────────────
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─── Galaxy-Swan Theme Tokens ─────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgSolid: '#0a0a1a',
  surface: '#1d1f2b',
  surfaceHover: 'rgba(255,255,255,0.05)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  borderActive: '#0ea5e9',
  text: '#e2e8f0',
  textSecondary: '#a0a0b0',
  accent: '#0ea5e9',
  accentGlow: 'rgba(14,165,233,0.3)',
  cyan: '#00ffff',
  purple: '#7851a9',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  gold: '#ffd700',
};

// ─── Base Styled Components ───────────────────────────────────────

const PageRoot = styled.div`
  background-color: ${theme.bgSolid};
  min-height: 100vh;
  color: ${theme.text};
`;

const PageContent = styled.div`
  padding: 24px;
`;

const GlassPanel = styled.div<{ $noPadding?: boolean; $hoverEffect?: boolean }>`
  background-color: ${theme.surface};
  color: ${theme.text};
  border-radius: 16px;
  border: 1px solid ${theme.border};
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  ${(p) => !p.$noPadding && 'padding: 24px;'}
  ${(p) =>
    p.$hoverEffect &&
    css`
      &:hover {
        box-shadow: 0 8px 32px rgba(14, 165, 233, 0.1);
        transform: translateY(-2px);
      }
    `}
`;

const CardPanel = styled.div<{ $borderColor?: string; $hoverEffect?: boolean }>`
  background-color: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid ${(p) => p.$borderColor || 'rgba(255,255,255,0.1)'};
  transition: all 0.3s ease;
  padding: 24px;
  ${(p) =>
    p.$hoverEffect &&
    css`
      &:hover {
        background-color: rgba(255, 255, 255, 0.05);
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(14, 165, 233, 0.1);
      }
    `}
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
`;

// ─── Typography ───────────────────────────────────────────────────

const PageTitle = styled.h2`
  color: ${theme.cyan};
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 4px 0;
`;

const PageSubtitle = styled.h5`
  color: ${theme.textSecondary};
  font-size: 1.1rem;
  font-weight: 400;
  margin: 0;
`;

const SectionTitle = styled.h4<{ $color?: string }>`
  color: ${(p) => p.$color || theme.cyan};
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatValue = styled.span<{ $color?: string }>`
  color: ${(p) => p.$color || theme.cyan};
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
`;

const MetricValue = styled.span<{ $color?: string }>`
  color: ${(p) => p.$color || theme.text};
  font-size: 1.15rem;
  font-weight: 600;
  display: block;
`;

const Label = styled.span<{ $color?: string; $size?: string }>`
  color: ${(p) => p.$color || theme.textSecondary};
  font-size: ${(p) => p.$size || '0.85rem'};
  display: block;
`;

const BodyText = styled.p<{ $color?: string; $bold?: boolean }>`
  color: ${(p) => p.$color || theme.text};
  font-weight: ${(p) => (p.$bold ? 600 : 400)};
  font-size: 0.9rem;
  margin: 0;
`;

const CaptionText = styled.span<{ $color?: string }>`
  color: ${(p) => p.$color || theme.textSecondary};
  font-size: 0.75rem;
`;

const ClientName = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
  display: block;
`;

const Username = styled.span`
  font-size: 0.85rem;
  color: ${theme.textSecondary};
  display: block;
`;

// ─── Buttons ──────────────────────────────────────────────────────

const ActionButton = styled.button<{
  $variant?: 'contained' | 'outlined';
  $size?: 'small' | 'medium';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  text-transform: none;
  font-weight: 600;
  font-size: ${(p) => (p.$size === 'small' ? '0.8rem' : '0.9rem')};
  padding: ${(p) => (p.$size === 'small' ? '6px 16px' : '10px 24px')};
  min-height: 44px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  font-family: inherit;

  ${(p) =>
    p.$variant === 'contained'
      ? css`
          background: linear-gradient(135deg, #00ffff, #00c8ff);
          color: #0a0a1a;
          border: none;
          &:hover {
            background: linear-gradient(135deg, #00e6ff, #00b3ff);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 255, 255, 0.4);
          }
        `
      : css`
          background-color: rgba(255, 255, 255, 0.05);
          color: ${theme.text};
          border: 1px solid rgba(0, 255, 255, 0.3);
          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: #00ffff;
            box-shadow: 0 4px 16px rgba(0, 255, 255, 0.2);
          }
        `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const RoundButton = styled.button<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => p.$size || 44}px;
  height: ${(p) => p.$size || 44}px;
  min-width: ${(p) => p.$size || 44}px;
  min-height: ${(p) => p.$size || 44}px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.text};
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background-color: rgba(14, 165, 233, 0.15);
    color: ${theme.cyan};
  }
`;

// ─── Grid Layouts ─────────────────────────────────────────────────

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const MCPGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const SearchFilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const FlexRow = styled.div<{ $gap?: number; $align?: string; $justify?: string; $wrap?: boolean }>`
  display: flex;
  gap: ${(p) => p.$gap ?? 8}px;
  align-items: ${(p) => p.$align || 'center'};
  justify-content: ${(p) => p.$justify || 'flex-start'};
  ${(p) => p.$wrap && 'flex-wrap: wrap;'}
`;

const FlexCol = styled.div<{ $gap?: number; $align?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap ?? 4}px;
  align-items: ${(p) => p.$align || 'stretch'};
`;

// ─── Search Input ─────────────────────────────────────────────────

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.textSecondary};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 16px 10px 44px;
  background-color: rgba(255, 255, 255, 0.05);
  color: ${theme.text};
  border-radius: 12px;
  border: 1px solid ${theme.border};
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${theme.textSecondary};
  }
  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    border-color: ${theme.borderHover};
  }
  &:focus {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: ${theme.cyan};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

// ─── Select ───────────────────────────────────────────────────────

const StyledSelect = styled.select`
  min-height: 44px;
  min-width: 140px;
  padding: 8px 32px 8px 12px;
  background-color: rgba(255, 255, 255, 0.05);
  color: ${theme.text};
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23a0a0b0' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.borderHover};
  }
  &:focus {
    border-color: ${theme.cyan};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }

  option {
    background-color: ${theme.surface};
    color: ${theme.text};
  }
`;

// ─── Checkbox ─────────────────────────────────────────────────────

const CheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const CheckboxBox = styled.span<{ $checked?: boolean; $indeterminate?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${(p) => (p.$checked || p.$indeterminate ? theme.cyan : 'rgba(255,255,255,0.3)')};
  background: ${(p) => (p.$checked || p.$indeterminate ? theme.cyan : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: '${(p) => (p.$indeterminate ? '\\2014' : p.$checked ? '\\2713' : '')}';
    color: #0a0a1a;
    font-size: ${(p) => (p.$indeterminate ? '14px' : '12px')};
    font-weight: 700;
  }
`;

// ─── Switch ───────────────────────────────────────────────────────

const SwitchWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-height: 44px;
`;

const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: ${(p) => (p.$checked ? theme.cyan : 'rgba(255,255,255,0.2)')};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

const SwitchThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${(p) => (p.$checked ? '20px' : '2px')};
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${(p) => (p.$checked ? '#0a0a1a' : '#ccc')};
  transition: left 0.2s ease;
`;

const HiddenSwitch = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

// ─── Chip ─────────────────────────────────────────────────────────

const StatusChip = styled.span<{
  $status?: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'info';
  $small?: boolean;
  $outlined?: boolean;
  $bgColor?: string;
  $textColor?: string;
}>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${(p) => (p.$small ? '2px 10px' : '4px 14px')};
  border-radius: 20px;
  font-size: ${(p) => (p.$small ? '0.75rem' : '0.85rem')};
  font-weight: 600;
  white-space: nowrap;

  ${(p) => {
    if (p.$bgColor) {
      return css`
        background: ${p.$bgColor};
        color: ${p.$textColor || '#fff'};
      `;
    }
    if (p.$outlined) {
      const borderMap: Record<string, string> = {
        success: theme.success,
        warning: theme.warning,
        error: theme.error,
        info: theme.accent,
      };
      const c = borderMap[p.$status || ''] || theme.textSecondary;
      return css`
        background: transparent;
        border: 1px solid ${c};
        color: ${c};
      `;
    }
    switch (p.$status) {
      case 'active':
      case 'success':
        return css`
          background: linear-gradient(135deg, #4caf50, #81c784);
          color: white;
        `;
      case 'inactive':
      case 'error':
        return css`
          background: linear-gradient(135deg, #f44336, #ef5350);
          color: white;
        `;
      case 'pending':
      case 'warning':
        return css`
          background: linear-gradient(135deg, #ff9800, #ffb74d);
          color: white;
        `;
      case 'info':
        return css`
          background: linear-gradient(135deg, #2196f3, #64b5f6);
          color: white;
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.1);
          color: ${theme.text};
        `;
    }
  }}
`;

// ─── Avatar ───────────────────────────────────────────────────────

const AvatarCircle = styled.div<{ $size?: number; $borderColor?: string }>`
  width: ${(p) => p.$size || 56}px;
  height: ${(p) => p.$size || 56}px;
  border-radius: 50%;
  background: ${theme.cyan};
  color: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: ${(p) => ((p.$size || 56) * 0.35)}px;
  border: 2px solid ${(p) => p.$borderColor || 'rgba(0, 255, 255, 0.3)'};
  overflow: hidden;
  flex-shrink: 0;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const BadgeDot = styled.span<{ $active?: boolean }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? theme.success : theme.error)};
  border: 2px solid ${theme.surface};
`;

const AvatarWithBadge = styled.div`
  position: relative;
  display: inline-flex;
`;

// ─── Badge Avatar (small for badges) ─────────────────────────────

const SmallBadgeAvatar = styled.div<{ $borderColor?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid ${(p) => p.$borderColor || theme.textSecondary};
  background: rgba(255, 255, 255, 0.05);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

// ─── Alert ────────────────────────────────────────────────────────

const AlertBox = styled.div<{ $severity?: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.85rem;

  ${(p) => {
    switch (p.$severity) {
      case 'success':
        return css`
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          color: ${theme.success};
        `;
      case 'warning':
        return css`
          background: rgba(255, 152, 0, 0.1);
          border: 1px solid rgba(255, 152, 0, 0.3);
          color: ${theme.warning};
        `;
      case 'error':
        return css`
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
          color: ${theme.error};
        `;
      case 'info':
      default:
        return css`
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.3);
          color: ${theme.accent};
        `;
    }
  }}
`;

const AlertTitle = styled.strong`
  display: block;
  margin-bottom: 2px;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  align-items: center;
  flex-shrink: 0;
`;

// ─── Table ────────────────────────────────────────────────────────

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background-color: #252742;
`;

const TBody = styled.tbody``;

const Tr = styled.tr`
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(14, 165, 233, 0.08);
  }
`;

const Th = styled.th<{ $checkbox?: boolean }>`
  padding: ${(p) => (p.$checkbox ? '8px 12px' : '14px 16px')};
  text-align: left;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${theme.text};
  border-bottom: 1px solid ${theme.border};
  white-space: nowrap;
`;

const Td = styled.td<{ $checkbox?: boolean }>`
  padding: ${(p) => (p.$checkbox ? '8px 12px' : '14px 16px')};
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: ${theme.text};
  font-size: 0.875rem;
  vertical-align: top;
`;

// ─── Pagination ───────────────────────────────────────────────────

const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.85rem;
  color: ${theme.textSecondary};
  flex-wrap: wrap;
`;

const PaginationSelect = styled.select`
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.text};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  min-height: 32px;

  option {
    background: ${theme.surface};
    color: ${theme.text};
  }
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: transparent;
  color: ${(p) => (p.$disabled ? 'rgba(255,255,255,0.2)' : theme.text)};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.15s ease;
  pointer-events: ${(p) => (p.$disabled ? 'none' : 'auto')};

  &:hover {
    background-color: rgba(14, 165, 233, 0.1);
    border-color: ${theme.borderHover};
  }
`;

// ─── Progress Bar ─────────────────────────────────────────────────

const ProgressBarTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number }>`
  height: 100%;
  border-radius: 4px;
  width: ${(p) => Math.min(100, Math.max(0, p.$value))}%;
  background: linear-gradient(90deg, ${theme.cyan}, ${theme.purple});
  transition: width 0.4s ease;
`;

// ─── Breadcrumbs ──────────────────────────────────────────────────

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
`;

const BreadcrumbLink = styled.a`
  color: ${theme.textSecondary};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 4px;

  &:hover {
    color: ${theme.cyan};
    text-decoration: underline;
  }
`;

const BreadcrumbCurrent = styled.span`
  color: ${theme.text};
`;

const BreadcrumbSep = styled.span`
  color: #666;
`;

// ─── Tabs ─────────────────────────────────────────────────────────

const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 24px;
  overflow-x: auto;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${(p) => (p.$active ? theme.cyan : theme.textSecondary)};
  font-size: 1rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 3px solid ${(p) => (p.$active ? theme.cyan : 'transparent')};
  border-radius: 3px 3px 0 0;
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.cyan};
    background: rgba(14, 165, 233, 0.05);
  }
`;

// ─── Context Menu / Dropdown ──────────────────────────────────────

const DropdownOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

const DropdownMenu = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${(p) => p.$y}px;
  left: ${(p) => p.$x}px;
  z-index: 1000;
  background: #252742;
  color: ${theme.text};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 6px 0;
  min-width: 200px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  animation: ${fadeIn} 0.15s ease;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${theme.text};
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
  }

  svg {
    flex-shrink: 0;
    color: ${theme.textSecondary};
  }
`;

// ─── Speed Dial / FAB ─────────────────────────────────────────────

const FABContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 900;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
`;

const FABButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0, 255, 255, 0.4);
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: scale(1.05);
    box-shadow: 0 8px 28px rgba(0, 255, 255, 0.5);
  }
`;

const SpeedDialActions = styled.div<{ $open?: boolean }>`
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  align-items: center;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  transform: ${(p) => (p.$open ? 'translateY(0)' : 'translateY(10px)')};
  pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
  transition: all 0.3s ease;
`;

const SpeedDialActionBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: ${theme.surface};
  color: ${theme.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid ${theme.border};
  transition: all 0.2s ease;
  position: relative;
  min-height: 44px;

  &:hover {
    background: rgba(14, 165, 233, 0.2);
    border-color: ${theme.cyan};
  }
`;

// ─── Skeleton / Shimmer ───────────────────────────────────────────

const SkeletonBox = styled.div<{ $width?: string; $height?: string }>`
  width: ${(p) => p.$width || '100%'};
  height: ${(p) => p.$height || '20px'};
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Metric Cell (for table cells with centered metric) ──────────

const MetricCell = styled.div`
  text-align: center;
`;

// ─── Define interfaces ────────────────────────────────────────────
interface EnhancedAdminClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  profileImageUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal: string;
  trainingExperience: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions: number;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  // Enhanced fields
  totalWorkouts: number;
  workoutStreak: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
  totalOrders: number;
  achievements: Achievement[];
  currentProgram?: string;
  trainerName?: string;
  socialScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  aiInsights: AIInsight[];
  customFields: Record<string, any>;
  // Gamification
  level: number;
  xp: number;
  badges: ClientBadge[];
  rank: string;
  // Assessment scores
  initialAssessment?: AssessmentScore;
  latestAssessment?: AssessmentScore;
  progressScore: number;
  bodyComposition?: BodyComposition;
  // Communication
  lastContactDate?: string;
  preferredContactMethod: 'email' | 'phone' | 'app';
  communicationNotes?: string;
  // Medical/Health
  injuryHistory: Injury[];
  medicationList?: string[];
  allergies?: string[];
  // Video Analysis
  formAnalysisScore?: number;
  lastFormCheck?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  date: string;
  points: number;
}

interface AIInsight {
  type: 'recommendation' | 'warning' | 'achievement';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

interface AssessmentScore {
  overall: number;
  strength: number;
  endurance: number;
  flexibility: number;
  balance: number;
  date: string;
}

interface BodyComposition {
  bodyFat: number;
  muscleMass: number;
  waterPercentage: number;
  metabolicAge: number;
  lastMeasured: string;
}

interface Injury {
  type: string;
  description: string;
  date: string;
  status: 'active' | 'healing' | 'recovered';
  restrictions?: string[];
}

interface ClientBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ─── Main component ──────────────────────────────────────────────
const EnhancedAdminClientManagementView: React.FC = () => {
  const { authAxios, services } = useAuth();
  const { toast } = useToast();

  // State management
  const [clients, setClients] = useState<EnhancedAdminClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<EnhancedAdminClient | null>(null);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<EnhancedAdminClient | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // Speed dial state
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Quick stats state
  const [quickStats, setQuickStats] = useState<Record<string, any>>({});
  const [mcpStatus, setMcpStatus] = useState<any>(null);

  // Create mock enhanced client data
  const generateMockClients = (): EnhancedAdminClient[] => [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      phone: '+1 (555) 123-4567',
      profileImageUrl: '/api/placeholder/64/64',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      weight: 82,
      height: 180,
      fitnessGoal: 'Build muscle and strength',
      trainingExperience: 'intermediate',
      healthConcerns: 'Previous lower back issues',
      emergencyContact: 'Jane Doe - +1 (555) 987-6543',
      availableSessions: 5,
      isActive: true,
      role: 'client',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-12-10T14:30:00Z',
      totalWorkouts: 127,
      workoutStreak: 15,
      lastWorkoutDate: '2024-12-10',
      nextSessionDate: '2024-12-15',
      totalOrders: 8,
      achievements: [
        { id: '1', title: 'First Workout', description: 'Completed your first workout', iconUrl: '/icons/first-workout.png', date: '2024-01-16', points: 100 },
        { id: '2', title: 'Consistency King', description: '30-day workout streak', iconUrl: '/icons/streak.png', date: '2024-11-20', points: 500 }
      ],
      currentProgram: 'Strength & Hypertrophy Phase 2',
      trainerName: 'Sarah Wilson',
      socialScore: 85,
      engagementLevel: 'high',
      riskFactors: ['Previous back injury'],
      aiInsights: [
        { type: 'recommendation', title: 'Increase Deadlift Volume', description: 'Based on your progress, you can handle 10% more volume', confidence: 0.92, actionable: true },
        { type: 'achievement', title: 'Personal Record Incoming', description: 'You\'re likely to hit a PR in your next bench press session', confidence: 0.78, actionable: false }
      ],
      customFields: {
        preferredGym: 'Downtown Location',
        workoutTime: 'Morning (6-8 AM)',
        musicPreference: 'Hip-hop/Electronic'
      },
      level: 15,
      xp: 12500,
      badges: [
        { id: '1', name: 'Iron Pumper', description: 'Lifted 1000+ lbs total', iconUrl: '/badges/iron.png', rarity: 'rare' },
        { id: '2', name: 'Consistency Champion', description: '90% attendance rate', iconUrl: '/badges/consistent.png', rarity: 'epic' }
      ],
      rank: 'Gold III',
      initialAssessment: { overall: 6.2, strength: 6.0, endurance: 6.5, flexibility: 5.8, balance: 6.3, date: '2024-01-15' },
      latestAssessment: { overall: 8.7, strength: 9.2, endurance: 8.5, flexibility: 8.0, balance: 8.8, date: '2024-12-01' },
      progressScore: 94,
      bodyComposition: { bodyFat: 12.5, muscleMass: 72.3, waterPercentage: 62.1, metabolicAge: 25, lastMeasured: '2024-12-01' },
      lastContactDate: '2024-12-08',
      preferredContactMethod: 'app',
      injuryHistory: [
        { type: 'Lower back strain', description: 'Lifting incident in 2023', date: '2023-03-15', status: 'recovered', restrictions: ['No heavy deadlifts for 6 weeks'] }
      ],
      allergies: ['Shellfish'],
      formAnalysisScore: 88,
      lastFormCheck: '2024-12-05'
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      username: 'janesmith',
      phone: '+1 (555) 234-5678',
      profileImageUrl: '/api/placeholder/64/64',
      dateOfBirth: '1985-08-22',
      gender: 'female',
      weight: 65,
      height: 165,
      fitnessGoal: 'Weight loss and toning',
      trainingExperience: 'beginner',
      emergencyContact: 'Michael Smith - +1 (555) 876-5432',
      availableSessions: 8,
      isActive: true,
      role: 'client',
      createdAt: '2024-03-20T09:15:00Z',
      updatedAt: '2024-12-09T16:45:00Z',
      totalWorkouts: 45,
      workoutStreak: 7,
      lastWorkoutDate: '2024-12-08',
      nextSessionDate: '2024-12-12',
      totalOrders: 3,
      achievements: [
        { id: '3', title: 'Getting Started', description: 'Completed 10 workouts', iconUrl: '/icons/started.png', date: '2024-04-10', points: 200 }
      ],
      currentProgram: 'Beginner Fat Loss Program',
      trainerName: 'Mike Johnson',
      socialScore: 62,
      engagementLevel: 'medium',
      riskFactors: ['New to exercise'],
      aiInsights: [
        { type: 'recommendation', title: 'Focus on Form', description: 'Prioritize technique over weight for the next 2 weeks', confidence: 0.95, actionable: true },
        { type: 'warning', title: 'Progress Plateau', description: 'Weight loss has stalled, consider diet review', confidence: 0.71, actionable: true }
      ],
      customFields: {
        dietaryRestrictions: 'Vegetarian',
        fitnessGoals: ['Lose 20 lbs', 'Run 5K']
      },
      level: 8,
      xp: 4200,
      badges: [
        { id: '3', name: 'First Steps', description: 'Started your fitness journey', iconUrl: '/badges/first.png', rarity: 'common' }
      ],
      rank: 'Bronze II',
      initialAssessment: { overall: 4.5, strength: 4.0, endurance: 4.8, flexibility: 5.2, balance: 4.5, date: '2024-03-20' },
      latestAssessment: { overall: 6.8, strength: 6.5, endurance: 7.2, flexibility: 6.8, balance: 6.5, date: '2024-11-15' },
      progressScore: 78,
      bodyComposition: { bodyFat: 28.5, muscleMass: 38.2, waterPercentage: 58.5, metabolicAge: 32, lastMeasured: '2024-11-15' },
      lastContactDate: '2024-12-09',
      preferredContactMethod: 'email',
      injuryHistory: [],
      allergies: ['Peanuts'],
      formAnalysisScore: 75,
      lastFormCheck: '2024-12-03'
    }
  ];

  // Initialize with mock data
  useEffect(() => {
    const mockData = generateMockClients();
    setClients(mockData);
    setTotalCount(mockData.length);
    setLoading(false);

    // Set mock quick stats
    setQuickStats({
      totalClients: mockData.length,
      activeClients: mockData.filter(c => c.isActive).length,
      newThisMonth: 5,
      avgProgress: 82,
      totalWorkouts: mockData.reduce((sum, c) => sum + c.totalWorkouts, 0),
      totalRevenue: 45680,
      retentionRate: 94.5,
      avgRating: 4.8
    });

    // Mock MCP status
    setMcpStatus({
      servers: [
        { name: 'Workout MCP', status: 'online', health: 98, responseTime: 45 },
        { name: 'Gamification MCP', status: 'online', health: 95, responseTime: 52 },
        { name: 'YOLO MCP', status: 'online', health: 92, responseTime: 78 },
        { name: 'Social Media MCP', status: 'warning', health: 85, responseTime: 120 },
        { name: 'Food Scanner MCP', status: 'online', health: 97, responseTime: 38 },
        { name: 'Video Processing MCP', status: 'online', health: 90, responseTime: 95 }
      ],
      summary: { online: 5, offline: 0, error: 0, warning: 1 }
    });
  }, []);

  // Handle search
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(client =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  // Handle various actions
  const handleViewDetails = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleSendMessage = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setCurrentTab(5); // Switch to Communication tab
  };

  const handleVideoCall = (client: EnhancedAdminClient) => {
    setSelectedClient(client);
    setCurrentTab(5); // Switch to Communication tab and start video call
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: EnhancedAdminClient) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom + 4 });
    setAnchorEl(event.currentTarget);
    setMenuClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuClient(null);
  };

  const handleEdit = (client: EnhancedAdminClient) => {
    // TODO: Implement edit functionality
    toast({
      title: "Feature Coming Soon",
      description: "Edit functionality will be available in the next update.",
      variant: "default"
    });
    handleMenuClose();
  };

  // Helper: engagement chip status
  const engagementStatus = (level: string): 'success' | 'warning' | 'error' => {
    if (level === 'high') return 'success';
    if (level === 'medium') return 'warning';
    return 'error';
  };

  // Helper: badge rarity color
  const rarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#9c27b0';
      case 'rare': return '#2196f3';
      default: return '#4caf50';
    }
  };

  // Helper: MCP server border color
  const serverBorderColor = (status: string): string => {
    if (status === 'online') return 'rgba(76, 175, 80, 0.3)';
    if (status === 'warning') return 'rgba(255, 152, 0, 0.3)';
    return 'rgba(244, 67, 54, 0.3)';
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const paginatedClients = filteredClients.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  const startRow = currentPage * rowsPerPage + 1;
  const endRow = Math.min((currentPage + 1) * rowsPerPage, filteredClients.length);

  // Render enhanced client table
  const renderEnhancedClientTable = () => (
    <GlassPanel $noPadding $hoverEffect>
      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <Th $checkbox>
                <CheckboxLabel>
                  <HiddenCheckbox
                    checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                    onChange={handleSelectAll}
                  />
                  <CheckboxBox
                    $checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                    $indeterminate={selectedClients.length > 0 && selectedClients.length < filteredClients.length}
                  />
                </CheckboxLabel>
              </Th>
              <Th>Client Profile</Th>
              <Th>Performance Metrics</Th>
              <Th>Engagement &amp; Social</Th>
              <Th>Progress &amp; Goals</Th>
              <Th>Health &amp; Safety</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <TBody>
            {paginatedClients.map((client) => (
              <Tr key={client.id}>
                <Td $checkbox>
                  <CheckboxLabel>
                    <HiddenCheckbox
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleClientSelect(client.id)}
                    />
                    <CheckboxBox $checked={selectedClients.includes(client.id)} />
                  </CheckboxLabel>
                </Td>

                {/* Client Profile */}
                <Td>
                  <FlexRow $gap={12} $align="center">
                    <AvatarWithBadge>
                      <AvatarCircle $size={56}>
                        {client.profileImageUrl
                          ? <img src={client.profileImageUrl} alt={`${client.firstName} ${client.lastName}`} />
                          : `${client.firstName[0]}${client.lastName[0]}`}
                      </AvatarCircle>
                      <BadgeDot $active={client.isActive} />
                    </AvatarWithBadge>
                    <FlexCol $gap={2}>
                      <ClientName>{client.firstName} {client.lastName}</ClientName>
                      <Username>@{client.username}</Username>
                      <FlexRow $gap={6} style={{ marginTop: 4 }}>
                        <StatusChip $small $bgColor="rgba(120, 81, 169, 0.2)" $textColor="#7851a9">
                          Level {client.level}
                        </StatusChip>
                        <StatusChip $small $bgColor="rgba(255, 215, 0, 0.2)" $textColor="#ffd700">
                          {client.rank}
                        </StatusChip>
                      </FlexRow>
                    </FlexCol>
                  </FlexRow>
                </Td>

                {/* Performance Metrics */}
                <Td>
                  <div style={{ minWidth: 200 }}>
                    <FlexRow $justify="space-between" style={{ marginBottom: 6 }}>
                      <BodyText>Progress Score</BodyText>
                      <BodyText $color={theme.cyan} $bold>{client.progressScore}%</BodyText>
                    </FlexRow>
                    <ProgressBarTrack>
                      <ProgressBarFill $value={client.progressScore} />
                    </ProgressBarTrack>
                    <FlexRow $gap={16} style={{ marginTop: 8 }}>
                      <MetricCell>
                        <MetricValue $color={theme.success}>{client.totalWorkouts}</MetricValue>
                        <CaptionText>Workouts</CaptionText>
                      </MetricCell>
                      <MetricCell>
                        <MetricValue $color={theme.warning}>{client.workoutStreak}</MetricValue>
                        <CaptionText>Streak</CaptionText>
                      </MetricCell>
                      <MetricCell>
                        <MetricValue $color={theme.error}>{client.availableSessions}</MetricValue>
                        <CaptionText>Sessions</CaptionText>
                      </MetricCell>
                    </FlexRow>
                  </div>
                </Td>

                {/* Engagement & Social */}
                <Td>
                  <FlexCol $gap={6}>
                    <FlexRow $gap={6}>
                      <BodyText>Social Score:</BodyText>
                      <BodyText $color={theme.cyan} $bold>{client.socialScore}/100</BodyText>
                    </FlexRow>
                    <div>
                      <StatusChip $small $outlined $status={engagementStatus(client.engagementLevel)}>
                        {client.engagementLevel}
                      </StatusChip>
                    </div>
                    <FlexRow $gap={4} style={{ marginTop: 4 }}>
                      {client.badges.slice(0, 3).map(badge => (
                        <SmallBadgeAvatar key={badge.id} $borderColor={rarityColor(badge.rarity)} title={badge.description}>
                          <img src={badge.iconUrl} alt={badge.name} />
                        </SmallBadgeAvatar>
                      ))}
                      {client.badges.length > 3 && (
                        <CaptionText style={{ marginLeft: 4 }}>
                          +{client.badges.length - 3} more
                        </CaptionText>
                      )}
                    </FlexRow>
                  </FlexCol>
                </Td>

                {/* Progress & Goals */}
                <Td>
                  <FlexCol $gap={4}>
                    <BodyText>
                      <strong>Goal:</strong> {client.fitnessGoal.substring(0, 30)}...
                    </BodyText>
                    <BodyText $color={theme.textSecondary}>
                      <strong>Program:</strong> {client.currentProgram}
                    </BodyText>
                    <FlexRow $gap={16} style={{ marginTop: 6 }}>
                      <MetricCell>
                        <CaptionText $color={theme.cyan}>Overall</CaptionText>
                        <MetricValue>{client.latestAssessment?.overall || 0}</MetricValue>
                      </MetricCell>
                      <MetricCell>
                        <CaptionText $color={theme.success}>Strength</CaptionText>
                        <MetricValue>{client.latestAssessment?.strength || 0}</MetricValue>
                      </MetricCell>
                      <MetricCell>
                        <CaptionText $color={theme.warning}>Endurance</CaptionText>
                        <MetricValue>{client.latestAssessment?.endurance || 0}</MetricValue>
                      </MetricCell>
                    </FlexRow>
                  </FlexCol>
                </Td>

                {/* Health & Safety */}
                <Td>
                  <FlexCol $gap={6}>
                    {client.riskFactors.length > 0 ? (
                      <AlertBox $severity="warning" style={{ padding: '6px 10px' }}>
                        <AlertTriangle size={14} />
                        <CaptionText>{client.riskFactors[0]}</CaptionText>
                      </AlertBox>
                    ) : (
                      <AlertBox $severity="success" style={{ padding: '6px 10px' }}>
                        <CheckCircle2 size={14} />
                        <CaptionText>No risk factors</CaptionText>
                      </AlertBox>
                    )}
                    {client.formAnalysisScore && (
                      <FlexRow $gap={6}>
                        <Monitor size={16} color={theme.cyan} />
                        <CaptionText>Form Score: {client.formAnalysisScore}%</CaptionText>
                      </FlexRow>
                    )}
                  </FlexCol>
                </Td>

                {/* Actions */}
                <Td>
                  <FlexRow $gap={4}>
                    <RoundButton title="View Details" onClick={() => handleViewDetails(client)}>
                      <Eye size={18} />
                    </RoundButton>
                    <RoundButton title="Send Message" onClick={() => handleSendMessage(client)}>
                      <MessageSquare size={18} />
                    </RoundButton>
                    <RoundButton title="Start Video Call" onClick={() => handleVideoCall(client)}>
                      <Video size={18} />
                    </RoundButton>
                    <RoundButton
                      title="More actions"
                      onClick={(e) => handleMenuOpen(e, client)}
                    >
                      <MoreVertical size={18} />
                    </RoundButton>
                  </FlexRow>
                </Td>
              </Tr>
            ))}
          </TBody>
        </StyledTable>
      </TableWrapper>

      {/* Pagination */}
      <PaginationBar>
        <span>Rows per page:</span>
        <PaginationSelect
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setCurrentPage(0);
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </PaginationSelect>
        <span>{startRow}-{endRow} of {filteredClients.length}</span>
        <FlexRow $gap={4}>
          <PaginationButton
            $disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </PaginationButton>
          <PaginationButton
            $disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            title="Next page"
          >
            <ChevronRight size={18} />
          </PaginationButton>
        </FlexRow>
      </PaginationBar>
    </GlassPanel>
  );

  return (
    <PageRoot>
      <PageContent>
        {/* Enhanced Header with Breadcrumbs */}
        <div style={{ marginBottom: 32 }}>
          <BreadcrumbNav aria-label="breadcrumb">
            <BreadcrumbLink href="/dashboard">
              <Home size={16} />
              Dashboard
            </BreadcrumbLink>
            <BreadcrumbSep>/</BreadcrumbSep>
            <BreadcrumbCurrent>Client Management</BreadcrumbCurrent>
          </BreadcrumbNav>

          <PageTitle>Client Management Central</PageTitle>
          <PageSubtitle>Comprehensive client oversight, analytics, and engagement tools</PageSubtitle>
        </div>

        {/* Enhanced Quick Stats Grid */}
        <StatsGrid>
          <CardPanel $hoverEffect>
            <FlexRow $justify="space-between" $align="center">
              <FlexCol $gap={4}>
                <StatValue $color={theme.cyan}>
                  {quickStats.totalClients || 0}
                </StatValue>
                <Label>Total Clients</Label>
                <FlexRow $gap={4} style={{ marginTop: 4 }}>
                  <TrendingUp size={16} color={theme.success} />
                  <CaptionText $color={theme.success}>+12% vs last month</CaptionText>
                </FlexRow>
              </FlexCol>
              <Users size={48} color="rgba(0, 255, 255, 0.3)" />
            </FlexRow>
          </CardPanel>

          <CardPanel $hoverEffect>
            <FlexRow $justify="space-between" $align="center">
              <FlexCol $gap={4}>
                <StatValue $color={theme.success}>
                  {quickStats.activeClients || 0}
                </StatValue>
                <Label>Active This Week</Label>
                <FlexRow $gap={4} style={{ marginTop: 4 }}>
                  <Flame size={16} color="#ff5722" />
                  <CaptionText $color="#ff5722">
                    {quickStats.totalClients ? ((quickStats.activeClients / quickStats.totalClients) * 100).toFixed(1) : 0}% engagement
                  </CaptionText>
                </FlexRow>
              </FlexCol>
              <CheckCircle2 size={48} color="rgba(76, 175, 80, 0.3)" />
            </FlexRow>
          </CardPanel>

          <CardPanel $hoverEffect>
            <FlexRow $justify="space-between" $align="center">
              <FlexCol $gap={4}>
                <StatValue $color={theme.warning}>
                  ${(quickStats.totalRevenue || 0).toLocaleString()}
                </StatValue>
                <Label>This Month</Label>
                <FlexRow $gap={4} style={{ marginTop: 4 }}>
                  <TrendingUp size={16} color={theme.success} />
                  <CaptionText $color={theme.success}>+8.5% vs last month</CaptionText>
                </FlexRow>
              </FlexCol>
              <BarChart3 size={48} color="rgba(255, 152, 0, 0.3)" />
            </FlexRow>
          </CardPanel>

          <CardPanel $hoverEffect>
            <FlexRow $justify="space-between" $align="center">
              <FlexCol $gap={4}>
                <StatValue $color="#9c27b0">
                  {quickStats.avgProgress || 0}%
                </StatValue>
                <Label>Avg Progress Score</Label>
                <FlexRow $gap={4} style={{ marginTop: 4 }}>
                  <Star size={16} color={theme.gold} />
                  <CaptionText $color={theme.gold}>
                    {quickStats.avgRating || 0}/5.0 satisfaction
                  </CaptionText>
                </FlexRow>
              </FlexCol>
              <ClipboardList size={48} color="rgba(156, 39, 176, 0.3)" />
            </FlexRow>
          </CardPanel>
        </StatsGrid>

        {/* MCP System Health */}
        {mcpStatus && (
          <GlassPanel style={{ marginBottom: 24 }}>
            <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
              <SectionTitle>
                <Zap size={24} />
                AI &amp; MCP System Health
              </SectionTitle>
              <ActionButton
                $variant="outlined"
                $size="small"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} />
                Refresh Status
              </ActionButton>
            </FlexRow>

            <MCPGrid>
              {mcpStatus.servers.map((server: any, index: number) => (
                <CardPanel key={index} $borderColor={serverBorderColor(server.status)} style={{ padding: 16 }}>
                  <FlexRow $justify="space-between" $align="center">
                    <BodyText $bold>{server.name}</BodyText>
                    <StatusChip
                      $small
                      $status={
                        server.status === 'online' ? 'success' :
                        server.status === 'warning' ? 'warning' : 'error'
                      }
                    >
                      {server.status}
                    </StatusChip>
                  </FlexRow>
                  <FlexRow $gap={24} style={{ marginTop: 8 }}>
                    <FlexCol $gap={0}>
                      <Label $size="0.75rem">Health</Label>
                      <MetricValue $color={server.health > 90 ? theme.success : theme.warning}>
                        {server.health}%
                      </MetricValue>
                    </FlexCol>
                    <FlexCol $gap={0}>
                      <Label $size="0.75rem">Response</Label>
                      <MetricValue $color={server.responseTime < 100 ? theme.success : theme.warning}>
                        {server.responseTime}ms
                      </MetricValue>
                    </FlexCol>
                  </FlexRow>
                </CardPanel>
              ))}
            </MCPGrid>
          </GlassPanel>
        )}

        {/* Enhanced Search and Filter Bar */}
        <SearchFilterRow>
          <SearchInputWrapper>
            <SearchIcon><Search size={18} /></SearchIcon>
            <SearchInput
              placeholder="Search clients by name, email, username..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </SearchInputWrapper>

          <FilterGroup>
            <StyledSelect
              value={filters.level || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner (1-5)</option>
              <option value="intermediate">Intermediate (6-15)</option>
              <option value="advanced">Advanced (16+)</option>
            </StyledSelect>

            <StyledSelect
              value={filters.engagement || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, engagement: e.target.value }))}
            >
              <option value="">All Engagement</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </StyledSelect>

            <ActionButton
              $variant="outlined"
              $size="small"
              onClick={() => {/* TODO: Advanced filters modal */}}
            >
              <Filter size={16} />
              Advanced Filters
            </ActionButton>

            <SwitchWrapper>
              <HiddenSwitch
                checked={viewMode === 'grid'}
                onChange={(e) => setViewMode(e.target.checked ? 'grid' : 'table')}
              />
              <SwitchTrack $checked={viewMode === 'grid'}>
                <SwitchThumb $checked={viewMode === 'grid'} />
              </SwitchTrack>
              <CaptionText>Grid View</CaptionText>
            </SwitchWrapper>
          </FilterGroup>
        </SearchFilterRow>

        {/* Bulk Actions Bar */}
        {selectedClients.length > 0 && (
          <AlertBox $severity="info" style={{ marginBottom: 24, alignItems: 'center' }}>
            <AlertContent>
              <AlertTitle>Bulk Actions</AlertTitle>
              {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} selected
            </AlertContent>
            <AlertActions>
              <ActionButton $variant="outlined" $size="small">
                Send Message
              </ActionButton>
              <ActionButton $variant="outlined" $size="small">
                Export Data
              </ActionButton>
              <ActionButton
                $variant="outlined"
                $size="small"
                onClick={() => setShowBulkActionDialog(true)}
              >
                More Actions
              </ActionButton>
            </AlertActions>
          </AlertBox>
        )}

        {/* Action Buttons Row */}
        <FlexRow $gap={12} $wrap style={{ marginBottom: 24 }}>
          <ActionButton
            $variant="contained"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus size={18} />
            Add New Client
          </ActionButton>

          <ActionButton
            $variant="outlined"
            onClick={() => {/* TODO: Open analytics view */}}
          >
            <ClipboardList size={18} />
            View Analytics
          </ActionButton>

          <ActionButton
            $variant="outlined"
            onClick={() => {/* TODO: Export functionality */}}
          >
            <Download size={18} />
            Export Client Data
          </ActionButton>

          <ActionButton
            $variant="outlined"
            onClick={() => {/* TODO: AI insights modal */}}
          >
            <Brain size={18} />
            AI Insights
          </ActionButton>
        </FlexRow>

        {/* Enhanced Tabs */}
        <TabBar>
          <TabButton $active={currentTab === 0} onClick={() => setCurrentTab(0)}>
            <Users size={18} />
            All Clients ({filteredClients.length})
          </TabButton>
          <TabButton $active={currentTab === 1} onClick={() => setCurrentTab(1)}>
            <BarChart3 size={18} />
            Analytics
          </TabButton>
          <TabButton $active={currentTab === 2} onClick={() => setCurrentTab(2)}>
            <Brain size={18} />
            AI Insights
          </TabButton>
          <TabButton $active={currentTab === 3} onClick={() => setCurrentTab(3)}>
            <Activity size={18} />
            Progress
          </TabButton>
          <TabButton $active={currentTab === 4} onClick={() => setCurrentTab(4)}>
            <Trophy size={18} />
            Gamification
          </TabButton>
          <TabButton $active={currentTab === 5} onClick={() => setCurrentTab(5)}>
            <MessageSquare size={18} />
            Communication
          </TabButton>
        </TabBar>

        {/* Tab Panels */}
        <div>
          {currentTab === 0 && renderEnhancedClientTable()}
          {currentTab === 1 && selectedClient && <ClientAnalyticsPanel clientId={selectedClient.id} />}
          {currentTab === 2 && selectedClient && <AIInsightsPanel clientId={selectedClient.id} />}
          {currentTab === 3 && selectedClient && <ClientProgressDashboard clientId={selectedClient.id} />}
          {currentTab === 4 && selectedClient && <GamificationOverview clientId={selectedClient.id} />}
          {currentTab === 5 && selectedClient && (
            <CommunicationCenter
              clientId={selectedClient.id}
              onMessageSend={(message) => {
                console.log('Message sent:', message);
                toast({
                  title: "Message Sent",
                  description: "Your message has been sent successfully",
                  variant: "default"
                });
              }}
              onCallStart={(type, participantId) => {
                console.log(`Starting ${type} call with ${participantId}`);
                toast({
                  title: "Call Starting",
                  description: `Starting ${type} call...`,
                  variant: "default"
                });
              }}
            />
          )}
          {/* Show message if no client is selected for other tabs */}
          {currentTab > 0 && !selectedClient && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <PageTitle style={{ fontSize: '1.4rem', marginBottom: 8 }}>Select a Client</PageTitle>
              <Label>Please select a client from the table to view detailed information</Label>
            </div>
          )}
        </div>
      </PageContent>

      {/* Context Menu */}
      {Boolean(anchorEl) && (
        <>
          <DropdownOverlay onClick={handleMenuClose} />
          <DropdownMenu $x={menuPos.x} $y={menuPos.y}>
            <DropdownItem onClick={() => menuClient && handleViewDetails(menuClient)}>
              <Eye size={18} />
              View Full Profile
            </DropdownItem>
            <DropdownItem onClick={() => menuClient && handleEdit(menuClient)}>
              <Edit size={18} />
              Edit Client
            </DropdownItem>
            <DropdownItem onClick={() => {
              setSelectedClient(menuClient);
              setShowAssessmentModal(true);
              handleMenuClose();
            }}>
              <ClipboardList size={18} />
              New Assessment
            </DropdownItem>
            <DropdownItem onClick={() => {/* TODO: Assign workout plan */}}>
              <Dumbbell size={18} />
              Assign Workout Plan
            </DropdownItem>
            <DropdownItem onClick={() => {/* TODO: Schedule session */}}>
              <Clock size={18} />
              Schedule Session
            </DropdownItem>
            <DropdownItem onClick={() => {/* TODO: Reset password */}}>
              <Key size={18} />
              Reset Password
            </DropdownItem>
          </DropdownMenu>
        </>
      )}

      {/* Floating Action Button for Quick Actions */}
      <FABContainer>
        <FABButton
          onClick={() => setSpeedDialOpen(!speedDialOpen)}
          title="Quick Actions"
        >
          {speedDialOpen ? <X size={24} /> : <Plus size={24} />}
        </FABButton>
        <SpeedDialActions $open={speedDialOpen}>
          <SpeedDialActionBtn
            title="Add Client"
            onClick={() => { setShowCreateModal(true); setSpeedDialOpen(false); }}
          >
            <UserPlus size={20} />
          </SpeedDialActionBtn>
          <SpeedDialActionBtn
            title="Analytics"
            onClick={() => {/* TODO: Quick analytics */ setSpeedDialOpen(false); }}
          >
            <ClipboardList size={20} />
          </SpeedDialActionBtn>
          <SpeedDialActionBtn
            title="Broadcast Message"
            onClick={() => {/* TODO: Broadcast message modal */ setSpeedDialOpen(false); }}
          >
            <MessageSquare size={20} />
          </SpeedDialActionBtn>
          <SpeedDialActionBtn
            title="AI Insights"
            onClick={() => {/* TODO: AI insights modal */ setSpeedDialOpen(false); }}
          >
            <Brain size={20} />
          </SpeedDialActionBtn>
        </SpeedDialActions>
      </FABContainer>

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          // TODO: Handle client creation
          console.log('Creating client:', data);
          setShowCreateModal(false);
          toast({
            title: "Success",
            description: "Client created successfully",
            variant: "default"
          });
        }}
        trainers={[]} // TODO: Add trainers list
      />

      {showDetailsModal && selectedClient && (
        <ClientDetailsModal
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          client={selectedClient}
        />
      )}

      {showAssessmentModal && selectedClient && (
        <ClientAssessmentModal
          open={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          client={selectedClient}
          onSubmit={(assessment) => {
            // TODO: Handle assessment submission
            console.log('New assessment:', assessment);
            setShowAssessmentModal(false);
            toast({
              title: "Success",
              description: "Assessment completed successfully",
              variant: "default"
            });
          }}
        />
      )}

      {showBulkActionDialog && (
        <BulkActionDialog
          open={showBulkActionDialog}
          onClose={() => setShowBulkActionDialog(false)}
          selectedClients={selectedClients}
          onAction={(action) => {
            // TODO: Handle bulk actions
            console.log('Bulk action:', action);
            setShowBulkActionDialog(false);
            setSelectedClients([]);
            toast({
              title: "Success",
              description: `Bulk action completed for ${selectedClients.length} clients`,
              variant: "default"
            });
          }}
        />
      )}
    </PageRoot>
  );
};

export default EnhancedAdminClientManagementView;
