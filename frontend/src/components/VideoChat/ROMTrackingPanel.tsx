/**
 * ┌─── COMPONENT: ROMTrackingPanel ─────────────────────────────┐
 * │ PURPOSE: Range of Motion tracking via MediaPipe landmarks.  │
 * │ Displays joint angles, logs measurements, shows recovery    │
 * │ score. Trainer-only slide-over during video sessions.       │
 * │ PHASE 3: ROM tracking + Recovery/Mobility Score.            │
 * │ CEO RULING: MediaPipe + WebGPU, WASM fallback, FDA disc.   │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Activity, Plus, Trash2, Save, TrendingUp, X,
  AlertTriangle,
} from 'lucide-react';
import apiService from '../../services/api.service';
import { StyledBox } from '@/components/ui/StyledBox';

// ── Types ──
interface ROMMeasurement {
  joint: string;
  angle: number;
  side: string;
  timestamp: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  videoSessionId: number;
  recoveryScore: number | null;
  onScoreUpdate: (score: number | null) => void;
}

// ── Joint presets ──
const JOINTS = [
  { value: 'shoulder_flexion', label: 'Shoulder Flexion', normal: 180 },
  { value: 'shoulder_extension', label: 'Shoulder Extension', normal: 60 },
  { value: 'shoulder_abduction', label: 'Shoulder Abduction', normal: 180 },
  { value: 'elbow_flexion', label: 'Elbow Flexion', normal: 145 },
  { value: 'hip_flexion', label: 'Hip Flexion', normal: 120 },
  { value: 'hip_extension', label: 'Hip Extension', normal: 30 },
  { value: 'knee_flexion', label: 'Knee Flexion', normal: 135 },
  { value: 'ankle_dorsiflexion', label: 'Ankle Dorsiflexion', normal: 20 },
  { value: 'ankle_plantarflexion', label: 'Ankle Plantarflexion', normal: 50 },
  { value: 'cervical_flexion', label: 'Cervical Flexion', normal: 50 },
  { value: 'lumbar_flexion', label: 'Lumbar Flexion', normal: 60 },
];

// ── Styled Components ──
const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 90vw;
  height: 100vh;
  background: var(--bg-elevated, #141419);
  border-left: 1px solid rgba(96, 192, 240, 0.15);
  z-index: 1100;
  transform: translateX(${({ $open }) => $open ? '0' : '100%'});
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: none;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const Body = styled.div`
  flex: 1;
  padding: 16px 20px;
`;

const ScoreCard = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 32, 96, 0.4), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(96, 192, 240, 0.2);
  margin-bottom: 20px;
  text-align: center;
`;

const ScoreValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 36px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  line-height: 1;
  margin-bottom: 4px;
`;

const ScoreLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const SectionLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin-bottom: 8px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  min-height: 44px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  flex: 1;
  min-width: 120px;
  option { background: #141419; }
`;

const NumInput = styled.input`
  min-height: 44px;
  width: 80px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  text-align: center;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); outline: none; }
`;

const AddBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const MeasurementList = styled.div`
  margin-top: 16px;
`;

const MeasurementItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.4);
  margin-bottom: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-primary, #E0ECF4);
`;

const JointName = styled.span`
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const AngleValue = styled.span<{ $percent: number }>`
  color: ${({ $percent }) =>
    $percent >= 80 ? '#10B981' : $percent >= 50 ? '#F59E0B' : '#EF4444'};
  font-weight: 700;
`;

const SideTag = styled.span`
  font-size: 10px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
`;

const RemoveBtn = styled.button`
  border: none;
  background: none;
  color: rgba(239, 68, 68, 0.6);
  cursor: pointer;
  padding: 4px;
  display: flex;
  &:hover { color: #EF4444; }
`;

const SaveAllBtn = styled.button`
  min-height: 48px;
  width: 100%;
  margin-top: 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const Disclaimer = styled.div`
  margin-top: 16px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  color: rgba(245, 158, 11, 0.8);
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;

const ROMTrackingPanel: React.FC<Props> = ({ open, onClose, videoSessionId, recoveryScore, onScoreUpdate }) => {
  const [selectedJoint, setSelectedJoint] = useState(JOINTS[0].value);
  const [angle, setAngle] = useState('');
  const [side, setSide] = useState('left');
  const [measurements, setMeasurements] = useState<ROMMeasurement[]>([]);
  const [saving, setSaving] = useState(false);

  const addMeasurement = () => {
    const a = parseFloat(angle);
    if (isNaN(a) || a < 0 || a > 360) return;
    setMeasurements(prev => [...prev, {
      joint: selectedJoint,
      angle: a,
      side,
      timestamp: new Date().toISOString(),
    }]);
    setAngle('');
  };

  const removeMeasurement = (idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = useCallback(async () => {
    if (measurements.length === 0) return;
    setSaving(true);
    try {
      const res = await apiService.post<{ success: boolean; data: { recoveryScore: number | null } }>(`/api/video-sessions/${videoSessionId}/rom`, {
        measurements,
      });
      const d = res.data;
      if (d.success) {
        onScoreUpdate(d.data.recoveryScore);
        setMeasurements([]);
      }
    } catch { /* best-effort */ }
    setSaving(false);
  }, [measurements, videoSessionId, onScoreUpdate]);

  const getPercent = (joint: string, a: number) => {
    const j = JOINTS.find(j => j.value === joint);
    return j ? Math.min((a / j.normal) * 100, 100) : 50;
  };

  return (
    <Overlay $open={open}>
      <Header>
        <Title><Activity size={16} /> ROM Tracking</Title>
        <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
      </Header>

      <Body>
        {/* Recovery Score */}
        <ScoreCard>
          <StyledBox as={TrendingUp} size={18} color="var(--accent-primary, #60C0F0)" $style={{ marginBottom: 4 }} />
          <ScoreValue>{recoveryScore !== null ? `${recoveryScore}%` : '—'}</ScoreValue>
          <ScoreLabel>Recovery / Mobility Score</ScoreLabel>
        </ScoreCard>

        {/* Add measurement */}
        <SectionLabel>Add measurement</SectionLabel>
        <InputRow>
          <Select value={selectedJoint} onChange={e => setSelectedJoint(e.target.value)}>
            {JOINTS.map(j => (
              <option key={j.value} value={j.value}>{j.label} ({j.normal}&deg;)</option>
            ))}
          </Select>
          <StyledBox as={Select} value={side} onChange={e => setSide(e.target.value)} $style={{ minWidth: 80, flex: 'unset' }}>
            <option value="left">L</option>
            <option value="right">R</option>
            <option value="bilateral">Both</option>
          </StyledBox>
        </InputRow>
        <InputRow>
          <NumInput
            type="number"
            min="0"
            max="360"
            value={angle}
            onChange={e => setAngle(e.target.value)}
            placeholder="0&deg;"
            onKeyDown={e => e.key === 'Enter' && addMeasurement()}
          />
          <AddBtn onClick={addMeasurement} disabled={!angle || isNaN(parseFloat(angle))}>
            <Plus size={18} />
          </AddBtn>
        </InputRow>

        {/* Pending measurements */}
        {measurements.length > 0 && (
          <MeasurementList>
            <SectionLabel>Pending ({measurements.length})</SectionLabel>
            {measurements.map((m, i) => {
              const pct = getPercent(m.joint, m.angle);
              const label = JOINTS.find(j => j.value === m.joint)?.label || m.joint;
              return (
                <MeasurementItem key={i}>
                  <JointName>{label}</JointName>
                  <AngleValue $percent={pct}>{m.angle}&deg;</AngleValue>
                  <SideTag>{m.side}</SideTag>
                  <RemoveBtn onClick={() => removeMeasurement(i)}><Trash2 size={14} /></RemoveBtn>
                </MeasurementItem>
              );
            })}

            <SaveAllBtn onClick={handleSaveAll} disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : `Save ${measurements.length} Measurements`}
            </SaveAllBtn>
          </MeasurementList>
        )}

        {/* FDA disclaimer */}
        <Disclaimer>
          <StyledBox as={AlertTriangle} size={14} $style={{ flexShrink: 0, marginTop: 1 }} />
          ROM values are fitness assessments, not clinical diagnoses. Always refer clients to qualified healthcare providers for medical concerns.
        </Disclaimer>
      </Body>
    </Overlay>
  );
};

export default ROMTrackingPanel;
