import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Copy, TrendingUp, TrendingDown, UploadCloud, X, Scale, Ruler, Activity } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';

// ─── Interfaces (unchanged from blueprint) ─────────────────────────────────────
interface Client { id: string; name: string; }
interface BodyMeasurement {
  id?: string;
  userId: string;
  measurementDate: string;
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  bmi?: number;
  circumferenceUnit?: 'inches' | 'cm';
  neck?: number;
  shoulders?: number;
  chest?: number;
  rightBicep?: number;
  leftBicep?: number;
  rightForearm?: number;
  leftForearm?: number;
  naturalWaist?: number;
  hips?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
  notes?: string;
  photoUrls?: string[];
}
interface RecentMeasurement extends BodyMeasurement {
  id: string;
  recorder?: { firstName?: string; lastName?: string; username?: string };
}

// ─── Framer Motion Variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ─── Measurement Field Definitions ──────────────────────────────────────────────
const measurementFields: { key: keyof BodyMeasurement; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'bodyFatPercentage', label: 'Body Fat %' },
  { key: 'muscleMassPercentage', label: 'Muscle Mass %' },
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightForearm', label: 'Right Forearm' },
  { key: 'leftForearm', label: 'Left Forearm' },
  { key: 'naturalWaist', label: 'Natural Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftThigh', label: 'Left Thigh' },
  { key: 'rightCalf', label: 'Right Calf' },
  { key: 'leftCalf', label: 'Left Calf' },
];

const negativeIsBetter = ['weight', 'bodyFatPercentage', 'naturalWaist', 'hips', 'neck'];

// ─── Keyframe Animations ────────────────────────────────────────────────────────
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────────────────

const PageWrapper = styled(motion.div)`
  padding: 16px;
  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const GlassPanel = styled(motion.div)`
  padding: 16px;
  margin-bottom: 24px;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const DarkPanel = styled.div`
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #00FFFF;
  margin: 0 0 16px 0;
`;

const SubsectionTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 12px 0;
`;

const FieldLabel = styled.span`
  font-size: 0.95rem;
  text-transform: capitalize;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin-bottom: 4px;
`;

const BodyText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.9rem;
`;

const ResponsiveGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const MeasurementGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const FlexRow = styled.div<{ $gap?: number }>`
  display: flex;
  gap: ${({ $gap }) => $gap ?? 8}px;
  align-items: center;
`;

const FlexStack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 8}px;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

// ─── Input / Form Components ────────────────────────────────────────────────────

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledLabel = styled.label`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  padding-left: 2px;
`;

const StyledInput = styled.input<{ $hasAdornment?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  padding-right: ${({ $hasAdornment }) => ($hasAdornment ? '60px' : '12px')};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #00FFFF;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  /* Remove number spinners */
  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const InputAdornmentSpan = styled.span`
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  pointer-events: none;
`;

// ─── Autocomplete / Searchable Select ───────────────────────────────────────────

const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const DropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(20, 27, 40, 0.98);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 0 0 8px 8px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const DropdownItem = styled.div<{ $highlighted?: boolean }>`
  padding: 10px 14px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  background: ${({ $highlighted }) =>
    $highlighted ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

// ─── Button Components ──────────────────────────────────────────────────────────

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: transparent;
  color: #00FFFF;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.08);
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const RemovePhotoButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const UploadZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 120px;
  height: 100%;
  border: 2px dashed rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: rgba(0, 255, 255, 0.7);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: #00FFFF;
    background: rgba(0, 255, 255, 0.04);
  }
`;

// ─── Chip Components ────────────────────────────────────────────────────────────

const ChangeChip = styled.span<{ $variant?: 'success' | 'error' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'success'
        ? '#4caf50'
        : $variant === 'error'
          ? '#f44336'
          : 'rgba(255, 255, 255, 0.3)'};
  color: ${({ $variant }) =>
    $variant === 'success'
      ? '#4caf50'
      : $variant === 'error'
        ? '#f44336'
        : 'rgba(255, 255, 255, 0.7)'};
`;

// ─── List Components ────────────────────────────────────────────────────────────

const MeasurementList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const MeasurementListItem = styled.li`
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.06);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ListPrimary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
`;

const ListSecondary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
  margin-top: 2px;
`;

