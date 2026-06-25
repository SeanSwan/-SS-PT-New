/**
 * Swan Coach AI context and response-style options shared by the drawer and selector.
 * Keeping these constants outside component files preserves React Fast Refresh hygiene.
 */
import type { ElementType } from 'react';
import {
  MessageSquare,
  Utensils,
  Dumbbell,
  Brain,
  Sparkles,
  Database,
  Calendar,
  TrendingUp,
  BookOpen,
  Trophy,
  UserPlus,
} from 'lucide-react';
import type { ResponseStyle } from '../../hooks/useAIChat';

export interface ContextConfig {
  label: string;
  icon: ElementType;
  description: string;
  roles: string[];
}

export const CONTEXTS: Record<string, ContextConfig> = {
  coach_assistant: { label: 'Coach Assistant', icon: Sparkles, description: 'Master Swan Coach with access to all contexts', roles: ['trainer', 'admin'] },
  general: { label: 'General', icon: MessageSquare, description: 'Ask me anything about fitness and wellness', roles: ['client', 'trainer', 'admin'] },
  macro_logging: { label: 'Macros', icon: Utensils, description: 'Log food - just tell me what you ate', roles: ['client', 'trainer', 'admin'] },
  form_tips: { label: 'Form Tips', icon: Dumbbell, description: 'Get exercise form guidance', roles: ['client', 'trainer', 'admin'] },
  workout_suggestions: { label: 'Workouts', icon: Sparkles, description: 'Get workout ideas and suggestions', roles: ['client', 'trainer', 'admin'] },
  workout_generation: { label: 'Generate Plans', icon: Brain, description: 'Create structured workout plans', roles: ['trainer', 'admin'] },
  client_review: { label: 'Client Review', icon: Brain, description: 'Analyze client progress and data', roles: ['trainer', 'admin'] },
  data_management: { label: 'Data Manager', icon: Database, description: 'Review, analyze, and manage platform data', roles: ['admin'] },
  scheduling: { label: 'Schedule', icon: Calendar, description: 'Manage sessions, availability, and booking', roles: ['trainer', 'admin'] },
  progress_analysis: { label: 'Progress', icon: TrendingUp, description: 'Analyze client progress and chart data', roles: ['trainer', 'admin'] },
  exercise_library: { label: 'Exercises', icon: BookOpen, description: 'Search and explore the 840+ exercise database', roles: ['trainer', 'admin'] },
  gamification: { label: 'Gamification', icon: Trophy, description: 'Manage achievements, badges, and XP system', roles: ['admin'] },
  client_onboarding: { label: 'Onboarding', icon: UserPlus, description: 'Dictate new client info - Swan Coach builds the intake form', roles: ['trainer', 'admin'] },
};

export const RESPONSE_STYLES: { key: ResponseStyle; label: string; emoji: string }[] = [
  { key: 'phd_only', label: 'PhD Mode', emoji: '🎓' },
  { key: 'balanced', label: 'Balanced', emoji: '⚖️' },
  { key: 'simple_only', label: 'Keep It 100', emoji: '💯' },
  { key: 'both', label: 'Both', emoji: '🎓💯' },
];
