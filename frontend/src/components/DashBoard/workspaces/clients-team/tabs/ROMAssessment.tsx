/**
 * ┌─── SUB-COMPONENT: ROMAssessment ──────────────────────────┐
 * │ PARENT: BiometricsTabContent                                │
 * │ PURPOSE: Range of Motion goniometer tracking per joint      │
 * │ Props: { clientId, clientName }                             │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import styled from 'styled-components';
import { Ruler, Save, RotateCcw, HelpCircle } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: ROM Joint Definitions (NASM Standard)
// ─────────────────────────────────────────────────────────────
const ROM_JOINTS = [
  { group: 'Shoulder', movements: [
    { key: 'shoulder_flexion', label: 'Flexion', normal: 180 },
    { key: 'shoulder_extension', label: 'Extension', normal: 60 },
    { key: 'shoulder_abduction', label: 'Abduction', normal: 180 },
    { key: 'shoulder_internal_rotation', label: 'Internal Rotation', normal: 70 },
    { key: 'shoulder_external_rotation', label: 'External Rotation', normal: 90 },
  ]},
  { group: 'Hip', movements: [
    { key: 'hip_flexion', label: 'Flexion', normal: 120 },
    { key: 'hip_extension', label: 'Extension', normal: 20 },
    { key: 'hip_abduction', label: 'Abduction', normal: 45 },
    { key: 'hip_internal_rotation', label: 'Internal Rotation', normal: 40 },
    { key: 'hip_external_rotation', label: 'External Rotation', normal: 45 },
  ]},
  { group: 'Knee', movements: [
    { key: 'knee_flexion', label: 'Flexion', normal: 135 },
    { key: 'knee_extension', label: 'Extension', normal: 0 },
  ]},
  { group: 'Ankle', movements: [
    { key: 'ankle_dorsiflexion', label: 'Dorsiflexion', normal: 20 },
    { key: 'ankle_plantarflexion', label: 'Plantarflexion', normal: 50 },
  ]},
  { group: 'Cervical Spine', movements: [
    { key: 'cervical_flexion', label: 'Flexion', normal: 45 },
    { key: 'cervical_extension', label: 'Extension', normal: 45 },
    { key: 'cervical_lateral_flexion', label: 'Lateral Flexion', normal: 45 },
    { key: 'cervical_rotation', label: 'Rotation', normal: 80 },
  ]},
  { group: 'Lumbar Spine', movements: [
    { key: 'lumbar_flexion', label: 'Flexion', normal: 60 },
    { key: 'lumbar_extension', label: 'Extension', normal: 25 },
  ]},
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Container = styled.div`
  padding: 20px;
  max-width: 900px;

  @media (max-width: 768px) { padding: 12px; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DateInput = styled.input`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  min-height: 40px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }
`;

const JointGroup = styled.div`
  margin-bottom: 20px;
`;

const GroupHeader = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  padding: 8px 0 6px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin-bottom: 8px;
`;

const MovementRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr 1fr 60px;
  gap: 8px;
  align-items: center;
  padding: 6px 0;

  @media (max-width: 600px) {
    grid-template-columns: 120px 1fr 1fr 50px;
    gap: 4px;
  }
`;

const MovementLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const DegreeInput = styled.input<{ $status: 'normal' | 'limited' | 'severe' }>`
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${({ $status }) =>
    $status === 'normal' ? 'rgba(96, 192, 240, 0.15)'
    : $status === 'limited' ? 'rgba(198, 168, 75, 0.3)'
    : 'rgba(201, 42, 84, 0.3)'};
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  text-align: center;
  min-height: 40px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.25));
  }
`;

const NormalBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  text-align: center;
`;

const SideLabel = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
  text-align: center;
  padding-bottom: 2px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary' ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $variant }) =>
    $variant === 'primary' ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)' : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary' ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const NotesArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  resize: vertical;
  margin-top: 12px;

  &:focus { outline: none; border-color: var(--accent-primary, #60C0F0); }
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.3)); }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-top: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  background: ${({ $type }) => $type === 'success' ? 'rgba(96, 192, 240, 0.1)' : 'rgba(201, 42, 84, 0.1)'};
  color: ${({ $type }) => $type === 'success' ? '#60C0F0' : '#E0ECF4'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(96, 192, 240, 0.2)' : 'rgba(201, 42, 84, 0.3)'};
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
interface ROMAssessmentProps {
  clientId: number | string;
  clientName?: string;
}

type ROMValues = Record<string, { left: string; right: string }>;

const ROMAssessment: React.FC<ROMAssessmentProps> = ({ clientId, clientName }) => {
  const { authAxios } = useAuth() as any;
  const [values, setValues] = useState<ROMValues>({});
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleChange = useCallback((key: string, side: 'left' | 'right', value: string) => {
    const numericOnly = value.replace(/[^0-9]/g, '');
    setValues(prev => ({
      ...prev,
      [key]: { ...prev[key], [side]: numericOnly },
    }));
  }, []);

  const getStatus = (value: string, normal: number): 'normal' | 'limited' | 'severe' => {
    if (!value) return 'normal';
    const deg = parseInt(value);
    if (isNaN(deg)) return 'normal';
    const pct = deg / normal;
    if (pct >= 0.85) return 'normal';
    if (pct >= 0.6) return 'limited';
    return 'severe';
  };

  const handleSave = useCallback(async () => {
    if (!authAxios) return;
    setSaving(true);
    setStatus(null);

    try {
      // Build measurements object
      const measurements: Record<string, number | null> = {};
      for (const [key, sides] of Object.entries(values)) {
        if (sides.left) measurements[`${key}_left`] = parseInt(sides.left);
        if (sides.right) measurements[`${key}_right`] = parseInt(sides.right);
      }

      // Save via baseline measurements API (uses rangeOfMotion JSONB field)
      await authAxios.post('/api/admin/baseline-measurements', {
        userId: clientId,
        rangeOfMotion: { date: assessmentDate, measurements, notes },
      });

      setStatus({ type: 'success', msg: 'ROM assessment saved successfully' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to save ROM assessment' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, clientId, values, assessmentDate, notes]);

  const handleReset = useCallback(() => {
    setValues({});
    setNotes('');
    setStatus(null);
  }, []);

  const filledCount = Object.values(values).filter(v => v.left || v.right).length;
  const totalMovements = ROM_JOINTS.reduce((sum, g) => sum + g.movements.length, 0);

  return (
    <Container>
      <Header>
        <Title>
          <Ruler size={20} style={{ color: 'var(--accent-primary, #60C0F0)' }} />
          Range of Motion Assessment
          {clientName && <span style={{ fontWeight: 400, fontSize: 14, opacity: 0.6 }}>— {clientName}</span>}
        </Title>
        <DateInput
          type="date"
          value={assessmentDate}
          onChange={e => setAssessmentDate(e.target.value)}
          aria-label="Assessment date"
        />
      </Header>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 60px', gap: 8, marginBottom: 4 }}>
        <div />
        <SideLabel>LEFT (°)</SideLabel>
        <SideLabel>RIGHT (°)</SideLabel>
        <SideLabel>Normal</SideLabel>
      </div>

      {ROM_JOINTS.map(group => (
        <JointGroup key={group.group}>
          <GroupHeader>{group.group}</GroupHeader>
          {group.movements.map(m => (
            <MovementRow key={m.key}>
              <MovementLabel>{m.label}</MovementLabel>
              <DegreeInput
                type="text"
                inputMode="numeric"
                placeholder="—"
                value={values[m.key]?.left || ''}
                onChange={e => handleChange(m.key, 'left', e.target.value)}
                $status={getStatus(values[m.key]?.left, m.normal)}
                aria-label={`${m.label} left side degrees`}
              />
              <DegreeInput
                type="text"
                inputMode="numeric"
                placeholder="—"
                value={values[m.key]?.right || ''}
                onChange={e => handleChange(m.key, 'right', e.target.value)}
                $status={getStatus(values[m.key]?.right, m.normal)}
                aria-label={`${m.label} right side degrees`}
              />
              <NormalBadge>{m.normal}°</NormalBadge>
            </MovementRow>
          ))}
        </JointGroup>
      ))}

      <NotesArea
        placeholder="Assessment notes (tightness observed, pain, compensations)..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
        aria-label="ROM assessment notes"
      />

      <BtnRow>
        <Btn $variant="primary" onClick={handleSave} disabled={saving || filledCount === 0}>
          <Save size={16} />
          {saving ? 'Saving...' : `Save Assessment (${filledCount}/${totalMovements} measured)`}
        </Btn>
        <Btn onClick={handleReset}>
          <RotateCcw size={16} />
          Reset
        </Btn>
      </BtnRow>

      {status && <StatusMsg $type={status.type}>{status.msg}</StatusMsg>}
    </Container>
  );
};

export default memo(ROMAssessment);