// ─── Spinner Component ──────────────────────────────────────────────────────────

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.15);
  border-top-color: #00FFFF;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 24px auto;
`;

// ─── Photo Preview ──────────────────────────────────────────────────────────────

const PhotoPreviewWrapper = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
  }
`;

const SaveWrapper = styled.div`
  margin-top: 24px;
  text-align: right;
`;

const ChangeCenter = styled.div`
  text-align: center;
  padding-top: 8px;
`;

// ─── Detail Modal Components ─────────────────────────────────────────────────────

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalContent = styled(motion.div)`
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.05);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const ModalCloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const DetailCell = styled.div`
  padding: 12px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const DetailLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 1.15rem;
  color: #fff;
  font-weight: 600;
`;

const DetailUnit = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  margin-left: 4px;
`;

const DetailPhotoGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
  margin-top: 16px;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

// ─── 3D Progress Graph Styled Components ────────────────────────────────────────

const ProgressGraphSection = styled(motion.div)`
  margin-bottom: 24px;
`;

const HeroMetricGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  margin-bottom: 24px;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const HeroMetricCard = styled(motion.div)<{ $positive?: boolean }>`
  padding: 20px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(0, 255, 255, 0.15)'};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $positive }) =>
      $positive
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, transparent 60%)'
        : 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, transparent 60%)'};
    pointer-events: none;
  }
`;

const HeroMetricLabel = styled.div`
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
`;

const HeroMetricValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#00FFFF')};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 2.2rem;
  }
`;

const HeroMetricUnit = styled.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;
`;

