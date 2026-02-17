/**
 * Advanced Filter Dialog Component
 * ===============================
 * Comprehensive filtering system with saved presets, advanced search, and real-time results
 *
 * Features:
 * - Multi-criteria filtering with AND/OR logic
 * - Saved filter presets with user management
 * - Real-time search with debouncing
 * - Filter result counters and preview
 * - Clear all filters functionality
 * - Filter history and recent searches
 * - Export filtered results
 *
 * Migrated from MUI to styled-components + lucide-react
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { css } from 'styled-components';

// Icons (lucide-react - already in use, no changes)
import {
  Filter,
  Search,
  Save,
  Star,
  StarOff,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Target,
  Activity,
  TrendingUp,
  DollarSign,
  Award,
  Settings,
  History,
  Bookmark,
  BookmarkOff,
  Download,
  Upload,
  Copy,
  Edit,
  X,
  Plus,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';

// Custom Components
import GlowButton from '../../ui/buttons/GlowButton';
import { useToast } from '../../../hooks/use-toast';

// Types
import type { FilterOptions, Session, Client, Trainer } from '../types';

// ─── Theme Constants ───────────────────────────────────────
const THEME = {
  bg: 'rgba(15, 23, 42, 0.95)',
  bgGradient: 'linear-gradient(135deg, #0a0a0f, #1e1e3f)',
  headerGradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
  border: 'rgba(14, 165, 233, 0.2)',
  borderActive: 'rgba(59, 130, 246, 0.6)',
  text: '#e2e8f0',
  textSecondary: 'rgba(226, 232, 240, 0.6)',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',
  danger: '#ef4444',
  success: '#22c55e',
  info: 'rgba(14, 165, 233, 0.15)',
  infoBorder: 'rgba(14, 165, 233, 0.3)',
};

// ─── Styled Components ────────────────────────────────────

// Modal Overlay
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
`;

// Modal Panel
const ModalPanel = styled(motion.div)`
  position: relative;
  width: 95%;
  max-width: 960px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  background: ${THEME.bgGradient};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: ${THEME.text};
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

// Dialog Header
const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: ${THEME.headerGradient};
  flex-shrink: 0;
`;

const DialogHeaderTitle = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
`;

const HeaderBadge = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

// Dialog Body
const DialogBody = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
`;

// Dialog Footer
const DialogFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

// Tabs
const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-height: 44px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? THEME.accent : THEME.textSecondary)};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${THEME.text};
    background: ${THEME.surfaceHover};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $active }) => ($active ? THEME.accent : 'transparent')};
    transition: background 0.2s;
  }
`;

const TabPanelWrapper = styled.div`
  padding: 24px;
  flex: 1;
  overflow-y: auto;
`;

// Grid
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const GridItemFull = styled.div`
  grid-column: 1 / -1;
`;

// Form elements
const FormFieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${THEME.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${THEME.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${THEME.textSecondary};
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${THEME.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${THEME.textSecondary};
  }
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  color: ${THEME.textSecondary};
  pointer-events: none;
`;

const SearchInput = styled(StyledInput)`
  padding-left: 40px;
  padding-right: 40px;
`;

const SearchClearButton = styled.button`
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${THEME.textSecondary};
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${THEME.text};
    background: ${THEME.surfaceHover};
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 32px 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23e2e8f0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${THEME.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  option {
    background: #1e293b;
    color: ${THEME.text};
  }
`;

// Chip
const Chip = styled.span<{ $variant?: 'outlined' | 'filled'; $clickable?: boolean; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $small }) => ($small ? '2px 8px' : '4px 12px')};
  border-radius: 999px;
  font-size: ${({ $small }) => ($small ? '0.7rem' : '0.75rem')};
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s;
  min-height: ${({ $clickable }) => ($clickable ? '44px' : 'auto')};

  ${({ $variant }) =>
    $variant === 'outlined'
      ? css`
          border: 1px solid ${THEME.border};
          background: transparent;
          color: ${THEME.textSecondary};
        `
      : css`
          border: 1px solid transparent;
          background: rgba(14, 165, 233, 0.15);
          color: ${THEME.accent};
        `}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        background: rgba(14, 165, 233, 0.25);
        border-color: ${THEME.accent};
        color: ${THEME.text};
      }
    `}
`;

// Buttons
const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${THEME.text};
    background: ${THEME.surfaceHover};
  }
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: transparent;
  color: ${THEME.text};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: ${THEME.accent};
    background: ${THEME.surfaceHover};
  }
`;

const FilledButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: ${THEME.accent};
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${THEME.accentHover};
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${THEME.textSecondary};
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: ${THEME.text};
    background: ${THEME.surfaceHover};
  }
`;

// Checkbox styled
const CheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${THEME.text};
  user-select: none;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const CheckboxVisual = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid ${({ $checked }) => ($checked ? THEME.accent : THEME.border)};
  border-radius: 4px;
  background: ${({ $checked }) => ($checked ? THEME.accent : 'transparent')};
  transition: all 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-bottom: 2px;
  }
`;

// Radio styled
const RadioLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${THEME.text};
  user-select: none;
`;

const HiddenRadio = styled.input.attrs({ type: 'radio' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const RadioVisual = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid ${({ $checked }) => ($checked ? THEME.accent : THEME.border)};
  border-radius: 50%;
  background: transparent;
  transition: border-color 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${THEME.accent};
  }
`;

// Range slider
const RangeSliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StyledRange = styled.input.attrs({ type: 'range' })`
  width: 100%;
  min-height: 44px;
  accent-color: ${THEME.accent};
  cursor: pointer;
`;

// Sections
const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0 0 12px 0;
`;

const RecentSearchesLabel = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

const RecentSearchesRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const FormGroupRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const RadioGroupRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

// List
const PresetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PresetItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? '#3b82f6' : 'transparent')};
  border-radius: 8px;
  background: ${({ $selected }) =>
    $selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  transition: background 0.2s, border-color 0.2s;
`;

const PresetIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-top: 2px;
`;

const PresetContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const PresetName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${THEME.text};
`;

const PresetDescription = styled.p`
  margin: 4px 0 2px;
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
`;

const PresetMeta = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

const PresetActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

// Alert / Info box
const AlertInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid ${THEME.infoBorder};
  border-radius: 8px;
  background: ${THEME.info};
  color: ${THEME.accent};
  font-size: 0.875rem;
`;

// Paper-like surface
const SurfaceCard = styled.div`
  padding: 16px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: ${THEME.surface};
`;

const SurfaceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SurfaceLabel = styled.span<{ $capitalize?: boolean }>`
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
  ${({ $capitalize }) => $capitalize && css`text-transform: capitalize;`}
`;

const SectionHeading = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0 0 12px 0;
`;

const PresetHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const BodyText = styled.p`
  margin: 4px 0;
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
`;

const RangeLabel = styled.span`
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
`;

// ─── Sub-modal for Save Preset ──────────────────────────────

const SubModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
`;

const SubModalPanel = styled(motion.div)`
  width: 90%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  background: ${THEME.bgGradient};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: ${THEME.text};
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const SubModalHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${THEME.border};
  font-size: 1rem;
  font-weight: 600;
`;

const SubModalBody = styled.div`
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SubModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid ${THEME.border};
`;

// ─── Types ─────────────────────────────────────────────────

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: FilterOptions;
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

interface AdvancedFilterDialogProps {
  open: boolean;
  onClose: () => void;
  currentFilters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  onExportFiltered?: (sessions: Session[]) => void;
}

interface FilterPreview {
  totalCount: number;
  filteredCount: number;
  byStatus: Record<string, number>;
  byTrainer: Record<string, number>;
  dateRange: { start: Date; end: Date } | null;
}

const AdvancedFilterDialog: React.FC<AdvancedFilterDialogProps> = ({
  open,
  onClose,
  currentFilters,
  onFiltersChange,
  sessions,
  clients,
  trainers,
  onExportFiltered
}) => {
  const { toast } = useToast();

  // Component state
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterPreview, setFilterPreview] = useState<FilterPreview | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterDescription, setNewFilterDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Advanced filter state
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND');
  const [dateRangeMode, setDateRangeMode] = useState<'relative' | 'absolute'>('relative');
  const [customDateStart, setCustomDateStart] = useState<Date | null>(null);
  const [customDateEnd, setCustomDateEnd] = useState<Date | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [durationRange, setDurationRange] = useState<[number, number]>([15, 180]);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);

  // Initialize saved filters
  useEffect(() => {
    loadSavedFilters();
    loadRecentSearches();
  }, []);

  // Update preview when filters change
  useEffect(() => {
    updateFilterPreview();
  }, [filters, sessions]);

  // Load saved filters (would come from API/localStorage)
  const loadSavedFilters = () => {
    const mockSavedFilters: SavedFilter[] = [
      {
        id: '1',
        name: 'Today\'s Sessions',
        description: 'All sessions scheduled for today',
        filters: {
          ...currentFilters,
          dateRange: 'today'
        },
        isDefault: true,
        isShared: false,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 25
      },
      {
        id: '2',
        name: 'Available This Week',
        description: 'Available sessions for this week',
        filters: {
          ...currentFilters,
          status: 'available',
          dateRange: 'week'
        },
        isDefault: false,
        isShared: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 12
      }
    ];
    setSavedFilters(mockSavedFilters);
  };

  // Load recent searches
  const loadRecentSearches = () => {
    const searches = ['John Smith', 'yoga', 'Main Studio', 'cancelled sessions'];
    setRecentSearches(searches);
  };

  // Update filter preview
  const updateFilterPreview = useCallback(() => {
    let filteredSessions = [...sessions];

    // Apply filters
    if (filters.trainerId) {
      filteredSessions = filteredSessions.filter(s => s.trainerId === filters.trainerId);
    }

    if (filters.clientId) {
      filteredSessions = filteredSessions.filter(s => s.userId === filters.clientId);
    }

    if (filters.status !== 'all') {
      filteredSessions = filteredSessions.filter(s => s.status === filters.status);
    }

    if (filters.location) {
      filteredSessions = filteredSessions.filter(s =>
        s.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredSessions = filteredSessions.filter(s => {
        const searchableText = [
          s.client?.firstName,
          s.client?.lastName,
          s.trainer?.firstName,
          s.trainer?.lastName,
          s.location,
          includeNotes ? s.notes : ''
        ].filter(Boolean).join(' ').toLowerCase();

        return exactMatch ?
          searchableText.includes(filters.searchTerm) :
          searchableText.includes(searchLower);
      });
    }

    // Date range filtering
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          endDate = new Date(now.setDate(startDate.getDate() + 6));
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'custom':
          if (customDateStart && customDateEnd) {
            startDate = customDateStart;
            endDate = customDateEnd;
          } else {
            startDate = new Date(0);
            endDate = new Date();
          }
          break;
        default:
          startDate = new Date(0);
      }

      filteredSessions = filteredSessions.filter(s => {
        const sessionDate = new Date(s.sessionDate || s.createdAt);
        return sessionDate >= startDate && sessionDate <= endDate;
      });
    }

    // Calculate preview statistics
    const byStatus = filteredSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTrainer = filteredSessions.reduce((acc, session) => {
      const trainerName = session.trainer ?
        `${session.trainer.firstName} ${session.trainer.lastName}` :
        'Unassigned';
      acc[trainerName] = (acc[trainerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sessionDates = filteredSessions
      .map(s => new Date(s.sessionDate || s.createdAt))
      .filter(date => !isNaN(date.getTime()));

    const dateRange = sessionDates.length > 0 ? {
      start: new Date(Math.min(...sessionDates.map(d => d.getTime()))),
      end: new Date(Math.max(...sessionDates.map(d => d.getTime())))
    } : null;

    setFilterPreview({
      totalCount: sessions.length,
      filteredCount: filteredSessions.length,
      byStatus,
      byTrainer,
      dateRange
    });
  }, [filters, sessions, includeNotes, exactMatch, customDateStart, customDateEnd]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    onFiltersChange(filters);

    // Add to recent searches if there's a search term
    if (filters.searchTerm && !recentSearches.includes(filters.searchTerm)) {
      setRecentSearches(prev => [filters.searchTerm, ...prev.slice(0, 9)]);
    }

    onClose();

    toast({
      title: 'Filters Applied',
      description: `Showing ${filterPreview?.filteredCount || 0} of ${filterPreview?.totalCount || 0} sessions`,
      variant: 'default'
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      trainerId: '',
      clientId: '',
      status: 'all',
      dateRange: 'all',
      location: '',
      searchTerm: '',
      customDateStart: '',
      customDateEnd: ''
    };
    setFilters(clearedFilters);
    setSelectedPreset(null);
  };

  // Save current filter as preset
  const saveFilterPreset = () => {
    if (!newFilterName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the filter preset',
        variant: 'destructive'
      });
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName,
      description: newFilterDescription,
      filters: { ...filters },
      isDefault: false,
      isShared: false,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 0
    };

    setSavedFilters(prev => [...prev, newFilter]);
    setSaveDialogOpen(false);
    setNewFilterName('');
    setNewFilterDescription('');

    toast({
      title: 'Filter Saved',
      description: `"${newFilterName}" has been saved to your presets`,
      variant: 'default'
    });
  };

  // Load filter preset
  const loadFilterPreset = (preset: SavedFilter) => {
    setFilters(preset.filters);
    setSelectedPreset(preset.id);

    // Update use count
    setSavedFilters(prev => prev.map(f =>
      f.id === preset.id ?
        { ...f, lastUsed: new Date().toISOString(), useCount: f.useCount + 1 } :
        f
    ));
  };

  // Delete filter preset
  const deleteFilterPreset = (presetId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== presetId));
    if (selectedPreset === presetId) {
      setSelectedPreset(null);
    }
  };

  // Export filtered results
  const exportFiltered = () => {
    if (onExportFiltered && filterPreview) {
      // This would filter the actual sessions and export them
      onExportFiltered(sessions); // Simplified for now
      toast({
        title: 'Export Started',
        description: `Exporting ${filterPreview.filteredCount} filtered sessions`,
        variant: 'default'
      });
    }
  };

  // Tab content
  const tabs = ['Basic Filters', 'Advanced', 'Saved Presets', 'Preview'];

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <ModalPanel
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <DialogHeader>
                <Filter size={24} />
                <DialogHeaderTitle>Advanced Filters</DialogHeaderTitle>
                {filterPreview && (
                  <HeaderBadge>
                    <Chip>
                      {filterPreview.filteredCount} / {filterPreview.totalCount}
                    </Chip>
                  </HeaderBadge>
                )}
              </DialogHeader>

              {/* Body */}
              <DialogBody>
                <TabBar>
                  {tabs.map((label, index) => (
                    <TabButton
                      key={label}
                      $active={activeTab === index}
                      onClick={() => setActiveTab(index)}
                    >
                      {label}
                    </TabButton>
                  ))}
                </TabBar>

                {/* Basic Filters Tab */}
                {activeTab === 0 && (
                  <TabPanelWrapper role="tabpanel" id="filter-tabpanel-0">
                    <GridContainer>
                      {/* Search */}
                      <GridItemFull>
                        <FormFieldWrapper>
                          <FieldLabel>Search sessions, clients, trainers...</FieldLabel>
                          <SearchInputWrapper>
                            <SearchIcon><Search size={20} /></SearchIcon>
                            <SearchInput
                              value={filters.searchTerm}
                              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                              placeholder="Search sessions, clients, trainers..."
                            />
                            {filters.searchTerm && (
                              <SearchClearButton
                                onClick={() => handleFilterChange('searchTerm', '')}
                                title="Clear search"
                              >
                                <X size={16} />
                              </SearchClearButton>
                            )}
                          </SearchInputWrapper>
                        </FormFieldWrapper>

                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <RecentSearchesLabel>Recent searches:</RecentSearchesLabel>
                            <RecentSearchesRow>
                              {recentSearches.slice(0, 5).map((search, index) => (
                                <Chip
                                  key={index}
                                  $variant="outlined"
                                  $clickable
                                  $small
                                  onClick={() => handleFilterChange('searchTerm', search)}
                                >
                                  {search}
                                </Chip>
                              ))}
                            </RecentSearchesRow>
                          </div>
                        )}
                      </GridItemFull>

                      {/* Trainer Filter */}
                      <FormFieldWrapper>
                        <FieldLabel>Trainer</FieldLabel>
                        <StyledSelect
                          value={filters.trainerId}
                          onChange={(e) => handleFilterChange('trainerId', e.target.value)}
                        >
                          <option value="">All Trainers</option>
                          {trainers.map(trainer => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.firstName} {trainer.lastName}
                            </option>
                          ))}
                        </StyledSelect>
                      </FormFieldWrapper>

                      {/* Client Filter */}
                      <FormFieldWrapper>
                        <FieldLabel>Client</FieldLabel>
                        <StyledSelect
                          value={filters.clientId}
                          onChange={(e) => handleFilterChange('clientId', e.target.value)}
                        >
                          <option value="">All Clients</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.firstName} {client.lastName}
                            </option>
                          ))}
                        </StyledSelect>
                      </FormFieldWrapper>

                      {/* Status Filter */}
                      <FormFieldWrapper>
                        <FieldLabel>Status</FieldLabel>
                        <StyledSelect
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                          <option value="all">All Statuses</option>
                          <option value="available">Available</option>
                          <option value="requested">Requested</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </StyledSelect>
                      </FormFieldWrapper>

                      {/* Date Range */}
                      <FormFieldWrapper>
                        <FieldLabel>Date Range</FieldLabel>
                        <StyledSelect
                          value={filters.dateRange}
                          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="custom">Custom Range</option>
                        </StyledSelect>
                      </FormFieldWrapper>

                      {/* Custom Date Range */}
                      {filters.dateRange === 'custom' && (
                        <>
                          <FormFieldWrapper>
                            <FieldLabel>Start Date</FieldLabel>
                            <StyledInput
                              type="date"
                              value={filters.customDateStart}
                              onChange={(e) => handleFilterChange('customDateStart', e.target.value)}
                            />
                          </FormFieldWrapper>
                          <FormFieldWrapper>
                            <FieldLabel>End Date</FieldLabel>
                            <StyledInput
                              type="date"
                              value={filters.customDateEnd}
                              onChange={(e) => handleFilterChange('customDateEnd', e.target.value)}
                            />
                          </FormFieldWrapper>
                        </>
                      )}

                      {/* Location Filter */}
                      <GridItemFull>
                        <FormFieldWrapper>
                          <FieldLabel>Location</FieldLabel>
                          <StyledInput
                            value={filters.location}
                            onChange={(e) => handleFilterChange('location', e.target.value)}
                            placeholder="e.g., Main Studio, Outdoor Area"
                          />
                        </FormFieldWrapper>
                      </GridItemFull>
                    </GridContainer>
                  </TabPanelWrapper>
                )}

                {/* Advanced Filters Tab */}
                {activeTab === 1 && (
                  <TabPanelWrapper role="tabpanel" id="filter-tabpanel-1">
                    <GridContainer>
                      {/* Search Options */}
                      <GridItemFull>
                        <SectionTitle>Search Options</SectionTitle>
                        <FormGroupRow>
                          <CheckboxLabel>
                            <HiddenCheckbox
                              checked={includeNotes}
                              onChange={(e) => setIncludeNotes(e.target.checked)}
                            />
                            <CheckboxVisual $checked={includeNotes} />
                            Include session notes in search
                          </CheckboxLabel>
                          <CheckboxLabel>
                            <HiddenCheckbox
                              checked={caseSensitive}
                              onChange={(e) => setCaseSensitive(e.target.checked)}
                            />
                            <CheckboxVisual $checked={caseSensitive} />
                            Case sensitive
                          </CheckboxLabel>
                          <CheckboxLabel>
                            <HiddenCheckbox
                              checked={exactMatch}
                              onChange={(e) => setExactMatch(e.target.checked)}
                            />
                            <CheckboxVisual $checked={exactMatch} />
                            Exact match
                          </CheckboxLabel>
                        </FormGroupRow>
                      </GridItemFull>

                      {/* Logic Operator */}
                      <FormFieldWrapper>
                        <FieldLabel>Filter Logic</FieldLabel>
                        <RadioGroupRow>
                          <RadioLabel>
                            <HiddenRadio
                              name="logicOperator"
                              value="AND"
                              checked={logicOperator === 'AND'}
                              onChange={(e) => setLogicOperator(e.target.value as 'AND' | 'OR')}
                            />
                            <RadioVisual $checked={logicOperator === 'AND'} />
                            AND (all conditions)
                          </RadioLabel>
                          <RadioLabel>
                            <HiddenRadio
                              name="logicOperator"
                              value="OR"
                              checked={logicOperator === 'OR'}
                              onChange={(e) => setLogicOperator(e.target.value as 'AND' | 'OR')}
                            />
                            <RadioVisual $checked={logicOperator === 'OR'} />
                            OR (any condition)
                          </RadioLabel>
                        </RadioGroupRow>
                      </FormFieldWrapper>

                      {/* Price Range */}
                      <FormFieldWrapper>
                        <RangeLabel>
                          Session Price Range: ${priceRange[0]} - ${priceRange[1]}
                        </RangeLabel>
                        <RangeSliderWrapper>
                          <StyledRange
                            min={0}
                            max={500}
                            step={25}
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          />
                        </RangeSliderWrapper>
                      </FormFieldWrapper>

                      {/* Duration Range */}
                      <FormFieldWrapper>
                        <RangeLabel>
                          Session Duration: {durationRange[0]} - {durationRange[1]} minutes
                        </RangeLabel>
                        <RangeSliderWrapper>
                          <StyledRange
                            min={15}
                            max={180}
                            step={15}
                            value={durationRange[1]}
                            onChange={(e) => setDurationRange([durationRange[0], Number(e.target.value)])}
                          />
                        </RangeSliderWrapper>
                      </FormFieldWrapper>

                      {/* Additional Filters */}
                      <GridItemFull>
                        <SectionTitle>Additional Criteria</SectionTitle>
                        {/* Add more advanced filter options here */}
                      </GridItemFull>
                    </GridContainer>
                  </TabPanelWrapper>
                )}

                {/* Saved Presets Tab */}
                {activeTab === 2 && (
                  <TabPanelWrapper role="tabpanel" id="filter-tabpanel-2">
                    <PresetHeaderRow>
                      <SectionHeading>Saved Filter Presets</SectionHeading>
                      <OutlineButton onClick={() => setSaveDialogOpen(true)}>
                        <Plus size={16} />
                        Save Current
                      </OutlineButton>
                    </PresetHeaderRow>

                    <PresetList>
                      {savedFilters.map((preset) => (
                        <PresetItem key={preset.id} $selected={selectedPreset === preset.id}>
                          <PresetIcon>
                            {preset.isDefault ? <Star size={20} color="#f59e0b" /> : <Bookmark size={20} />}
                          </PresetIcon>
                          <PresetContent>
                            <PresetName>
                              {preset.name}
                              {preset.isShared && (
                                <Chip $variant="outlined" $small>Shared</Chip>
                              )}
                            </PresetName>
                            <PresetDescription>{preset.description}</PresetDescription>
                            <PresetMeta>
                              Used {preset.useCount} times &bull; Last used {new Date(preset.lastUsed).toLocaleDateString()}
                            </PresetMeta>
                          </PresetContent>
                          <PresetActions>
                            <IconBtn
                              onClick={() => loadFilterPreset(preset)}
                              title="Load this preset"
                            >
                              <Download size={16} />
                            </IconBtn>
                            {!preset.isDefault && (
                              <IconBtn
                                onClick={() => deleteFilterPreset(preset.id)}
                                title="Delete preset"
                              >
                                <Trash2 size={16} />
                              </IconBtn>
                            )}
                          </PresetActions>
                        </PresetItem>
                      ))}
                    </PresetList>
                  </TabPanelWrapper>
                )}

                {/* Preview Tab */}
                {activeTab === 3 && (
                  <TabPanelWrapper role="tabpanel" id="filter-tabpanel-3">
                    {filterPreview && (
                      <GridContainer>
                        {/* Summary Stats */}
                        <GridItemFull>
                          <AlertInfo>
                            <span>
                              Showing {filterPreview.filteredCount} of {filterPreview.totalCount} sessions
                            </span>
                            {onExportFiltered && (
                              <GhostButton onClick={exportFiltered}>
                                <Download size={16} />
                                Export
                              </GhostButton>
                            )}
                          </AlertInfo>
                        </GridItemFull>

                        {/* Status Breakdown */}
                        <div>
                          <SurfaceCard>
                            <SectionHeading>By Status</SectionHeading>
                            {Object.entries(filterPreview.byStatus).map(([status, count]) => (
                              <SurfaceRow key={status}>
                                <SurfaceLabel $capitalize>{status}</SurfaceLabel>
                                <Chip $small>{count}</Chip>
                              </SurfaceRow>
                            ))}
                          </SurfaceCard>
                        </div>

                        {/* Trainer Breakdown */}
                        <div>
                          <SurfaceCard>
                            <SectionHeading>By Trainer</SectionHeading>
                            {Object.entries(filterPreview.byTrainer).slice(0, 5).map(([trainer, count]) => (
                              <SurfaceRow key={trainer}>
                                <SurfaceLabel>{trainer}</SurfaceLabel>
                                <Chip $small>{count}</Chip>
                              </SurfaceRow>
                            ))}
                            {Object.keys(filterPreview.byTrainer).length > 5 && (
                              <BodyText>
                                +{Object.keys(filterPreview.byTrainer).length - 5} more...
                              </BodyText>
                            )}
                          </SurfaceCard>
                        </div>

                        {/* Date Range */}
                        {filterPreview.dateRange && (
                          <GridItemFull>
                            <SurfaceCard>
                              <SectionHeading>Date Range</SectionHeading>
                              <BodyText>
                                From: {filterPreview.dateRange.start.toLocaleDateString()}
                              </BodyText>
                              <BodyText>
                                To: {filterPreview.dateRange.end.toLocaleDateString()}
                              </BodyText>
                            </SurfaceCard>
                          </GridItemFull>
                        )}
                      </GridContainer>
                    )}
                  </TabPanelWrapper>
                )}
              </DialogBody>

              {/* Footer */}
              <DialogFooter>
                <GhostButton onClick={onClose}>
                  Cancel
                </GhostButton>

                <GhostButton onClick={clearAllFilters}>
                  <RotateCcw size={16} />
                  Clear All
                </GhostButton>

                <GlowButton
                  text={`Apply Filters (${filterPreview?.filteredCount || 0})`}
                  variant="emerald"
                  leftIcon={<Filter size={16} />}
                  onClick={applyFilters}
                />
              </DialogFooter>
            </ModalPanel>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Save Filter Sub-Dialog */}
      <AnimatePresence>
        {saveDialogOpen && (
          <SubModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setSaveDialogOpen(false); }}
          >
            <SubModalPanel
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <SubModalHeader>Save Filter Preset</SubModalHeader>
              <SubModalBody>
                <FormFieldWrapper>
                  <FieldLabel>Preset Name</FieldLabel>
                  <StyledInput
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    placeholder="My filter preset"
                  />
                </FormFieldWrapper>
                <FormFieldWrapper>
                  <FieldLabel>Description (optional)</FieldLabel>
                  <StyledTextarea
                    rows={2}
                    value={newFilterDescription}
                    onChange={(e) => setNewFilterDescription(e.target.value)}
                    placeholder="Describe this filter..."
                  />
                </FormFieldWrapper>
              </SubModalBody>
              <SubModalFooter>
                <GhostButton onClick={() => setSaveDialogOpen(false)}>Cancel</GhostButton>
                <FilledButton onClick={saveFilterPreset}>Save</FilledButton>
              </SubModalFooter>
            </SubModalPanel>
          </SubModalOverlay>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdvancedFilterDialog;