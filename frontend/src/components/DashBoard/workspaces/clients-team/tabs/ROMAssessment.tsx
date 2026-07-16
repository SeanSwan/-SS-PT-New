/**
 * ┌─── SUB-COMPONENT: ROMAssessment ──────────────────────────┐
 * │ PARENT: BiometricsTabContent                                │
 * │ PURPOSE: Range of Motion goniometer tracking per joint      │
 * │ Props: { clientId, clientName }                             │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, memo } from 'react';
import { Ruler, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Btn,
  BtnRow,
  ClientNameAccent,
  Container,
  DateInput,
  DegreeInput,
  GroupHeader,
  Header,
  JointGroup,
  MovementLabel,
  MovementRow,
  NormalBadge,
  NotesArea,
  RomGridHeader,
  SideLabel,
  StatusMsg,
  Title,
  TitleIcon,
} from './ROMAssessment.styles';
import { getNumericClientId } from './clientTabId';

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
// ─────────────────────────────────────────────────────────────
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
  const numericClientId = getNumericClientId(clientId);
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
    setStatus(null);
    if (numericClientId === null) {
      setStatus({ type: 'error', msg: 'Select a valid client before saving ROM assessment' });
      return;
    }

    setSaving(true);

    try {
      // Build measurements object
      const measurements: Record<string, number | null> = {};
      for (const [key, sides] of Object.entries(values)) {
        if (sides.left) measurements[`${key}_left`] = parseInt(sides.left);
        if (sides.right) measurements[`${key}_right`] = parseInt(sides.right);
      }

      // Save via baseline measurements API (uses rangeOfMotion JSONB field)
      await authAxios.post('/api/admin/baseline-measurements', {
        userId: numericClientId,
        rangeOfMotion: { date: assessmentDate, measurements, notes },
      });

      setStatus({ type: 'success', msg: 'ROM assessment saved successfully' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to save ROM assessment' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, numericClientId, values, assessmentDate, notes]);

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
          <TitleIcon aria-hidden="true">
            <Ruler size={20} />
          </TitleIcon>
          Range of Motion Assessment
          {clientName && <ClientNameAccent>- {clientName}</ClientNameAccent>}
        </Title>
        <DateInput
          type="date"
          value={assessmentDate}
          onChange={e => setAssessmentDate(e.target.value)}
          aria-label="Assessment date"
        />
      </Header>

      <RomGridHeader aria-hidden="true">
        <div />
        <SideLabel>LEFT (°)</SideLabel>
        <SideLabel>RIGHT (°)</SideLabel>
        <SideLabel>Normal</SideLabel>
      </RomGridHeader>

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
        <Btn type="button" $variant="primary" onClick={handleSave} disabled={saving || filledCount === 0}>
          <Save size={16} />
          {saving ? 'Saving...' : `Save Assessment (${filledCount}/${totalMovements} measured)`}
        </Btn>
        <Btn type="button" onClick={handleReset}>
          <RotateCcw size={16} />
          Reset
        </Btn>
      </BtnRow>

      {status && <StatusMsg $type={status.type}>{status.msg}</StatusMsg>}
    </Container>
  );
};

export default memo(ROMAssessment);
