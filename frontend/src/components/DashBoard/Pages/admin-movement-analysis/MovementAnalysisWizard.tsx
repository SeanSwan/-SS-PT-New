/**
 * MovementAnalysisWizard.tsx
 * ==========================
 * 7-step NASM + Squat University Guided Movement Analysis wizard.
 * Touch-optimized for real-time use during training sessions.
 *
 * Steps: Client Info → PAR-Q+ → Postural → OHSA → Squat Uni → Movement Quality → Summary
 *
 * Phase 13 — Movement Analysis System
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, User, Heart, Eye, Ruler, Zap, CheckCircle,
  ChevronLeft, ChevronRight, Save, AlertTriangle, X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { device } from '../../../../styles/breakpoints';
import {
  type MovementAnalysisData, type CompensationLevel, type MobilityRating,
  type MovementRating, type SquatDepth, type ParqScreening,
  DEFAULT_FORM_DATA, PARQ_QUESTIONS, POSTURAL_COMMON_FINDINGS,
  SQUAT_COMPENSATIONS, MOVEMENT_COMPENSATIONS,
} from './movementAnalysis.types';

// ── Styled Components ─────────────────────────────────────────────

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  ${device.md} { padding: 24px; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  svg { color: ${({ theme }) => theme.colors?.accent || '#00FFFF'}; }
  ${device.md} { font-size: 24px; }
`;

const CloseBtn = styled.button`
  background: rgba(255,255,255,0.1);
  border: none;
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.2); }
`;

const ProgressBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
`;

const ProgressStep = styled.div<{ $active: boolean; $completed: boolean }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ $active, $completed, theme }) =>
    $active ? (theme.colors?.accent || '#00FFFF') :
    $completed ? (theme.colors?.accent || '#00FFFF') + '88' :
    'rgba(255,255,255,0.1)'};
  transition: background 0.3s;
`;

const StepLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 13px;
  color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.5)'};
  svg { color: ${({ theme }) => theme.colors?.accent || '#00FFFF'}; }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.background?.card || 'rgba(30, 41, 59, 0.6)'};
  border-radius: 16px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.1)'};
  margin-bottom: 20px;
  ${device.md} { padding: 24px; }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  ${device.sm} { grid-template-columns: 1fr 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.7)'};
  font-weight: 500;
`;

const Input = styled.input`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.2)'};
  background: rgba(0,0,0,0.3);
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 15px;
  min-height: 44px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  }
`;

const TextArea = styled.textarea`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.2)'};
  background: rgba(0,0,0,0.3);
  color: ${({ theme }) => theme.text?.primary || '#fff'};
  font-size: 15px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  }
`;

const SegmentedControl = styled.div`
  display: flex;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(0,255,255,0.2)'};
`;

const SegmentedButton = styled.button<{ $active: boolean; $variant?: string }>`
  flex: 1;
  padding: 10px 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  min-height: 44px;
  transition: all 0.2s;
  background: ${({ $active, $variant }) =>
    $active ?
      ($variant === 'significant' ? 'rgba(255,50,50,0.6)' :
       $variant === 'minor' ? 'rgba(255,184,51,0.6)' :
       $variant === 'pass' ? 'rgba(34,197,94,0.5)' :
       $variant === 'fail' ? 'rgba(255,50,50,0.5)' :
       'rgba(0,255,255,0.3)') :
    'rgba(0,0,0,0.2)'};
  color: ${({ $active }) => $active ? '#fff' : 'rgba(255,255,255,0.5)'};
  &:hover { background: ${({ $active }) => $active ? undefined : 'rgba(255,255,255,0.1)'}; }
`;

const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ $selected: boolean }>`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1px solid ${({ $selected, theme }) =>
    $selected ? (theme.colors?.accent || '#00FFFF') : 'rgba(255,255,255,0.15)'};
  background: ${({ $selected }) =>
    $selected ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.2)'};
  color: ${({ $selected }) => $selected ? '#fff' : 'rgba(255,255,255,0.6)'};
  font-size: 13px;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.colors?.accent || '#00FFFF'}; }
`;

const ToggleRow = styled.div<{ $flagged?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  background: ${({ $flagged }) => $flagged ? 'rgba(255,50,50,0.1)' : 'rgba(0,0,0,0.2)'};
  border: 1px solid ${({ $flagged }) => $flagged ? 'rgba(255,50,50,0.3)' : 'rgba(255,255,255,0.08)'};
  margin-bottom: 8px;
  min-height: 44px;
`;

const ToggleLabel = styled.span`
  font-size: 14px;
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
`;

const ToggleSwitch = styled.button<{ $on: boolean }>`
  width: 52px;
  height: 30px;
  border-radius: 15px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  background: ${({ $on }) => $on ? '#FF5555' : 'rgba(255,255,255,0.2)'};
  transition: background 0.2s;
  &::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    top: 3px;
    left: ${({ $on }) => $on ? '25px' : '3px'};
    transition: left 0.2s;
  }
`;

const NavFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
`;

const NavButton = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid ${({ $primary, theme }) => $primary ? 'transparent' : (theme.borders?.subtle || 'rgba(0,255,255,0.2)')};
  background: ${({ $primary, theme }) => $primary ? (theme.colors?.accent || '#00FFFF') : 'rgba(0,0,0,0.3)'};
  color: ${({ $primary }) => $primary ? '#000' : '#fff'};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ScoreDisplay = styled.div<{ $color: string }>`
  text-align: center;
  padding: 24px;
  border-radius: 16px;
  background: ${({ $color }) => `${$color}1A`};
  border: 2px solid ${({ $color }) => `${$color}44`};
  margin-bottom: 20px;
`;

const ScoreNumber = styled.div<{ $color: string }>`
  font-size: 48px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: 14px;
  color: rgba(255,255,255,0.6);
  margin-top: 8px;
`;

const AlertBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255,50,50,0.1);
  border: 1px solid rgba(255,50,50,0.3);
  margin-bottom: 16px;
  svg { color: #FF5555; flex-shrink: 0; margin-top: 2px; }
  font-size: 14px;
`;

const StrategyCard = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 12px;
`;

const StrategyTitle = styled.h4<{ $color: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ExerciseRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border: none; }
`;

const StatusMessage = styled.div`
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0,255,255,0.1);
  color: ${({ theme }) => theme.colors?.accent || '#00FFFF'};
  font-size: 14px;
  margin-bottom: 16px;
`;

// ── Steps Config ──────────────────────────────────────────────────

const STEPS = [
  { label: 'Client Info', icon: User },
  { label: 'PAR-Q+', icon: Heart },
  { label: 'Postural', icon: Eye },
  { label: 'OHSA', icon: Ruler },
  { label: 'Squat Uni', icon: Zap },
  { label: 'Movement', icon: Activity },
  { label: 'Summary', icon: CheckCircle },
];

// ── Component ─────────────────────────────────────────────────────

interface WizardProps {
  mode?: 'new' | 'edit' | 'view';
}

const MovementAnalysisWizard: React.FC<WizardProps> = ({ mode = 'new' }) => {
  const { id, clientId } = useParams<{ id?: string; clientId?: string }>();
  const navigate = useNavigate();
  const { authAxios } = useAuth() as any;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(id ? Number(id) : null);
  const [data, setData] = useState<MovementAnalysisData>({ ...DEFAULT_FORM_DATA });

  // Load existing analysis or client data
  useEffect(() => {
    if (id && authAxios) {
      authAxios.get(`/api/movement-analysis/${id}`).then((res: any) => {
        if (res.data?.success) setData(res.data.data);
      }).catch(() => {});
    } else if (clientId && authAxios) {
      authAxios.get(`/api/admin/clients/${clientId}`).then((res: any) => {
        const c = res.data?.data || res.data;
        if (c) {
          setData((d) => ({
            ...d,
            userId: c.id,
            fullName: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            email: c.email || '',
            phone: c.phone || '',
            dateOfBirth: c.dateOfBirth || '',
          }));
          setStep(1); // Skip to step 2 since client info is pre-filled
        }
      }).catch(() => {});
    }
  }, [id, clientId, authAxios]);

  const updateField = useCallback(<K extends keyof MovementAnalysisData>(key: K, value: MovementAnalysisData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  // Save (create or update)
  const save = useCallback(async (markComplete = false) => {
    if (!authAxios) return;
    setSaving(true);
    try {
      const payload = { ...data, status: markComplete ? 'completed' : data.status };
      if (savedId) {
        await authAxios.put(`/api/movement-analysis/${savedId}`, payload);
      } else {
        const res = await authAxios.post('/api/movement-analysis', payload);
        if (res.data?.data?.id) setSavedId(res.data.data.id);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [authAxios, data, savedId]);

  const nextStep = useCallback(async () => {
    if (step === 0 && !data.fullName) return;
    await save();
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step, save, data.fullName]);

  const prevStep = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const completeAssessment = useCallback(async () => {
    await save(true);
    navigate('/dashboard/people/movement-screen');
  }, [save, navigate]);

  // Calculate NASM score for display
  const nasmScore = useMemo(() => {
    if (!data.overheadSquatAssessment?.anteriorView || !data.overheadSquatAssessment?.lateralView) return null;
    const scoreMap: Record<string, number> = { none: 100, minor: 70, significant: 40 };
    const av = data.overheadSquatAssessment.anteriorView;
    const lv = data.overheadSquatAssessment.lateralView;
    const checks = [
      av.feetTurnout, av.feetFlattening, av.kneeValgus, av.kneeVarus,
      lv.excessiveForwardLean, lv.lowBackArch, lv.armsFallForward, lv.forwardHead,
      data.overheadSquatAssessment.asymmetricWeightShift,
    ];
    const scores = checks.map((c) => scoreMap[c] || 100);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [data.overheadSquatAssessment]);

  const scoreColor = nasmScore === null ? '#888' : nasmScore >= 80 ? '#33CC66' : nasmScore >= 60 ? '#FFB833' : '#FF3333';
  const StepIcon = STEPS[step].icon;

  // ── Render Steps ───────────────────────────────────────────────

  const renderStep1 = () => (
    <Card>
      <SectionTitle><User size={18} /> Client / Prospect Information</SectionTitle>
      <FormGrid>
        <FormGroup>
          <Label>Full Name *</Label>
          <Input value={data.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="John Smith" />
        </FormGroup>
        <FormGroup>
          <Label>Email</Label>
          <Input type="email" value={data.email} onChange={(e) => updateField('email', e.target.value)} placeholder="john@example.com" />
        </FormGroup>
        <FormGroup>
          <Label>Phone</Label>
          <Input type="tel" value={data.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(555) 123-4567" />
        </FormGroup>
        <FormGroup>
          <Label>Date of Birth</Label>
          <Input type="date" value={data.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
        </FormGroup>
        <FormGroup style={{ gridColumn: '1 / -1' }}>
          <Label>Address</Label>
          <Input value={data.address} onChange={(e) => updateField('address', e.target.value)} placeholder="123 Main St, City, State" />
        </FormGroup>
      </FormGrid>
    </Card>
  );

  const renderStep2 = () => {
    const parq: ParqScreening = data.parqScreening || {
      q1_heart_condition: false, q2_chest_pain: false, q3_balance_dizziness: false,
      q4_bone_joint_problem: false, q5_blood_pressure_meds: false,
      q6_medical_reason: false, q7_aware_of_other: false,
    };
    const anyYes = Object.values(parq).some(Boolean);

    return (
      <Card>
        <SectionTitle><Heart size={18} /> PAR-Q+ Health Screening</SectionTitle>
        {PARQ_QUESTIONS.map((q) => (
          <ToggleRow key={q.key} $flagged={parq[q.key]}>
            <ToggleLabel>{q.label}</ToggleLabel>
            <ToggleSwitch
              $on={parq[q.key]}
              onClick={() => {
                const updated = { ...parq, [q.key]: !parq[q.key] };
                updateField('parqScreening', updated);
                updateField('medicalClearanceRequired', Object.values(updated).some(Boolean));
              }}
            />
          </ToggleRow>
        ))}
        {anyYes && (
          <>
            <AlertBox>
              <AlertTriangle size={18} />
              <span>Medical clearance is required before training. One or more risk factors identified.</span>
            </AlertBox>
            <FormGrid>
              <FormGroup>
                <Label>Medical Clearance Date</Label>
                <Input type="date" value={data.medicalClearanceDate} onChange={(e) => updateField('medicalClearanceDate', e.target.value)} />
              </FormGroup>
              <FormGroup>
                <Label>Physician Name</Label>
                <Input value={data.medicalClearanceProvider} onChange={(e) => updateField('medicalClearanceProvider', e.target.value)} placeholder="Dr. Smith" />
              </FormGroup>
            </FormGrid>
          </>
        )}
      </Card>
    );
  };

  const renderStep3 = () => {
    const pa = data.posturalAssessment || { anteriorView: '', lateralView: '', posteriorView: '', commonFindings: [] };
    const updatePA = (field: string, value: any) => {
      updateField('posturalAssessment', { ...pa, [field]: value });
    };
    const toggleFinding = (f: string) => {
      const findings = pa.commonFindings || [];
      updatePA('commonFindings', findings.includes(f) ? findings.filter((x: string) => x !== f) : [...findings, f]);
    };

    return (
      <Card>
        <SectionTitle><Eye size={18} /> Static Postural Assessment</SectionTitle>
        <FormGroup style={{ marginBottom: 16 }}>
          <Label>Common Findings (tap to select)</Label>
          <ChipContainer>
            {POSTURAL_COMMON_FINDINGS.map((f) => (
              <Chip key={f} $selected={(pa.commonFindings || []).includes(f)} onClick={() => toggleFinding(f)}>{f}</Chip>
            ))}
          </ChipContainer>
        </FormGroup>
        <FormGrid>
          <FormGroup>
            <Label>Anterior View Observations</Label>
            <TextArea value={pa.anteriorView} onChange={(e) => updatePA('anteriorView', e.target.value)} placeholder="Front view observations..." />
          </FormGroup>
          <FormGroup>
            <Label>Lateral View Observations</Label>
            <TextArea value={pa.lateralView} onChange={(e) => updatePA('lateralView', e.target.value)} placeholder="Side view observations..." />
          </FormGroup>
          <FormGroup style={{ gridColumn: '1 / -1' }}>
            <Label>Posterior View Observations</Label>
            <TextArea value={pa.posteriorView} onChange={(e) => updatePA('posteriorView', e.target.value)} placeholder="Back view observations..." />
          </FormGroup>
        </FormGrid>
      </Card>
    );
  };

  const renderSegmented = (label: string, value: CompensationLevel, onChange: (v: CompensationLevel) => void) => (
    <FormGroup>
      <Label>{label}</Label>
      <SegmentedControl>
        {(['none', 'minor', 'significant'] as CompensationLevel[]).map((v) => (
          <SegmentedButton key={v} $active={value === v} $variant={v} onClick={() => onChange(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </SegmentedButton>
        ))}
      </SegmentedControl>
    </FormGroup>
  );

  const renderStep4 = () => {
    const ohsa = data.overheadSquatAssessment || {
      anteriorView: { feetTurnout: 'none' as CompensationLevel, feetFlattening: 'none' as CompensationLevel, kneeValgus: 'none' as CompensationLevel, kneeVarus: 'none' as CompensationLevel },
      lateralView: { excessiveForwardLean: 'none' as CompensationLevel, lowBackArch: 'none' as CompensationLevel, armsFallForward: 'none' as CompensationLevel, forwardHead: 'none' as CompensationLevel },
      asymmetricWeightShift: 'none' as CompensationLevel,
    };
    const updateOHSA = (view: string, field: string, value: CompensationLevel) => {
      if (view === 'root') {
        updateField('overheadSquatAssessment', { ...ohsa, [field]: value });
      } else {
        updateField('overheadSquatAssessment', {
          ...ohsa,
          [view]: { ...(ohsa as any)[view], [field]: value },
        });
      }
    };

    return (
      <>
        <Card>
          <SectionTitle><Ruler size={18} /> Anterior View (Front)</SectionTitle>
          <FormGrid>
            {renderSegmented('Feet Turn Out', ohsa.anteriorView.feetTurnout, (v) => updateOHSA('anteriorView', 'feetTurnout', v))}
            {renderSegmented('Feet Flatten', ohsa.anteriorView.feetFlattening, (v) => updateOHSA('anteriorView', 'feetFlattening', v))}
            {renderSegmented('Knee Valgus (Inward)', ohsa.anteriorView.kneeValgus, (v) => updateOHSA('anteriorView', 'kneeValgus', v))}
            {renderSegmented('Knee Varus (Outward)', ohsa.anteriorView.kneeVarus, (v) => updateOHSA('anteriorView', 'kneeVarus', v))}
          </FormGrid>
        </Card>
        <Card>
          <SectionTitle><Ruler size={18} /> Lateral View (Side)</SectionTitle>
          <FormGrid>
            {renderSegmented('Excessive Forward Lean', ohsa.lateralView.excessiveForwardLean, (v) => updateOHSA('lateralView', 'excessiveForwardLean', v))}
            {renderSegmented('Low Back Arch', ohsa.lateralView.lowBackArch, (v) => updateOHSA('lateralView', 'lowBackArch', v))}
            {renderSegmented('Arms Fall Forward', ohsa.lateralView.armsFallForward, (v) => updateOHSA('lateralView', 'armsFallForward', v))}
            {renderSegmented('Forward Head', ohsa.lateralView.forwardHead, (v) => updateOHSA('lateralView', 'forwardHead', v))}
          </FormGrid>
        </Card>
        <Card>
          {renderSegmented('Asymmetric Weight Shift', ohsa.asymmetricWeightShift, (v) => updateOHSA('root', 'asymmetricWeightShift', v))}
          {nasmScore !== null && (
            <ScoreDisplay $color={scoreColor} style={{ marginTop: 16 }}>
              <ScoreNumber $color={scoreColor}>{nasmScore}</ScoreNumber>
              <ScoreLabel>NASM Assessment Score</ScoreLabel>
            </ScoreDisplay>
          )}
        </Card>
      </>
    );
  };

  const renderMobilitySegmented = (label: string, value: MobilityRating, onChange: (v: MobilityRating) => void) => (
    <FormGroup>
      <Label>{label}</Label>
      <SegmentedControl>
        {(['adequate', 'limited', 'significant'] as MobilityRating[]).map((v) => (
          <SegmentedButton key={v} $active={value === v} $variant={v === 'significant' ? 'significant' : v === 'limited' ? 'minor' : undefined} onClick={() => onChange(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </SegmentedButton>
        ))}
      </SegmentedControl>
    </FormGroup>
  );

  const renderStep5 = () => {
    const su = data.squatUniversityAssessment || {
      ankleDorsiflexion: { left: { pass: true, degrees: 0 }, right: { pass: true, degrees: 0 } },
      hipMobility: {
        internalRotation: { left: 'adequate' as MobilityRating, right: 'adequate' as MobilityRating },
        externalRotation: { left: 'adequate' as MobilityRating, right: 'adequate' as MobilityRating },
        flexion: { left: 'adequate' as MobilityRating, right: 'adequate' as MobilityRating },
      },
      thoracicSpineMobility: { rotationLeft: 'adequate' as MobilityRating, rotationRight: 'adequate' as MobilityRating },
      deepSquat: { depthAchieved: 'parallel' as SquatDepth, compensations: [] as string[] },
      singleLegBalance: {
        left: { eyesOpen: 0, eyesClosed: 0 },
        right: { eyesOpen: 0, eyesClosed: 0 },
      },
    };
    const updateSU = (path: string, value: any) => {
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(su));
      let ref = updated;
      for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
      ref[parts[parts.length - 1]] = value;
      updateField('squatUniversityAssessment', updated);
    };

    return (
      <>
        <Card>
          <SectionTitle><Zap size={18} /> Ankle Dorsiflexion Test</SectionTitle>
          <FormGrid>
            <FormGroup>
              <Label>Left Ankle</Label>
              <SegmentedControl>
                <SegmentedButton $active={su.ankleDorsiflexion.left.pass} $variant="pass" onClick={() => updateSU('ankleDorsiflexion.left.pass', true)}>Pass</SegmentedButton>
                <SegmentedButton $active={!su.ankleDorsiflexion.left.pass} $variant="fail" onClick={() => updateSU('ankleDorsiflexion.left.pass', false)}>Fail</SegmentedButton>
              </SegmentedControl>
              <Input type="number" placeholder="Degrees" value={su.ankleDorsiflexion.left.degrees || ''} onChange={(e) => updateSU('ankleDorsiflexion.left.degrees', Number(e.target.value))} />
            </FormGroup>
            <FormGroup>
              <Label>Right Ankle</Label>
              <SegmentedControl>
                <SegmentedButton $active={su.ankleDorsiflexion.right.pass} $variant="pass" onClick={() => updateSU('ankleDorsiflexion.right.pass', true)}>Pass</SegmentedButton>
                <SegmentedButton $active={!su.ankleDorsiflexion.right.pass} $variant="fail" onClick={() => updateSU('ankleDorsiflexion.right.pass', false)}>Fail</SegmentedButton>
              </SegmentedControl>
              <Input type="number" placeholder="Degrees" value={su.ankleDorsiflexion.right.degrees || ''} onChange={(e) => updateSU('ankleDorsiflexion.right.degrees', Number(e.target.value))} />
            </FormGroup>
          </FormGrid>
        </Card>
        <Card>
          <SectionTitle><Zap size={18} /> Hip Mobility Screen</SectionTitle>
          <FormGrid>
            {renderMobilitySegmented('Internal Rotation (L)', su.hipMobility.internalRotation.left, (v) => updateSU('hipMobility.internalRotation.left', v))}
            {renderMobilitySegmented('Internal Rotation (R)', su.hipMobility.internalRotation.right, (v) => updateSU('hipMobility.internalRotation.right', v))}
            {renderMobilitySegmented('External Rotation (L)', su.hipMobility.externalRotation.left, (v) => updateSU('hipMobility.externalRotation.left', v))}
            {renderMobilitySegmented('External Rotation (R)', su.hipMobility.externalRotation.right, (v) => updateSU('hipMobility.externalRotation.right', v))}
            {renderMobilitySegmented('Flexion (L)', su.hipMobility.flexion.left, (v) => updateSU('hipMobility.flexion.left', v))}
            {renderMobilitySegmented('Flexion (R)', su.hipMobility.flexion.right, (v) => updateSU('hipMobility.flexion.right', v))}
          </FormGrid>
        </Card>
        <Card>
          <SectionTitle><Zap size={18} /> Thoracic Spine & Deep Squat</SectionTitle>
          <FormGrid>
            {renderMobilitySegmented('T-Spine Rotation (L)', su.thoracicSpineMobility.rotationLeft, (v) => updateSU('thoracicSpineMobility.rotationLeft', v))}
            {renderMobilitySegmented('T-Spine Rotation (R)', su.thoracicSpineMobility.rotationRight, (v) => updateSU('thoracicSpineMobility.rotationRight', v))}
          </FormGrid>
          <FormGroup style={{ marginTop: 16 }}>
            <Label>Deep Squat Depth</Label>
            <SegmentedControl>
              {(['full', 'parallel', 'above_parallel', 'quarter'] as SquatDepth[]).map((v) => (
                <SegmentedButton key={v} $active={su.deepSquat.depthAchieved === v} onClick={() => updateSU('deepSquat.depthAchieved', v)}>
                  {v.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SegmentedButton>
              ))}
            </SegmentedControl>
          </FormGroup>
          <FormGroup style={{ marginTop: 12 }}>
            <Label>Squat Compensations</Label>
            <ChipContainer>
              {SQUAT_COMPENSATIONS.map((c) => (
                <Chip key={c} $selected={(su.deepSquat.compensations || []).includes(c)} onClick={() => {
                  const comps = su.deepSquat.compensations || [];
                  updateSU('deepSquat.compensations', comps.includes(c) ? comps.filter((x: string) => x !== c) : [...comps, c]);
                }}>{c}</Chip>
              ))}
            </ChipContainer>
          </FormGroup>
        </Card>
        <Card>
          <SectionTitle><Zap size={18} /> Single-Leg Balance (seconds)</SectionTitle>
          <FormGrid>
            <FormGroup>
              <Label>Left — Eyes Open</Label>
              <Input type="number" value={su.singleLegBalance.left.eyesOpen || ''} onChange={(e) => updateSU('singleLegBalance.left.eyesOpen', Number(e.target.value))} placeholder="seconds" />
            </FormGroup>
            <FormGroup>
              <Label>Right — Eyes Open</Label>
              <Input type="number" value={su.singleLegBalance.right.eyesOpen || ''} onChange={(e) => updateSU('singleLegBalance.right.eyesOpen', Number(e.target.value))} placeholder="seconds" />
            </FormGroup>
            <FormGroup>
              <Label>Left — Eyes Closed</Label>
              <Input type="number" value={su.singleLegBalance.left.eyesClosed || ''} onChange={(e) => updateSU('singleLegBalance.left.eyesClosed', Number(e.target.value))} placeholder="seconds" />
            </FormGroup>
            <FormGroup>
              <Label>Right — Eyes Closed</Label>
              <Input type="number" value={su.singleLegBalance.right.eyesClosed || ''} onChange={(e) => updateSU('singleLegBalance.right.eyesClosed', Number(e.target.value))} placeholder="seconds" />
            </FormGroup>
          </FormGrid>
        </Card>
      </>
    );
  };

  const renderRatingSegmented = (label: string, value: MovementRating, onChange: (v: MovementRating) => void) => (
    <FormGroup>
      <Label>{label}</Label>
      <SegmentedControl>
        {(['excellent', 'good', 'fair', 'poor'] as MovementRating[]).map((v) => (
          <SegmentedButton key={v} $active={value === v} $variant={v === 'poor' ? 'significant' : v === 'fair' ? 'minor' : undefined} onClick={() => onChange(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </SegmentedButton>
        ))}
      </SegmentedControl>
    </FormGroup>
  );

  const renderStep6 = () => {
    const mq = data.movementQualityAssessments || {
      singleLegSquat: {
        left: { rating: 'good' as MovementRating, compensations: [] as string[] },
        right: { rating: 'good' as MovementRating, compensations: [] as string[] },
      },
      pushAssessment: { rating: 'good' as MovementRating, compensations: [] as string[] },
      pullAssessment: { rating: 'good' as MovementRating, compensations: [] as string[] },
      gaitAnalysis: { observations: '' },
    };
    const updateMQ = (path: string, value: any) => {
      const parts = path.split('.');
      const updated = JSON.parse(JSON.stringify(mq));
      let ref = updated;
      for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]];
      ref[parts[parts.length - 1]] = value;
      updateField('movementQualityAssessments', updated);
    };
    const toggleComp = (path: string, comp: string) => {
      const parts = path.split('.');
      const ref = parts.reduce((o: any, k: string) => o[k], mq);
      const comps = ref || [];
      updateMQ(path, comps.includes(comp) ? comps.filter((c: string) => c !== comp) : [...comps, comp]);
    };

    return (
      <>
        <Card>
          <SectionTitle><Activity size={18} /> Single-Leg Squat</SectionTitle>
          <FormGrid>
            {renderRatingSegmented('Left Leg', mq.singleLegSquat.left.rating, (v) => updateMQ('singleLegSquat.left.rating', v))}
            {renderRatingSegmented('Right Leg', mq.singleLegSquat.right.rating, (v) => updateMQ('singleLegSquat.right.rating', v))}
          </FormGrid>
          <FormGroup style={{ marginTop: 12 }}>
            <Label>Compensations Observed</Label>
            <ChipContainer>
              {MOVEMENT_COMPENSATIONS.map((c) => (
                <Chip key={c} $selected={[...(mq.singleLegSquat.left.compensations || []), ...(mq.singleLegSquat.right.compensations || [])].includes(c)}
                  onClick={() => toggleComp('singleLegSquat.left.compensations', c)}>{c}</Chip>
              ))}
            </ChipContainer>
          </FormGroup>
        </Card>
        <Card>
          <SectionTitle><Activity size={18} /> Push & Pull Assessment</SectionTitle>
          <FormGrid>
            {renderRatingSegmented('Push (Push-Up)', mq.pushAssessment.rating, (v) => updateMQ('pushAssessment.rating', v))}
            {renderRatingSegmented('Pull (Row)', mq.pullAssessment.rating, (v) => updateMQ('pullAssessment.rating', v))}
          </FormGrid>
        </Card>
        <Card>
          <SectionTitle><Activity size={18} /> Gait Analysis</SectionTitle>
          <FormGroup>
            <Label>Observations</Label>
            <TextArea value={mq.gaitAnalysis.observations} onChange={(e) => updateMQ('gaitAnalysis.observations', e.target.value)} placeholder="Walking/running gait observations..." />
          </FormGroup>
        </Card>
      </>
    );
  };

  const renderStep7 = () => {
    const strategy = data.correctiveExerciseStrategy;
    const opt = data.optPhaseRecommendation;

    return (
      <>
        {nasmScore !== null && (
          <ScoreDisplay $color={scoreColor}>
            <ScoreNumber $color={scoreColor}>{nasmScore}</ScoreNumber>
            <ScoreLabel>Overall NASM Movement Quality Score</ScoreLabel>
          </ScoreDisplay>
        )}

        {data.medicalClearanceRequired && (
          <AlertBox>
            <AlertTriangle size={18} />
            <span>Medical clearance required — PAR-Q+ flagged risk factors.</span>
          </AlertBox>
        )}

        {opt && (
          <Card>
            <SectionTitle><CheckCircle size={18} /> OPT Phase Recommendation</SectionTitle>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Phase {opt.phase}: {opt.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{opt.focus}</div>
            <FormGrid>
              <div><Label>Duration</Label><div>{opt.duration}</div></div>
              <div><Label>Rep Range</Label><div>{opt.repRange}</div></div>
              <div><Label>Tempo</Label><div>{opt.tempo}</div></div>
              <div><Label>Rest</Label><div>{opt.rest}</div></div>
            </FormGrid>
          </Card>
        )}

        {strategy && strategy.compensationsIdentified.length > 0 && (
          <Card>
            <SectionTitle>Corrective Exercise Strategy</SectionTitle>
            <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              Compensations: {strategy.compensationsIdentified.join(', ')}
            </div>
            {strategy.inhibit.length > 0 && (
              <StrategyCard>
                <StrategyTitle $color="#FF6B6B">1. Inhibit (Foam Roll)</StrategyTitle>
                {strategy.inhibit.map((e, i) => (
                  <ExerciseRow key={i}><span>{e.muscle} — {e.exercise}</span><span>{e.duration}, {e.sets} set</span></ExerciseRow>
                ))}
              </StrategyCard>
            )}
            {strategy.lengthen.length > 0 && (
              <StrategyCard>
                <StrategyTitle $color="#FFB833">2. Lengthen (Stretch)</StrategyTitle>
                {strategy.lengthen.map((e, i) => (
                  <ExerciseRow key={i}><span>{e.muscle} — {e.exercise}</span><span>{e.duration}, {e.sets} set</span></ExerciseRow>
                ))}
              </StrategyCard>
            )}
            {strategy.activate.length > 0 && (
              <StrategyCard>
                <StrategyTitle $color="#33CC66">3. Activate (Strengthen)</StrategyTitle>
                {strategy.activate.map((e, i) => (
                  <ExerciseRow key={i}><span>{e.muscle} — {e.exercise}</span><span>{e.reps} reps, {e.sets} sets</span></ExerciseRow>
                ))}
              </StrategyCard>
            )}
            {strategy.integrate.length > 0 && (
              <StrategyCard>
                <StrategyTitle $color="#00BFFF">4. Integrate (Functional)</StrategyTitle>
                {strategy.integrate.map((e, i) => (
                  <ExerciseRow key={i}><span>{e.exercise}</span><span>{e.reps} reps, {e.sets} sets</span></ExerciseRow>
                ))}
              </StrategyCard>
            )}
          </Card>
        )}

        <Card>
          <SectionTitle>Trainer Notes</SectionTitle>
          <TextArea
            value={data.trainerNotes}
            onChange={(e) => updateField('trainerNotes', e.target.value)}
            placeholder="Additional notes, recommendations, follow-up plan..."
            style={{ minHeight: 120 }}
          />
        </Card>
      </>
    );
  };

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

  return (
    <PageContainer>
      <Header>
        <Title><Activity size={22} /> Movement Analysis</Title>
        <CloseBtn onClick={() => navigate('/dashboard/people/movement-screen')}><X size={20} /></CloseBtn>
      </Header>

      <ProgressBar>
        {STEPS.map((_, i) => (
          <ProgressStep key={i} $active={i === step} $completed={i < step} />
        ))}
      </ProgressBar>

      <StepLabel>
        <StepIcon size={16} />
        Step {step + 1} of {STEPS.length} — {STEPS[step].label}
      </StepLabel>

      {savedId && <StatusMessage>Auto-saved as draft (#{savedId})</StatusMessage>}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {stepRenderers[step]()}
        </motion.div>
      </AnimatePresence>

      <NavFooter>
        <NavButton onClick={prevStep} disabled={step === 0}>
          <ChevronLeft size={18} /> Back
        </NavButton>
        {step < STEPS.length - 1 ? (
          <NavButton $primary onClick={nextStep} disabled={step === 0 && !data.fullName || saving}>
            {saving ? 'Saving...' : 'Next'} <ChevronRight size={18} />
          </NavButton>
        ) : (
          <NavButton $primary onClick={completeAssessment} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Complete Assessment'}
          </NavButton>
        )}
      </NavFooter>
    </PageContainer>
  );
};

export default MovementAnalysisWizard;
