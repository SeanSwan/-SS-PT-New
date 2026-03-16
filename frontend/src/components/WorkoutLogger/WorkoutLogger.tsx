/**
 * WorkoutLogger Component
 * ======================
 * 
 * Revolutionary NASM Workout Logging Interface for Trainers
 * The core trainer interface for comprehensive workout form submission
 * with real-time session deduction and MCP gamification integration.
 * 
 * Core Features:
 * - NASM-compliant workout form with comprehensive exercise tracking
 * - Real-time exercise library search and selection
 * - Advanced set logging with RPE, form quality, and performance notes
 * - Automatic session deduction with confirmation
 * - MCP integration for points and progress tracking
 * - Mobile-optimized for tablet use in gym environments
 * - WCAG AA accessibility compliance
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  Plus, Minus, Search, Save, X, AlertTriangle, CheckCircle,
  Activity, Dumbbell, Clock, Target, Star, BarChart3,
  User, Calendar, MessageSquare, Zap, Timer, Weight,
  RotateCcw, ArrowLeft, ArrowRight, Info, HelpCircle, Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  dailyWorkoutFormService,
  ExerciseEntry,
  ExerciseSet,
  DailyWorkoutForm
} from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import AITerminalPanel from '../Shared/AITerminalPanel';
import {
  APPLY_WORKOUT_EVENT,
  PENDING_WORKOUT_KEY,
  type WorkoutPlanTransfer,
  type WorkoutExerciseTransfer,
} from '../../utils/parseAIWorkoutPlan';
import { exportWorkoutLoggerPDF } from '../../services/pdfExportService';

// ==================== INTERFACES ====================

interface WorkoutLoggerProps {
  clientId: number;
  onComplete: (formData: DailyWorkoutForm) => void;
  onCancel: () => void;
  initialData?: Partial<ExerciseEntry[]>;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  phone?: string;
}

// ==================== CRYSTALLINE SWAN CINEMATIC THEME ====================

/* ─── Palette: Crystalline Swan (Preset F-Alt) ─── */
const CS = {
  bg: '#002060',             // Midnight Sapphire
  surface: '#003080',         // Royal Depth
  card: 'rgba(0, 32, 96, 0.75)',  // Glass
  cardSolid: '#00275a',
  accent: '#C6A84B',          // Gilded Fern (luxury)
  gaming: '#60C0F0',          // Ice Wing
  secondary: '#50A0F0',       // Arctic Cyan
  tertiary: '#4070C0',        // Swan Lavender
  purple: '#8B5CF6',          // Wing Purple — glow accent
  purpleLight: '#A78BFA',     // Wing Purple Light (WCAG dark)
  text: '#E0ECF4',            // Frost White
  textSecondary: '#b8c9db',   // Meets WCAG AA on dark
  border: 'rgba(96, 192, 240, 0.2)',
  borderSolid: '#4a6382',
  glassBorder: 'rgba(96, 192, 240, 0.15)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  inputBg: 'rgba(0, 48, 128, 0.5)',
};

const stellarGlow = keyframes`
  0% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
  50% { box-shadow: 0 0 24px rgba(139, 92, 246, 0.5), 0 0 48px rgba(96, 192, 240, 0.1); }
  100% { box-shadow: 0 0 8px rgba(139, 92, 246, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const crystallinePulse = keyframes`
  0% { opacity: 0.03; }
  50% { opacity: 0.08; }
  100% { opacity: 0.03; }
`;

const WorkoutLoggerContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(165deg, ${CS.bg} 0%, #001040 40%, #001848 100%);
  padding: 2rem;
  color: ${CS.text};
  font-family: 'Sora', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;

  /* Noise texture overlay */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 430px) {
    padding: 0.75rem;
  }
`;

const Header = styled.div`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(96, 192, 240, 0.03);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${CS.purple}, ${CS.gaming}, ${CS.accent});
  }

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(180deg, rgba(96, 192, 240, 0.04) 0%, transparent 100%);
    pointer-events: none;
  }

  @media (max-width: 430px) {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border-radius: 1rem;
  }
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.02em;

    svg {
      color: ${CS.gaming};
    }
  }
`;

const SessionInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const InfoBadge = styled.div<{ type: 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  min-height: 44px;
  backdrop-filter: blur(8px);
  background: ${props =>
    props.type === 'warning' ? 'rgba(245, 158, 11, 0.12)' :
    props.type === 'success' ? 'rgba(16, 185, 129, 0.12)' :
    'rgba(139, 92, 246, 0.12)'
  };
  border: 1px solid ${props =>
    props.type === 'warning' ? 'rgba(245, 158, 11, 0.35)' :
    props.type === 'success' ? 'rgba(16, 185, 129, 0.35)' :
    'rgba(139, 92, 246, 0.35)'
  };
  color: ${props =>
    props.type === 'warning' ? '#fbbf24' :
    props.type === 'success' ? '#34d399' :
    CS.purpleLight
  };

  svg {
    flex-shrink: 0;
  }
`;

const ExerciseSection = styled.div`
  margin-bottom: 2rem;
`;

const ExerciseSearchBar = styled.div`
  position: relative;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3.25rem;
  background: ${CS.inputBg};
  backdrop-filter: blur(12px);
  border: 2px solid ${CS.glassBorder};
  border-radius: 1rem;
  color: ${CS.text};
  font-size: 1rem;
  font-family: 'Sora', sans-serif;
  min-height: 52px;
  box-sizing: border-box;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: ${CS.purple};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 24px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.45);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${CS.gaming};
  pointer-events: none;
`;

const ExerciseCard = styled(motion.div)`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 1.5rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(96, 192, 240, 0.02);
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* Subtle gradient bar on left */
  &::before {
    content: '';
    position: absolute;
    top: 1rem;
    left: 0;
    bottom: 1rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, ${CS.purple}, ${CS.gaming});
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(139, 92, 246, 0.08);

    &::before {
      opacity: 1;
    }
  }

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: 1rem;
  }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ExerciseTitle = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;

    svg {
      color: ${CS.gaming};
    }
  }

  p {
    margin: 0;
    color: ${CS.textSecondary};
    font-size: 0.875rem;
  }
`;

const ExerciseRatings = styled.div`
  display: flex;
  gap: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const RatingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 120px;

  @media (max-width: 430px) {
    min-width: auto;
    width: 100%;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${CS.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'Sora', sans-serif;
  }
`;

const SetsTable = styled.div`
  background: rgba(0, 16, 48, 0.5);
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid ${CS.glassBorder};
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 100px 80px 80px 100px 100px 1fr 50px;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: rgba(0, 32, 96, 0.6);
  font-weight: 700;
  font-size: 0.7rem;
  color: ${CS.gaming};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid ${CS.glassBorder};

  @media (max-width: 768px) {
    display: none;
  }
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: 60px 100px 80px 80px 100px 100px 1fr 50px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  align-items: center;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(139, 92, 246, 0.06);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr) 40px;
    gap: 8px;
    padding: 12px;

    & > *:first-child {
      grid-column: 1 / -1;
      font-size: 0.9rem;
    }
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr 40px;
    gap: 6px;
    padding: 10px;
  }
`;

const SetNumber = styled.div`
  font-weight: 700;
  color: ${CS.gaming};
  font-size: 1.1rem;
  text-align: center;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  text-align: center;
  font-size: 0.9rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.purple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px;
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.purple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }

  @media (max-width: 430px) {
    font-size: 16px;
  }
`;

const StarRating = styled.div<{ value: number }>`
  display: flex;
  gap: 2px;
`;

const StarButton = styled.button<{ filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    fill: ${props => props.filled ? CS.accent : 'none'};
    stroke: ${CS.accent};
    transition: fill 0.15s, transform 0.15s;
  }

  &:hover svg {
    fill: ${CS.accent};
    transform: scale(1.15);
  }

  &:focus-visible {
    outline: 2px solid ${CS.purple};
    outline-offset: 2px;
    border-radius: 0.375rem;
  }
`;

