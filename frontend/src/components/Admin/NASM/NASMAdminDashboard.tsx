/**
 * NASM Admin Dashboard - Master Control Panel
 *
 * Admin-only NASM features:
 * 1. Template Builder - Create/approve workout templates
 * 2. Exercise Library Manager - Add/approve exercises
 * 3. Compliance Dashboard - Monitor trainer certifications & client metrics
 * 4. Certification Verification - Verify trainer NASM certs
 *
 * Access: Admin tier only (user_tier = 'admin')
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  BarChart3,
  Dumbbell,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';

/* =============================================
   INTERFACES (unchanged)
   ============================================= */

interface ComplianceMetrics {
  total_clients: number;
  total_active_protocols: number;
  avg_compliance_rate: number;
  active_cpt_trainers: number;
  active_ces_trainers: number;
  active_pes_trainers: number;
  approved_exercises: number;
  approved_templates: number;
  total_assessments_30d: number;
  total_sessions_30d: number;
}

interface WorkoutTemplate {
  id: string;
  template_name: string;
  opt_phase: string;
  difficulty_level: string;
  target_duration_minutes: number;
  equipment_required: string[];
  approved: boolean;
  usage_count: number;
  average_rating: number | null;
  created_at: string;
}

interface Exercise {
  id: string;
  exercise_name: string;
  opt_phases: number[];
  exercise_type: string;
  primary_body_part: string;
  primary_equipment: string;
  approved: boolean;
  demo_video_url: string | null;
}

interface TrainerCertification {
  id: string;
  trainer_id: string;
  trainer_name: string;
  certification_type: string;
  certification_number: string;
  issue_date: string;
  expiration_date: string;
  status: 'active' | 'expired' | 'pending_renewal';
  certificate_url: string | null;
  verified_at: string | null;
}

/* =============================================
   STYLED COMPONENTS
   ============================================= */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;
`;

const PageTitle = styled.h4`
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 8px 0;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(226, 232, 240, 0.6);
  margin: 0 0 32px 0;
`;

const TabBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $active }) =>
    $active
      ? css`
          background: rgba(14, 165, 233, 0.2);
          color: #0ea5e9;
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
        `
      : css`
          background: transparent;
          color: rgba(226, 232, 240, 0.6);

          &:hover {
            background: rgba(14, 165, 233, 0.08);
            color: #e2e8f0;
          }
        `}
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const SectionTitle = styled.h5`
  font-size: 1.25rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
`;

const GlassCard = styled.div<{ $bgColor?: string }>`
  background: ${({ $bgColor }) => $bgColor || 'rgba(15, 23, 42, 0.95)'};
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthRow = styled.div`
  margin-top: 24px;
`;

const MetricCard = styled(GlassCard)<{ $accent: string }>`
  border-left: 4px solid ${({ $accent }) => $accent};
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricValue = styled.span`
  font-size: 2.25rem;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.1;
`;

const MetricLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.6);
  margin-top: 4px;
  display: block;
`;

const IconWrap = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'rgba(226, 232, 240, 0.35)'};
  display: flex;
  align-items: center;
`;

const HorizontalRule = styled.hr`
  border: none;
  border-top: 1px solid rgba(14, 165, 233, 0.15);
  margin: 16px 0;
`;

const RowBetween = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StackColumn = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 12}px;
`;

const StackRow = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${({ $gap }) => $gap ?? 8}px;
`;

const CardTitle = styled.h6`
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 4px 0;
`;

const BodyText = styled.span`
  font-size: 0.9375rem;
  color: #e2e8f0;
`;

const CaptionText = styled.span`
  font-size: 0.8125rem;
  color: rgba(226, 232, 240, 0.6);
`;

/* --- Chip / Badge --- */
type ChipVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';

const chipColors: Record<ChipVariant, { bg: string; text: string }> = {
  primary: { bg: 'rgba(14, 165, 233, 0.18)', text: '#0ea5e9' },
  success: { bg: 'rgba(34, 197, 94, 0.18)', text: '#22c55e' },
  warning: { bg: 'rgba(234, 179, 8, 0.18)', text: '#eab308' },
  error: { bg: 'rgba(239, 68, 68, 0.18)', text: '#ef4444' },
  info: { bg: 'rgba(99, 102, 241, 0.18)', text: '#818cf8' },
  default: { bg: 'rgba(226, 232, 240, 0.12)', text: '#e2e8f0' },
};

const Chip = styled.span<{ $variant?: ChipVariant; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ $small }) => ($small ? '2px 10px' : '4px 14px')};
  border-radius: 999px;
  font-size: ${({ $small }) => ($small ? '0.75rem' : '0.8125rem')};
  font-weight: 500;
  white-space: nowrap;
  background: ${({ $variant }) => chipColors[$variant || 'default'].bg};
  color: ${({ $variant }) => chipColors[$variant || 'default'].text};
`;

/* --- Buttons --- */
const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #0ea5e9, #7851a9);
  color: #fff;

  &:hover {
    opacity: 0.9;
    box-shadow: 0 0 16px rgba(14, 165, 233, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: #0ea5e9;

  &:hover {
    background: rgba(14, 165, 233, 0.08);
    border-color: #0ea5e9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SmallButton = styled.button<{ $variant?: 'success' | 'primary' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          &:hover {
            background: rgba(34, 197, 94, 0.35);
          }
        `;
      default:
        return css`
          background: rgba(14, 165, 233, 0.15);
          color: #0ea5e9;
          &:hover {
            background: rgba(14, 165, 233, 0.25);
          }
        `;
    }
  }}
`;

const SmallLinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  background: rgba(14, 165, 233, 0.15);
  color: #0ea5e9;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.25);
  }
`;

const IconBtn = styled.button<{ $color?: 'success' | 'primary' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;

  ${({ $color }) => {
    switch ($color) {
      case 'success':
        return css`
          color: #22c55e;
          &:hover { background: rgba(34, 197, 94, 0.15); }
        `;
      case 'error':
        return css`
          color: #ef4444;
          &:hover { background: rgba(239, 68, 68, 0.15); }
        `;
      default:
        return css`
          color: #0ea5e9;
          &:hover { background: rgba(14, 165, 233, 0.15); }
        `;
    }
  }}
`;

/* --- Table --- */
const TableWrapper = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  overflow-x: auto;
  backdrop-filter: blur(12px);
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const THead = styled.thead`
  background: rgba(14, 165, 233, 0.06);
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(14, 165, 233, 0.15);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  vertical-align: middle;
`;

const Tr = styled.tr`
  transition: background 0.15s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.04);
  }
`;

/* --- Alert --- */
const AlertInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: #818cf8;
  font-size: 0.875rem;
  margin-top: 16px;
`;

/* --- Spinner --- */
const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid rgba(14, 165, 233, 0.15);
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const SpinnerCenter = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0;
`;

const VerifiedText = styled.span`
  font-size: 0.8125rem;
  color: #22c55e;
`;

const TwoColActivityGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

/* =============================================
   COMPONENT
   ============================================= */

const NASMAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Compliance Dashboard State
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);

  // Template Builder State
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Exercise Library State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);

  // Certification Verification State
  const [certifications, setCertifications] = useState<TrainerCertification[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'admin') {
      window.location.href = '/dashboard/client';
    }
  }, [user]);

  // Load initial data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 0: // Compliance Dashboard
          await loadComplianceMetrics();
          break;
        case 1: // Template Builder
          await loadWorkoutTemplates();
          break;
        case 2: // Exercise Library
          await loadExercises();
          break;
        case 3: // Certifications
          await loadCertifications();
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // COMPLIANCE DASHBOARD
  // ========================================
  const loadComplianceMetrics = async () => {
    const response = await api.get('/api/admin/nasm/compliance-metrics');
    setMetrics(response.data);
  };

  const refreshMetrics = async () => {
    setLoading(true);
    await api.post('/api/admin/nasm/refresh-compliance-view');
    await loadComplianceMetrics();
    setLoading(false);
  };

  // ========================================
  // TEMPLATE BUILDER
  // ========================================
  const loadWorkoutTemplates = async () => {
    const response = await api.get('/api/admin/workout-templates');
    setTemplates(response.data);
  };

  const approveTemplate = async (templateId: string) => {
    await api.put(`/api/admin/workout-templates/${templateId}/approve`);
    await loadWorkoutTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await api.delete(`/api/admin/workout-templates/${templateId}`);
      await loadWorkoutTemplates();
    }
  };

  // ========================================
  // EXERCISE LIBRARY
  // ========================================
  const loadExercises = async () => {
    const response = await api.get('/api/admin/exercise-library');
    setExercises(response.data);
  };

  const approveExercise = async (exerciseId: string) => {
    await api.put(`/api/admin/exercise-library/${exerciseId}`, { approved: true });
    await loadExercises();
  };

  const deleteExercise = async (exerciseId: string) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      await api.delete(`/api/admin/exercise-library/${exerciseId}`);
      await loadExercises();
    }
  };

  // ========================================
  // CERTIFICATION VERIFICATION
  // ========================================
  const loadCertifications = async () => {
    const response = await api.get('/api/admin/trainer-certifications');
    setCertifications(response.data);
  };

  const verifyCertification = async (certId: string) => {
    await api.put(`/api/admin/trainer-certifications/${certId}/verify`);
    await loadCertifications();
  };

  // ========================================
  // RENDER HELPERS
  // ========================================
  const getPhaseLabel = (phase: string): string => {
    const labels: { [key: string]: string } = {
      phase_1_stabilization: 'Phase 1: Stabilization',
      phase_2_strength_endurance: 'Phase 2: Strength Endurance',
      phase_3_hypertrophy: 'Phase 3: Hypertrophy',
      phase_4_maximal_strength: 'Phase 4: Max Strength',
      phase_5_power: 'Phase 5: Power',
    };
    return labels[phase] || phase;
  };

  const getCertChipVariant = (status: string): ChipVariant => {
    if (status === 'active') return 'success';
    if (status === 'expired') return 'error';
    return 'warning';
  };

  // ========================================
  // TAB 0: COMPLIANCE DASHBOARD
  // ========================================
  const renderComplianceDashboard = () => (
    <div>
      <SectionHeader>
        <SectionTitle>NASM Compliance Metrics</SectionTitle>
        <OutlineButton onClick={refreshMetrics} disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </OutlineButton>
      </SectionHeader>

      {metrics && (
        <>
          <MetricGrid>
            {/* Client Metrics */}
            <MetricCard $accent="#0ea5e9">
              <MetricRow>
                <div>
                  <MetricValue>{metrics.total_clients}</MetricValue>
                  <MetricLabel>Total Clients</MetricLabel>
                </div>
                <IconWrap $color="rgba(14, 165, 233, 0.35)">
                  <Dumbbell size={48} />
                </IconWrap>
              </MetricRow>
            </MetricCard>

            {/* Active Protocols */}
            <MetricCard $accent="#22c55e">
              <MetricRow>
                <div>
                  <MetricValue>{metrics.total_active_protocols}</MetricValue>
                  <MetricLabel>Active Corrective Protocols</MetricLabel>
                </div>
                <IconWrap $color="rgba(34, 197, 94, 0.35)">
                  <BarChart3 size={48} />
                </IconWrap>
              </MetricRow>
            </MetricCard>

            {/* Avg Compliance Rate */}
            <MetricCard $accent="#eab308">
              <MetricRow>
                <div>
                  <MetricValue>{metrics.avg_compliance_rate?.toFixed(1) || 0}%</MetricValue>
                  <MetricLabel>Avg Homework Compliance</MetricLabel>
                </div>
                <IconWrap $color="rgba(234, 179, 8, 0.35)">
                  <TrendingUp size={48} />
                </IconWrap>
              </MetricRow>
            </MetricCard>

            {/* Certified Trainers */}
            <MetricCard $accent="#818cf8">
              <MetricRow>
                <div>
                  <MetricValue>{metrics.active_cpt_trainers}</MetricValue>
                  <MetricLabel>Active CPT Trainers</MetricLabel>
                </div>
                <IconWrap $color="rgba(99, 102, 241, 0.35)">
                  <ShieldCheck size={48} />
                </IconWrap>
              </MetricRow>
            </MetricCard>
          </MetricGrid>

          <TwoColGrid>
            {/* Trainer Breakdown */}
            <GlassCard>
              <CardTitle>Trainer Certifications</CardTitle>
              <HorizontalRule />
              <StackColumn $gap={14}>
                <RowBetween>
                  <BodyText>NASM-CPT (Personal Trainer)</BodyText>
                  <Chip $variant="primary">{metrics.active_cpt_trainers}</Chip>
                </RowBetween>
                <RowBetween>
                  <BodyText>NASM-CES (Corrective Exercise)</BodyText>
                  <Chip $variant="success">{metrics.active_ces_trainers}</Chip>
                </RowBetween>
                <RowBetween>
                  <BodyText>NASM-PES (Performance)</BodyText>
                  <Chip $variant="warning">{metrics.active_pes_trainers}</Chip>
                </RowBetween>
              </StackColumn>
            </GlassCard>

            {/* Content Library */}
            <GlassCard>
              <CardTitle>Content Library Status</CardTitle>
              <HorizontalRule />
              <StackColumn $gap={14}>
                <RowBetween>
                  <BodyText>Approved Exercises</BodyText>
                  <Chip $variant="primary">{metrics.approved_exercises}</Chip>
                </RowBetween>
                <RowBetween>
                  <BodyText>Approved Templates</BodyText>
                  <Chip $variant="success">{metrics.approved_templates}</Chip>
                </RowBetween>
              </StackColumn>
            </GlassCard>
          </TwoColGrid>

          {/* Activity Metrics (Last 30 Days) */}
          <FullWidthRow>
            <GlassCard>
              <CardTitle>Activity Metrics (Last 30 Days)</CardTitle>
              <HorizontalRule />
              <TwoColActivityGrid>
                <RowBetween>
                  <BodyText>Movement Assessments</BodyText>
                  <Chip $variant="info">{metrics.total_assessments_30d}</Chip>
                </RowBetween>
                <RowBetween>
                  <BodyText>Training Sessions Logged</BodyText>
                  <Chip $variant="info">{metrics.total_sessions_30d}</Chip>
                </RowBetween>
              </TwoColActivityGrid>
            </GlassCard>
          </FullWidthRow>
        </>
      )}

      {loading && (
        <SpinnerCenter>
          <Spinner />
        </SpinnerCenter>
      )}
    </div>
  );

  // ========================================
  // TAB 1: TEMPLATE BUILDER
  // ========================================
  const renderTemplateBuilder = () => (
    <div>
      <SectionHeader>
        <SectionTitle>Workout Template Manager</SectionTitle>
        <PrimaryButton onClick={() => setTemplateDialogOpen(true)}>
          <Plus size={16} />
          Create Template
        </PrimaryButton>
      </SectionHeader>

      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <Th>Template Name</Th>
              <Th>Phase</Th>
              <Th>Difficulty</Th>
              <Th>Duration</Th>
              <Th>Usage</Th>
              <Th>Rating</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {templates.map((template) => (
              <Tr key={template.id}>
                <Td>{template.template_name}</Td>
                <Td>{getPhaseLabel(template.opt_phase)}</Td>
                <Td>
                  <Chip
                    $small
                    $variant={
                      template.difficulty_level === 'beginner'
                        ? 'success'
                        : template.difficulty_level === 'intermediate'
                        ? 'warning'
                        : 'error'
                    }
                  >
                    {template.difficulty_level}
                  </Chip>
                </Td>
                <Td>{template.target_duration_minutes} min</Td>
                <Td>{template.usage_count}x</Td>
                <Td>
                  {template.average_rating ? `${template.average_rating.toFixed(1)} star` : 'N/A'}
                </Td>
                <Td>
                  {template.approved ? (
                    <Chip $small $variant="success">Approved</Chip>
                  ) : (
                    <Chip $small $variant="warning">Pending</Chip>
                  )}
                </Td>
                <Td>
                  <StackRow $gap={4}>
                    {!template.approved && (
                      <IconBtn
                        $color="success"
                        onClick={() => approveTemplate(template.id)}
                        title="Approve template"
                      >
                        <CheckCircle size={18} />
                      </IconBtn>
                    )}
                    <IconBtn $color="primary" title="Edit template">
                      <Pencil size={18} />
                    </IconBtn>
                    <IconBtn
                      $color="error"
                      onClick={() => deleteTemplate(template.id)}
                      title="Delete template"
                    >
                      <Trash2 size={18} />
                    </IconBtn>
                  </StackRow>
                </Td>
              </Tr>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>

      {templates.length === 0 && !loading && (
        <AlertInfo>
          No workout templates yet. Create your first template to get started!
        </AlertInfo>
      )}
    </div>
  );

  // ========================================
  // TAB 2: EXERCISE LIBRARY
  // ========================================
  const renderExerciseLibrary = () => (
    <div>
      <SectionHeader>
        <SectionTitle>Exercise Library Manager</SectionTitle>
        <PrimaryButton onClick={() => setExerciseDialogOpen(true)}>
          <Plus size={16} />
          Add Exercise
        </PrimaryButton>
      </SectionHeader>

      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <Th>Exercise Name</Th>
              <Th>Type</Th>
              <Th>Body Part</Th>
              <Th>Equipment</Th>
              <Th>Phases</Th>
              <Th>Video</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {exercises.map((exercise) => (
              <Tr key={exercise.id}>
                <Td>{exercise.exercise_name}</Td>
                <Td>
                  <Chip $small>{exercise.exercise_type}</Chip>
                </Td>
                <Td>{exercise.primary_body_part}</Td>
                <Td>{exercise.primary_equipment}</Td>
                <Td>
                  <StackRow $gap={4} style={{ flexWrap: 'wrap' }}>
                    {exercise.opt_phases.map((phase) => (
                      <Chip key={phase} $small>P{phase}</Chip>
                    ))}
                  </StackRow>
                </Td>
                <Td>
                  {exercise.demo_video_url ? (
                    <CheckCircle size={18} color="#22c55e" />
                  ) : (
                    <XCircle size={18} color="#ef4444" />
                  )}
                </Td>
                <Td>
                  {exercise.approved ? (
                    <Chip $small $variant="success">Approved</Chip>
                  ) : (
                    <Chip $small $variant="warning">Pending</Chip>
                  )}
                </Td>
                <Td>
                  <StackRow $gap={4}>
                    {!exercise.approved && (
                      <IconBtn
                        $color="success"
                        onClick={() => approveExercise(exercise.id)}
                        title="Approve exercise"
                      >
                        <CheckCircle size={18} />
                      </IconBtn>
                    )}
                    <IconBtn $color="primary" title="Edit exercise">
                      <Pencil size={18} />
                    </IconBtn>
                    <IconBtn
                      $color="error"
                      onClick={() => deleteExercise(exercise.id)}
                      title="Delete exercise"
                    >
                      <Trash2 size={18} />
                    </IconBtn>
                  </StackRow>
                </Td>
              </Tr>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </div>
  );

  // ========================================
  // TAB 3: CERTIFICATION VERIFICATION
  // ========================================
  const renderCertificationVerification = () => (
    <div>
      <SectionHeader>
        <SectionTitle>Trainer Certification Verification</SectionTitle>
      </SectionHeader>

      <TableWrapper>
        <StyledTable>
          <THead>
            <tr>
              <Th>Trainer Name</Th>
              <Th>Certification</Th>
              <Th>Cert Number</Th>
              <Th>Issue Date</Th>
              <Th>Expiration</Th>
              <Th>Status</Th>
              <Th>Certificate</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <tbody>
            {certifications.map((cert) => (
              <Tr key={cert.id}>
                <Td>{cert.trainer_name}</Td>
                <Td>
                  <Chip $variant="primary">{cert.certification_type}</Chip>
                </Td>
                <Td>{cert.certification_number}</Td>
                <Td>{new Date(cert.issue_date).toLocaleDateString()}</Td>
                <Td>{new Date(cert.expiration_date).toLocaleDateString()}</Td>
                <Td>
                  <Chip $small $variant={getCertChipVariant(cert.status)}>{cert.status}</Chip>
                </Td>
                <Td>
                  {cert.certificate_url ? (
                    <SmallLinkButton href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                      View PDF
                    </SmallLinkButton>
                  ) : (
                    <CaptionText>N/A</CaptionText>
                  )}
                </Td>
                <Td>
                  {!cert.verified_at && cert.status === 'active' && (
                    <SmallButton
                      $variant="success"
                      onClick={() => verifyCertification(cert.id)}
                    >
                      Verify
                    </SmallButton>
                  )}
                  {cert.verified_at && (
                    <VerifiedText>Verified</VerifiedText>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </StyledTable>
      </TableWrapper>
    </div>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <PageContainer>
      <PageTitle>NASM Admin Dashboard</PageTitle>
      <PageSubtitle>Manage NASM templates, exercises, and trainer certifications</PageSubtitle>

      <TabBar>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          <BarChart3 size={18} />
          Compliance Dashboard
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          <Dumbbell size={18} />
          Template Builder
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          <Dumbbell size={18} />
          Exercise Library
        </TabButton>
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          <ShieldCheck size={18} />
          Certifications
        </TabButton>
      </TabBar>

      <div>
        {activeTab === 0 && renderComplianceDashboard()}
        {activeTab === 1 && renderTemplateBuilder()}
        {activeTab === 2 && renderExerciseLibrary()}
        {activeTab === 3 && renderCertificationVerification()}
      </div>
    </PageContainer>
  );
};

export default NASMAdminDashboard;