const HeroMetricIcon = styled.div<{ $positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(0, 255, 255, 0.1)'};
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#00FFFF')};
  margin-bottom: 8px;
`;

const ChartWrapper3D = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  margin-bottom: 24px;
  perspective: 1200px;

  & > div {
    transform: rotateX(5deg);
    transform-origin: center bottom;
    transition: transform 0.4s ease;
  }

  &:hover > div {
    transform: rotateX(0deg);
  }
`;

const ChartTitle3D = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartRow = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const CustomTooltipBox = styled.div`
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 255, 255, 0.05);

  .tooltip-label {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
    font-weight: 500;
  }

  .tooltip-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #fff;
    padding: 2px 0;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
`;

// ═════════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════════

const MeasurementEntry: React.FC = () => {
  const { clientId: routeClientId } = useParams<{ clientId?: string }>();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const [newMeasurement, setNewMeasurement] = useState<Partial<BodyMeasurement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [savedPhotoUrls, setSavedPhotoUrls] = useState<string[]>([]);
  const [detailMeasurement, setDetailMeasurement] = useState<RecentMeasurement | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Autocomplete state
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ─── Chart Data Memos ──────────────────────────────────────────────────────
  const radarLabelMap: Record<string, string> = {
    neck: 'Neck', shoulders: 'Shoulders', chest: 'Chest', rightBicep: 'Bicep',
    naturalWaist: 'Waist', hips: 'Hips', rightThigh: 'Thigh', rightCalf: 'Calf',
  };

  const trendData = useMemo(() => {
    if (recentMeasurements.length < 2) return [];
    return [...recentMeasurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .map(m => ({
        date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight || null,
        bodyFat: m.bodyFatPercentage || null,
        waist: m.naturalWaist || null,
      }));
  }, [recentMeasurements]);

  const radarData = useMemo(() => {
    if (recentMeasurements.length < 2) return [];
    const sorted = [...recentMeasurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const fields = ['neck', 'shoulders', 'chest', 'rightBicep', 'naturalWaist', 'hips', 'rightThigh', 'rightCalf'] as const;
    return fields
      .map(f => ({
        metric: radarLabelMap[f] || f,
        first: (first as any)[f] || 0,
        current: (latest as any)[f] || 0,
      }))
      .filter(d => d.first > 0 || d.current > 0);
  }, [recentMeasurements]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRes = await apiService.get('/api/admin/clients');
        const rawClients = clientsRes.data?.data?.clients || clientsRes.data?.clients || clientsRes.data || [];
        const mapped = (Array.isArray(rawClients) ? rawClients : []).map((c: any) => ({
          id: String(c.id),
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || `Client ${c.id}`,
        }));
        setClients(mapped);
        // Auto-select client from route param
        if (routeClientId) {
          const match = mapped.find((c: Client) => c.id === routeClientId);
          if (match) {
            setSelectedClient(match);
            setClientSearch(match.name);
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    fetchClients();
  }, [toast, routeClientId]);

  useEffect(() => {
    if (selectedClient) {
      const fetchLatest = async () => {
        setIsLoading(true);
        try {
          const response = await apiService.get(`/api/measurements/user/${selectedClient.id}/latest`);
          const measurement = response.data?.data || response.data;
          setLatestMeasurement(measurement);
          setNewMeasurement({
            userId: selectedClient.id,
            measurementDate: new Date().toISOString().split('T')[0],
            weightUnit: response.data?.weightUnit || 'lbs',
            circumferenceUnit: response.data?.circumferenceUnit || 'inches',
          });
        } catch (error) {
          setLatestMeasurement(null);
          setNewMeasurement({
            userId: selectedClient.id,
            measurementDate: new Date().toISOString().split('T')[0],
            weightUnit: 'lbs',
            circumferenceUnit: 'inches',
          });
          toast({ title: 'Info', description: 'No previous measurements found for this client.', variant: 'default' });
        } finally {
          setIsLoading(false);
        }
      };
      const fetchRecent = async () => {
        setLoadingRecent(true);
        try {
          const response = await apiService.get(`/api/measurements/user/${selectedClient.id}?limit=100`);
          const recentData = response.data?.data?.measurements || response.data?.measurements || [];
          setRecentMeasurements(recentData);
        } catch (error) {
          console.error('Failed to load recent measurements', error);
          setRecentMeasurements([]);
        } finally {
          setLoadingRecent(false);
        }
      };
      const fetchStats = async () => {
        try {
          const response = await apiService.get(`/api/measurements/user/${selectedClient.id}/stats`);
          setStats(response.data?.data || response.data);
        } catch {
          setStats(null);
        }
      };

      fetchLatest();
      fetchRecent();
      fetchStats();
    } else {
      setLatestMeasurement(null);
      setNewMeasurement({});
      setRecentMeasurements([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
      setStats(null);
    }
  }, [selectedClient, toast]);

  const handleCopyLast = () => {
    if (!latestMeasurement) return;
    setNewMeasurement({
      ...latestMeasurement,
      id: undefined,
      measurementDate: new Date().toISOString().split('T')[0],
      notes: '',
      photoUrls: [],
    });
    // Show saved photos from previous measurement
    if (latestMeasurement.photoUrls && latestMeasurement.photoUrls.length > 0) {
      setSavedPhotoUrls(latestMeasurement.photoUrls);
    }
    toast({ title: 'Copied', description: 'Previous measurements copied. Update any changes.' });
  };

  const handleInputChange = (field: keyof BodyMeasurement, value: string) => {
    setNewMeasurement((prev) => ({
      ...prev,
      [field]: value === '' ? undefined : Number(value),
    }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setPhotoFiles((prev) => [...prev, ...files]);

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeSavedPhoto = (index: number) => {
    setSavedPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      // Start with any saved photos the user kept from previous measurement
      let uploadedPhotoUrls: string[] = [...savedPhotoUrls];

      if (photoFiles.length > 0) {
        const formData = new FormData();
        photoFiles.forEach((file) => {
          formData.append('photos', file);
        });

        const uploadResponse = await apiService.post('/api/measurements/upload-photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedPhotoUrls = [...uploadedPhotoUrls, ...uploadResponse.data.photoUrls];
      }

      const payload = { ...newMeasurement, userId: selectedClient.id, photoUrls: uploadedPhotoUrls };
      const response = await apiService.post('/api/measurements', payload);

      toast({ title: 'Success', description: 'Measurements saved successfully!' });
      const saveData = response.data?.data || response.data;
      const milestones = saveData?.milestones || saveData?.milestonesAchieved || [];
      if (milestones.length > 0) {
        milestones.forEach((milestone: any) => {
          toast({ title: 'Milestone!', description: milestone.celebrationMessage, variant: 'success' });
        });
      }
      setSelectedClient(null);
      setClientSearch('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save measurements.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowDropdown(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setShowDropdown(false);
  };

  const renderChange = (field: keyof BodyMeasurement) => {
    const prevValue = latestMeasurement?.[field] as number | undefined;
    const newValue = newMeasurement?.[field] as number | undefined;

    if (prevValue === undefined || newValue === undefined || isNaN(prevValue) || isNaN(newValue)) {
      return <ChangeChip>N/A</ChangeChip>;
    }

    const change = newValue - prevValue;
    const isGood = negativeIsBetter.includes(field) ? change < 0 : change > 0;

    if (change === 0) {
      return <ChangeChip>&rarr; 0.0</ChangeChip>;
    }

    return (
      <ChangeChip $variant={isGood ? 'success' : 'error'}>
        {isGood ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        {change > 0 ? '+' : ''}
        {change.toFixed(2)}
      </ChangeChip>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Client Selection Panel ── */}
      <GlassPanel as={motion.div} variants={itemVariants}>
        <SectionTitle>Body Measurements Entry</SectionTitle>
        <ResponsiveGrid>
          {/* Searchable Client Select */}
          <AutocompleteWrapper ref={autocompleteRef}>
            <InputWrapper>
              <StyledLabel>Select Client</StyledLabel>
              <FlexRow $gap={0} style={{ position: 'relative' }}>
                <StyledInput
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedClient && e.target.value !== selectedClient.name) {
                      setSelectedClient(null);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  $hasAdornment={!!selectedClient}
                />
                {selectedClient && (
                  <InputAdornmentSpan
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={handleClearClient}
                  >
                    <X size={16} />
                  </InputAdornmentSpan>
                )}
              </FlexRow>
            </InputWrapper>
            {showDropdown && clientSearch.length > 0 && (
              <DropdownList>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <DropdownItem
                      key={client.id}
                      $highlighted={selectedClient?.id === client.id}
                      onClick={() => handleSelectClient(client)}
                    >
                      {client.name}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem>No clients found</DropdownItem>
                )}
              </DropdownList>
            )}
          </AutocompleteWrapper>

          {/* Measurement Date */}
          <InputWrapper>
            <StyledLabel>Measurement Date</StyledLabel>
            <StyledInput
              type="date"
              value={newMeasurement.measurementDate || ''}
              onChange={(e) =>
                setNewMeasurement((p) => ({ ...p, measurementDate: e.target.value }))
              }
              disabled={!selectedClient}
            />
          </InputWrapper>
        </ResponsiveGrid>
      </GlassPanel>

      {/* ── Recent Measurements Panel ── */}
      <AnimatePresence>
        {selectedClient && (
          <GlassPanel
            as={motion.div}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <SubsectionTitle>
              Recent Measurements for {selectedClient.name}
            </SubsectionTitle>
            {loadingRecent ? (
              <BodyText>Loading recent measurements...</BodyText>
            ) : recentMeasurements.length > 0 ? (
              <MeasurementList>
                {recentMeasurements.map((measurement) => (
                  <MeasurementListItem
                    key={measurement.id}
                    onClick={() => setDetailMeasurement(measurement)}
                    style={{ cursor: 'pointer' }}
                  >
                    <ListPrimary>
                      {new Date(measurement.measurementDate).toLocaleDateString()}
                      {measurement.weight ? ` — ${measurement.weight} lbs` : ''}
                    </ListPrimary>
                    <ListSecondary>
                      {[
                        measurement.bodyFatPercentage && `Body Fat: ${measurement.bodyFatPercentage}%`,
                        measurement.chest && `Chest: ${measurement.chest}"`,
                        measurement.naturalWaist && `Waist: ${measurement.naturalWaist}"`,
                        measurement.hips && `Hips: ${measurement.hips}"`,
                      ].filter(Boolean).join(' · ') || 'Click to view details'}
                    </ListSecondary>
                  </MeasurementListItem>
                ))}
              </MeasurementList>
            ) : (
              <BodyText>No recent measurements found for this client.</BodyText>
            )}
          </GlassPanel>
        )}
      </AnimatePresence>

      {/* ── 3D Progress Graph Section ── */}
      <AnimatePresence>
        {selectedClient && trendData.length >= 2 && (
          <ProgressGraphSection
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <GlassPanel>
              <SectionTitle>Progress at a Glance</SectionTitle>

              {/* Hero Metric Cards */}
              {stats?.totalChange && (
                <HeroMetricGrid>
                  {[
                    { label: 'Weight Change', value: stats.totalChange.weight, unit: 'lbs', Icon: Scale },
                    { label: 'Body Fat Change', value: stats.totalChange.bodyFat, unit: '%', Icon: Activity },
                    { label: 'Waist Change', value: stats.totalChange.waist, unit: 'in', Icon: Ruler },
                  ].map(({ label, value, unit, Icon }) => {
                    const numVal = value !== null && value !== undefined ? parseFloat(value) : null;
                    const isPositiveChange = numVal !== null && numVal < 0;
                    return (
                      <HeroMetricCard
                        key={label}
                        $positive={isPositiveChange}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <HeroMetricIcon $positive={isPositiveChange}>
                          <Icon size={18} />
                        </HeroMetricIcon>
                        <HeroMetricLabel>{label}</HeroMetricLabel>
                        <HeroMetricValue $positive={isPositiveChange}>
                          {numVal !== null ? (
                            <>
                              {numVal > 0 ? '+' : ''}{numVal.toFixed(1)}
                              <HeroMetricUnit>{unit}</HeroMetricUnit>
                            </>
                          ) : '—'}
                        </HeroMetricValue>
                      </HeroMetricCard>
                    );
                  })}
                </HeroMetricGrid>
              )}

              {/* Charts Row: Area + Radar side by side on desktop */}
              <ChartRow>
                {/* 3D Area Chart — Trend Over Time */}
                <ChartWrapper3D>
                  <div>
                    <ChartTitle3D>Trend Over Time</ChartTitle3D>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00FFFF" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#00FFFF" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7851A9" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#7851A9" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                          tickLine={false}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                          tickLine={false}
                          label={{ value: 'lbs / in', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                          axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                          tickLine={false}
                          label={{ value: '%', angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                        />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <CustomTooltipBox>
                                <div className="tooltip-label">{label}</div>
                                {payload.map((p: any, i: number) => (
                                  <div key={i} className="tooltip-item">
                                    <span className="dot" style={{ background: p.color }} />
                                    {p.name}: <strong>{p.value?.toFixed(1)}</strong>
                                  </div>
                                ))}
                              </CustomTooltipBox>
                            );
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="weight"
                          name="Weight (lbs)"
                          stroke="#00FFFF"
                          strokeWidth={2.5}
                          fill="url(#gradCyan)"
                          dot={{ fill: '#00FFFF', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#00FFFF', stroke: '#0a0a1a', strokeWidth: 2 }}
                          connectNulls
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="bodyFat"
                          name="Body Fat (%)"
                          stroke="#7851A9"
                          strokeWidth={2}
                          fill="url(#gradPurple)"
                          dot={{ fill: '#7851A9', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#7851A9', stroke: '#0a0a1a', strokeWidth: 2 }}
                          connectNulls
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="waist"
                          name="Waist (in)"
                          stroke="#2DD4BF"
                          strokeWidth={2}
                          fill="transparent"
                          dot={{ fill: '#2DD4BF', r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#2DD4BF', stroke: '#0a0a1a', strokeWidth: 2 }}
                          connectNulls
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartWrapper3D>

                {/* Radar Chart — Body Shape Comparison */}
                {radarData.length >= 3 && (
                  <ChartWrapper3D>
                    <div>
                      <ChartTitle3D>Body Shape: First vs Now</ChartTitle3D>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                          <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            tick={{ fill: 'rgba(255, 255, 255, 0.3)', fontSize: 9 }}
                            axisLine={false}
                          />
                          <Radar
                            name="First"
                            dataKey="first"
                            stroke="#00FFFF"
                            fill="#00FFFF"
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                          <Radar
                            name="Current"
                            dataKey="current"
                            stroke="#7851A9"
                            fill="#7851A9"
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                          <Legend
                            wrapperStyle={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper3D>
                )}
              </ChartRow>

              {/* Summary stats */}
              {stats && (
                <FlexRow $gap={24} style={{ justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <BodyText>
                    <span style={{ color: '#00FFFF' }}>{stats.totalMeasurements}</span> measurements over{' '}
                    <span style={{ color: '#00FFFF' }}>{stats.daysSinceStart}</span> days
                  </BodyText>
                </FlexRow>
              )}
            </GlassPanel>
          </ProgressGraphSection>
        )}
      </AnimatePresence>

      {/* ── Measurement Entry Form ── */}
      {selectedClient &&
        (isLoading ? (
          <Spinner />
        ) : (
          <motion.div variants={itemVariants}>
            {/* Measurement Fields */}
            <GlassPanel>
              <HeaderRow>
                <SubsectionTitle style={{ margin: 0 }}>
                  New Measurements for {selectedClient.name}
                </SubsectionTitle>
                <OutlinedButton
                  onClick={handleCopyLast}
                  disabled={!latestMeasurement}
                >
                  <Copy size={16} />
                  Copy from Last
                </OutlinedButton>
              </HeaderRow>

              <MeasurementGrid>
                {measurementFields.map(({ key, label }) => (
                  <DarkPanel key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <FlexStack $gap={12} style={{ marginTop: 12, flex: 1 }}>
                      {/* Previous value */}
                      <InputWrapper>
                        <StyledLabel>Previous</StyledLabel>
                        <StyledInput
                          type="text"
                          value={latestMeasurement?.[key] ?? 'N/A'}
                          disabled
                        />
                      </InputWrapper>

                      {/* New value */}
                      <InputWrapper>
                        <StyledLabel>New</StyledLabel>
                        <StyledInput
                          type="number"
                          value={newMeasurement[key] ?? ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          $hasAdornment
                        />
                        <InputAdornmentSpan>
                          {key === 'weight'
                            ? newMeasurement.weightUnit
                            : key === 'bodyFatPercentage' || key === 'muscleMassPercentage'
                              ? '%'
                              : newMeasurement.circumferenceUnit}
                        </InputAdornmentSpan>
                      </InputWrapper>

                      {/* Change indicator */}
                      <ChangeCenter>{renderChange(key)}</ChangeCenter>
                    </FlexStack>
                  </DarkPanel>
                ))}
              </MeasurementGrid>
            </GlassPanel>

            {/* Progress Photos */}
            <GlassPanel>
              <SubsectionTitle>Progress Photos</SubsectionTitle>
              <PhotoGrid>
                {/* Saved photos from previous measurement (via Copy from Last) */}
                {savedPhotoUrls.map((url, index) => (
                  <PhotoPreviewWrapper key={`saved-${index}`}>
                    <img src={url} alt={`Saved ${index + 1}`} />
                    <RemovePhotoButton onClick={() => removeSavedPhoto(index)}>
                      <X size={16} color="white" />
                    </RemovePhotoButton>
                  </PhotoPreviewWrapper>
                ))}
                {/* Newly selected photos (local blob previews) */}
                {photoPreviews.map((previewUrl, index) => (
                  <PhotoPreviewWrapper key={`new-${index}`}>
                    <img src={previewUrl} alt={`Preview ${index + 1}`} />
                    <RemovePhotoButton onClick={() => removePhoto(index)}>
                      <X size={16} color="white" />
                    </RemovePhotoButton>
                  </PhotoPreviewWrapper>
                ))}
                <UploadZone>
                  <UploadCloud size={24} />
                  Upload JPEG
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/jpeg,.jpg,.jpeg"
                    onChange={handlePhotoChange}
                  />
                </UploadZone>
              </PhotoGrid>
            </GlassPanel>

            {/* Save Button */}
            <SaveWrapper>
              <GlowButton
                text="Save Measurements"
                theme="emerald"
                leftIcon={<Save />}
                onClick={handleSave}
                isLoading={isSaving}
              />
            </SaveWrapper>
          </motion.div>
        ))}
      {/* ── Measurement Detail Modal ── */}
      <AnimatePresence>
        {detailMeasurement && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailMeasurement(null)}
          >
            <ModalContent
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalHeader>
                <div>
                  <SectionTitle style={{ marginBottom: 4 }}>
                    {new Date(detailMeasurement.measurementDate).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </SectionTitle>
                  {detailMeasurement.recorder && (
                    <BodyText>
                      Recorded by {detailMeasurement.recorder.firstName || detailMeasurement.recorder.username || 'Trainer'}
                    </BodyText>
                  )}
                </div>
                <ModalCloseButton onClick={() => setDetailMeasurement(null)}>
                  <X size={18} />
                </ModalCloseButton>
              </ModalHeader>

              <DetailGrid>
                {measurementFields.map(({ key, label }) => {
                  const value = detailMeasurement[key];
                  if (value === undefined || value === null) return null;
                  const unit = key === 'weight'
                    ? detailMeasurement.weightUnit || 'lbs'
                    : key === 'bodyFatPercentage' || key === 'muscleMassPercentage'
                      ? '%'
                      : detailMeasurement.circumferenceUnit || 'in';
                  return (
                    <DetailCell key={key}>
                      <DetailLabel>{label}</DetailLabel>
                      <DetailValue>
                        {typeof value === 'number' ? value.toFixed(1) : value}
                        <DetailUnit>{unit}</DetailUnit>
                      </DetailValue>
                    </DetailCell>
                  );
                })}
              </DetailGrid>

              {detailMeasurement.notes && (
                <div style={{ marginTop: 16 }}>
                  <SubsectionTitle>Notes</SubsectionTitle>
                  <BodyText>{detailMeasurement.notes}</BodyText>
                </div>
              )}

              {detailMeasurement.photoUrls && detailMeasurement.photoUrls.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <SubsectionTitle>Progress Photos</SubsectionTitle>
                  <DetailPhotoGrid>
                    {detailMeasurement.photoUrls.map((url, i) => (
                      <PhotoPreviewWrapper key={i}>
                        <img src={url} alt={`Progress ${i + 1}`} />
                      </PhotoPreviewWrapper>
                    ))}
                  </DetailPhotoGrid>
                </div>
              )}
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default MeasurementEntry;