const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.2));
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.purple}, ${CS.gaming});
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4), 0 0 12px rgba(139, 92, 246, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.purple}, ${CS.gaming});
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
  }
`;

const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.purpleLight};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

const AddSetButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: rgba(139, 92, 246, 0.08);
  border: 2px dashed rgba(139, 92, 246, 0.3);
  border-radius: 0.75rem;
  color: ${CS.purpleLight};
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  min-height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.5);
    border-style: solid;
    transform: translateY(-1px);
  }
`;

const RemoveSetButton = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: #f87171;
  cursor: pointer;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  &:focus-visible {
    outline: 2px solid #f87171;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SessionSummary = styled.div`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: 1rem;
  }
`;

const SummaryTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: -0.01em;

  svg {
    color: ${CS.accent};
  }
`;

const SummaryField = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-weight: 600;
    color: ${CS.textSecondary};
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: 'Sora', sans-serif;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.75rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.purple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.875rem 2rem;
  border-radius: 1rem;
  font-weight: 600;
  font-size: 1rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  min-height: 48px;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, ${CS.purple}, ${CS.gaming});
    color: #ffffff;
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      background-size: 200% 100%;
      animation: ${shimmer} 3s ease-in-out infinite;
      pointer-events: none;
    }
  `}

  ${props => props.variant === 'secondary' && `
    background: transparent;
    color: ${CS.text};
    border: 1.5px solid ${CS.glassBorder};
    backdrop-filter: blur(8px);

    &:hover {
      border-color: rgba(96, 192, 240, 0.4);
      background: rgba(96, 192, 240, 0.06);
    }
  `}

  ${props => props.variant === 'danger' && `
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  `}

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 430px) {
    min-width: unset;
    width: 100%;
    min-height: 48px;
    font-size: 0.9rem;
  }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: ${spin} 0.8s ease-in-out infinite;
`;

const AddExerciseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, ${CS.purple}, ${CS.gaming});
  border: none;
  border-radius: 1rem;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: 2rem;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(139, 92, 246, 0.25);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 36px rgba(139, 92, 246, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }
`;

// ==================== MAIN COMPONENT ====================

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ 
  clientId, 
  onComplete, 
  onCancel,
  initialData = []
}) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [overallIntensity, setOverallIntensity] = useState(5);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [popularExercises, setPopularExercises] = useState<Exercise[]>([]);

  // Load exercises from API based on search
  const loadExercises = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setAvailableExercises(popularExercises); // Show popular exercises when no search
      return;
    }

    setIsLoadingExercises(true);
    try {
      const api = new ApiService();
      const response = await api.get(`/api/exercises/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      
      if (response.success && response.exercises) {
        setAvailableExercises(response.exercises);
      } else {
        setAvailableExercises([]);
      }
    } catch (error) {
      console.error('Failed to search exercises:', error);
      setAvailableExercises([]);
      toast.error('Failed to search exercises. Please try again.');
    } finally {
      setIsLoadingExercises(false);
    }
  }, [popularExercises]);

  // Load popular exercises for initial display
  const loadPopularExercises = useCallback(async () => {
    try {
      const api = new ApiService();
      // Load some basic/popular exercises
      const response = await api.get('/api/exercises/search?q=squat&limit=5');
      
      if (response.success && response.exercises) {
        setPopularExercises(response.exercises);
        setAvailableExercises(response.exercises);
      }
    } catch (error) {
      console.error('Failed to load popular exercises:', error);
      // Fallback to empty array, not critical
    }
  }, []);

  // Load client data and popular exercises on mount
  useEffect(() => {
    loadClientData();
    loadPopularExercises();
  }, [clientId, loadPopularExercises]);

  // Load exercises based on search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadExercises(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, loadExercises]);

  // ── AI-to-Logger prefill: listen for exercises from AI Assistant ──
  const convertAIExercises = useCallback((incoming: WorkoutExerciseTransfer[]): ExerciseEntry[] => {
    return incoming.map(ex => ({
      exerciseId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exerciseName: ex.exerciseName,
      sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
        setNumber: i + 1,
        weight: ex.weight || 0,
        reps: ex.reps || 10,
        rpe: 5,
        tempo: ex.tempo || '',
        restTime: ex.restTime || 60,
        formQuality: 3,
        notes: ex.notes || '',
      })),
      formRating: 3,
      painLevel: 0,
      performanceNotes: '',
    }));
  }, []);

  // Listen for live custom event (AI drawer dispatches when Logger is mounted)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkoutPlanTransfer>).detail;
      if (detail?.exercises?.length) {
        const converted = convertAIExercises(detail.exercises);
        setExercises(prev => [...prev, ...converted]);
        toast.success(`Applied ${converted.length} exercises from AI plan`);
        // Clear the pending queue since we consumed it
        try { sessionStorage.removeItem(PENDING_WORKOUT_KEY); } catch { /* ignore */ }
      }
    };
    window.addEventListener(APPLY_WORKOUT_EVENT, handler);
    return () => window.removeEventListener(APPLY_WORKOUT_EVENT, handler);
  }, [convertAIExercises]);

  // Check sessionStorage on mount for pending AI workout plan (queued before Logger was open)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_WORKOUT_KEY);
      if (pending) {
        const plan: WorkoutPlanTransfer = JSON.parse(pending);
        if (plan.exercises?.length) {
          const converted = convertAIExercises(plan.exercises);
          setExercises(prev => [...prev, ...converted]);
          toast.success(`Loaded ${converted.length} exercises from AI plan`);
          sessionStorage.removeItem(PENDING_WORKOUT_KEY);
        }
      }
    } catch { /* ignore parse errors */ }
  }, [convertAIExercises]);

  const loadClientData = async () => {
    try {
      const api = new ApiService();
      // Use /my/info when client is logging their own workout
      const isSelf = user?.id === clientId;
      const infoUrl = isSelf && user?.role === 'client'
        ? '/api/workout-forms/my/info'
        : `/api/workout-forms/client/${clientId}/info`;
      const axiosResponse = await api.get(infoUrl);
      // Unwrap Axios response — data is in response.data
      const data = axiosResponse?.data ?? axiosResponse;

      if (data.success && data.client) {
        setClient({
          id: data.client.id,
          firstName: data.client.firstName,
          lastName: data.client.lastName,
          email: data.client.email,
          availableSessions: data.client.availableSessions,
          phone: data.client.phone
        });

        // Show warning if client already has a workout today
        if (data.client.hasWorkoutToday) {
          toast.warning(`${data.client.firstName} already has a workout logged for today`);
        }

        // Show warning if client has low sessions
        if (data.client.availableSessions <= 1) {
          toast.warning(`${data.client.firstName} has only ${data.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(data.message || 'Failed to load client data');
      }
    } catch (error: any) {
      console.error('Failed to load client data:', error);
      // Fallback: set minimal client so UI renders instead of infinite spinner
      setClient({
        id: clientId,
        firstName: 'Client',
        lastName: `#${clientId}`,
        email: '',
        availableSessions: 0,
        phone: ''
      });
      toast.error(error.message || 'Failed to load client information');
    }
  };

  const addExercise = useCallback((exercise: Exercise) => {
    const newExercise: ExerciseEntry = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [createEmptySet(1)],
      formRating: 3,
      painLevel: 0,
      performanceNotes: ''
    };
    setExercises(prev => [...prev, newExercise]);
    setSearchQuery('');
    setShowExerciseSearch(false);
    toast.success(`Added ${exercise.name} to workout`);
  }, []);

  const createEmptySet = useCallback((setNumber: number): ExerciseSet => ({
    setNumber,
    weight: 0,
    reps: 0,
    rpe: 5,
    tempo: '',
    restTime: 60,
    formQuality: 3,
    notes: ''
  }), []);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const newSetNumber = exercise.sets.length + 1;
      return { ...exercise, sets: [...exercise.sets, createEmptySet(newSetNumber)] };
    }));
  }, [createEmptySet]);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      if (exercise.sets.length <= 1) return exercise;
      const newSets = exercise.sets
        .filter((_, si) => si !== setIndex)
        .map((set, idx) => ({ ...set, setNumber: idx + 1 }));
      return { ...exercise, sets: newSets };
    }));
  }, []);

  const updateSet = useCallback((exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, si) =>
          si !== setIndex ? set : { ...set, [field]: value }
        ),
      };
    }));
  }, []);

  const updateExercise = useCallback((exerciseIndex: number, field: keyof ExerciseEntry, value: any) => {
    setExercises(prev => prev.map((exercise, i) =>
      i !== exerciseIndex ? exercise : { ...exercise, [field]: value }
    ));
  }, []);

  const removeExercise = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    toast.info('Exercise removed from workout');
  }, []);

  const handleExportPDF = useCallback(() => {
    if (exercises.length === 0) {
      toast.error('Add exercises before exporting');
      return;
    }
    exportWorkoutLoggerPDF({
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Client',
      trainerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : undefined,
      date: new Date().toISOString().split('T')[0],
      exercises,
      sessionNotes,
      overallIntensity,
    });
    toast.success('PDF exported');
  }, [exercises, client, user, sessionNotes, overallIntensity]);

  const handleSubmit = async () => {
    // Ref-based guard: atomic, prevents double-submit on fast taps
    if (isSubmittingRef.current) return;

    if (exercises.length === 0) {
      toast.error('Please add at least one exercise');
      return;
    }

    if (!client) {
      toast.error('Client information not loaded');
      return;
    }

    if (client.availableSessions <= 0 && user?.role !== 'admin') {
      toast.error('Client has no available sessions remaining');
      return;
    }

    // Validate that all exercises have at least one complete set
    const hasIncompleteExercises = exercises.some(exercise =>
      exercise.sets.length === 0 ||
      exercise.sets.some(set => set.weight === 0 && set.reps === 0)
    );

    if (hasIncompleteExercises) {
      toast.error('Please complete all exercise sets before submitting');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const formData = {
        clientId,
        date: new Date().toISOString().split('T')[0],
        exercises,
        sessionNotes,
        overallIntensity
      };

      const response = await dailyWorkoutFormService.submitWorkoutForm(formData);

      if (response.success && response.data) {
        toast.success('Workout logged successfully! Session deducted and points earned.');
        onComplete(response.data);
      } else {
        throw new Error(response.message || 'Failed to submit workout form');
      }
    } catch (error: any) {
      console.error('Error submitting workout form:', error);
      toast.error(error.message || 'Failed to submit workout form');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const totalSets = useMemo(() => {
    return exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  }, [exercises]);

  const estimatedDuration = useMemo(() => {
    return Math.min(totalSets * 3, 120); // 3 minutes per set, cap at 2 hours
  }, [totalSets]);

  if (!client) {
    return (
      <WorkoutLoggerContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <LoadingSpinner />
        </div>
      </WorkoutLoggerContainer>
    );
  }

  return (
    <>
      <WorkoutLoggerContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Equipment Profile Picker */}
        <EquipmentProfilePicker
          selectedProfileId={equipmentProfileId}
          onSelect={setEquipmentProfileId}
          label="Training Location"
        />

        {/* AI Assistant Panel */}
        <AITerminalPanel
          context="workout_generation"
          clientId={clientId}
          equipmentProfileId={equipmentProfileId}
          placeholder="Ask Deep Research to suggest exercises for this client..."
        />

        <Header>
          <ClientInfo>
            <h2>
              <User size={24} />
              Logging Workout for: {client.firstName} {client.lastName}
            </h2>
            <SessionInfo>
              <InfoBadge type="info">
                <Calendar size={16} />
                Date: {new Date().toLocaleDateString()}
              </InfoBadge>
              <InfoBadge type={client.availableSessions > 3 ? 'success' : 'warning'}>
                <Activity size={16} />
                Sessions Remaining: {client.availableSessions}
              </InfoBadge>
              <InfoBadge type="info">
                <Clock size={16} />
                Est. Duration: {estimatedDuration} min
              </InfoBadge>
              <InfoBadge type="info">
                <BarChart3 size={16} />
                Total Sets: {totalSets}
              </InfoBadge>
            </SessionInfo>
          </ClientInfo>
        </Header>

        <ExerciseSection>
          <ExerciseSearchBar>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search exercises by name, type, or muscle group..."
              aria-label="Search exercises"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowExerciseSearch(true)}
            />
            <AnimatePresence>
              {showExerciseSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: CS.card,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${CS.glassBorder}`,
                    borderRadius: '1rem',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginTop: '0.25rem'
                  }}
                >
                  {isLoadingExercises ? (
                    <div style={{ 
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: CS.textSecondary
                    }}>
                      <LoadingSpinner style={{ margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem' }}>Searching exercises...</div>
                    </div>
                  ) : availableExercises.length > 0 ? (
                    availableExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        style={{
                          padding: '1rem',
                          cursor: 'pointer',
                          borderBottom: `1px solid ${CS.glassBorder}`,
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        onClick={() => addExercise(exercise)}
                      >
                        <div style={{ fontWeight: 600, color: CS.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {exercise.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: CS.textSecondary, marginTop: '4px', fontFamily: "'Sora', sans-serif" }}>
                          {exercise.exerciseType} • {exercise.muscleGroups.join(', ')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      padding: '1.5rem',
                      textAlign: 'center',
                      color: CS.textSecondary
                    }}>
                      {searchQuery.length >= 2 ? 'No exercises found. Try a different search.' : 'Start typing to search exercises...'}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </ExerciseSearchBar>

          {exercises.length === 0 ? (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Your First Exercise
            </AddExerciseButton>
          ) : (
            exercises.map((exercise, exerciseIndex) => (
              <ExerciseCard
                key={exerciseIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: exerciseIndex * 0.1 }}
              >
                <ExerciseHeader>
                  <ExerciseTitle>
                    <h3>
                      <Dumbbell size={20} />
                      {exercise.exerciseName}
                    </h3>
                  </ExerciseTitle>
                  <ExerciseRatings>
                    <RatingGroup>
                      <label>Form Rating (1-5):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StarRating value={exercise.formRating}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <StarButton
                              key={rating}
                              filled={rating <= exercise.formRating}
                              onClick={() => updateExercise(exerciseIndex, 'formRating', rating)}
                              aria-label={`Set form rating to ${rating} stars`}
                              aria-pressed={rating === exercise.formRating}
                            >
                              <Star size={16} />
                            </StarButton>
                          ))}
                        </StarRating>
                        <SliderValue>{exercise.formRating}/5</SliderValue>
                      </div>
                    </RatingGroup>
                    <RatingGroup>
                      <label>Pain Level (0-10):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SliderInput
                          type="range"
                          min={0}
                          max={10}
                          value={exercise.painLevel}
                          onChange={(e) => updateExercise(exerciseIndex, 'painLevel', parseInt(e.target.value))}
                        />
                        <SliderValue>{exercise.painLevel}/10</SliderValue>
                      </div>
                    </RatingGroup>
                    <button
                      onClick={() => removeExercise(exerciseIndex)}
                      aria-label={`Remove ${exercise.exerciseName}`}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.5rem',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        alignSelf: 'flex-start',
                        minWidth: '44px',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </ExerciseRatings>
                </ExerciseHeader>

                <SetsTable>
                  <TableHeader>
                    <div>Set</div>
                    <div>Weight (lbs)</div>
                    <div>Reps</div>
                    <div>RPE (1-10)</div>
                    <div>Form (1-5)</div>
                    <div>Rest (sec)</div>
                    <div>Notes</div>
                    <div></div>
                  </TableHeader>
                  {exercise.sets.map((set, setIndex) => (
                    <SetRow key={setIndex}>
                      <SetNumber>{set.setNumber}</SetNumber>
                      <NumberInput
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        aria-label={`Set ${set.setNumber} weight in lbs`}
                      />
                      <NumberInput
                        type="number"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        aria-label={`Set ${set.setNumber} reps`}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SliderInput
                          type="range"
                          min={1}
                          max={10}
                          value={set.rpe}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'rpe', parseInt(e.target.value))}
                        />
                        <SliderValue>{set.rpe}</SliderValue>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StarRating value={set.formQuality}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <StarButton
                              key={rating}
                              filled={rating <= set.formQuality}
                              onClick={() => updateSet(exerciseIndex, setIndex, 'formQuality', rating)}
                              aria-label={`Set ${set.setNumber} form quality: ${rating} stars`}
                              aria-pressed={rating === set.formQuality}
                            >
                              <Star size={16} />
                            </StarButton>
                          ))}
                        </StarRating>
                      </div>
                      <NumberInput
                        type="number"
                        value={set.restTime || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'restTime', parseInt(e.target.value) || 60)}
                        placeholder="60"
                        aria-label={`Set ${set.setNumber} rest time in seconds`}
                      />
                      <TextInput
                        value={set.notes || ''}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'notes', e.target.value)}
                        placeholder="Form notes..."
                        aria-label={`Set ${set.setNumber} notes`}
                      />
                      <RemoveSetButton
                        onClick={() => removeSet(exerciseIndex, setIndex)}
                        disabled={exercise.sets.length <= 1}
                        aria-label={`Remove set ${set.setNumber}`}
                      >
                        <Minus size={16} />
                      </RemoveSetButton>
                    </SetRow>
                  ))}
                </SetsTable>

                <AddSetButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addSet(exerciseIndex)}
                >
                  <Plus size={16} />
                  Add Set
                </AddSetButton>
              </ExerciseCard>
            ))
          )}

          {exercises.length > 0 && (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Another Exercise
            </AddExerciseButton>
          )}
        </ExerciseSection>

        {exercises.length > 0 && (
          <SessionSummary>
            <SummaryTitle>
              <Target size={20} />
              Session Summary
            </SummaryTitle>
            
            <SummaryField>
              <label>Overall Session Intensity (1-10):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SliderInput
                  type="range"
                  min={1}
                  max={10}
                  value={overallIntensity}
                  onChange={(e) => setOverallIntensity(parseInt(e.target.value))}
                />
                <SliderValue>{overallIntensity}/10</SliderValue>
              </div>
            </SummaryField>
            
            <SummaryField>
              <label>Session Notes:</label>
              <TextArea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Overall session notes, client feedback, observations, modifications made..."
                rows={4}
              />
            </SummaryField>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '0.75rem',
              marginTop: '1.5rem' 
            }}>
              <InfoBadge type="info">
                <Activity size={16} />
                Total Exercises: {exercises.length}
              </InfoBadge>
              <InfoBadge type="info">
                <BarChart3 size={16} />
                Total Sets: {totalSets}
              </InfoBadge>
              <InfoBadge type="info">
                <Clock size={16} />
                Est. Duration: {estimatedDuration} min
              </InfoBadge>
              <InfoBadge type="warning">
                <AlertTriangle size={16} />
                Will Deduct 1 Session
              </InfoBadge>
            </div>
          </SessionSummary>
        )}

        <ActionButtons>
          <Button
            variant="secondary"
            onClick={onCancel}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} />
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportPDF}
            disabled={exercises.length === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={18} />
            Export PDF
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={exercises.length === 0 || isSubmitting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <>
                <Save size={18} />
                Complete & Save Workout
              </>
            )}
          </Button>
        </ActionButtons>
      </WorkoutLoggerContainer>
    </>
  );
};

export default WorkoutLogger;