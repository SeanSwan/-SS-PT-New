/**
 * BiomechanicsStudio — Custom Exercise Builder
 * ==============================================
 * Phase 6d: 4-step accordion wizard for trainers to define custom
 * exercise analysis rules with live MediaPipe preview.
 *
 * Steps:
 *  1. Metadata (name, category, base exercise)
 *  2. Rep Mechanics (primary angle, rep detection thresholds)
 *  3. Form Rules (angle_threshold, landmark_deviation, bilateral_symmetry)
 *  4. Review + Validate (schema summary, validation result, save)
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomExerciseAPI } from '../../hooks/useCustomExerciseAPI';
import type {
  MechanicsSchema,
  FormRule,
  AngleThresholdRule,
  LandmarkDeviationRule,
  BilateralSymmetryRule,
  ValidationResult,
  ExerciseTemplate,
  CustomExercise,
} from '../../hooks/useCustomExerciseAPI';
import { LANDMARK } from './constants';

// --- Landmark name map for UI ---
const LANDMARK_NAMES: Record<number, string> = {
  0: 'Nose', 1: 'L Eye Inner', 2: 'L Eye', 3: 'L Eye Outer',
  4: 'R Eye Inner', 5: 'R Eye', 6: 'R Eye Outer', 7: 'L Ear', 8: 'R Ear',
  9: 'Mouth L', 10: 'Mouth R', 11: 'L Shoulder', 12: 'R Shoulder',
  13: 'L Elbow', 14: 'R Elbow', 15: 'L Wrist', 16: 'R Wrist',
  17: 'L Pinky', 18: 'R Pinky', 19: 'L Index', 20: 'R Index',
  21: 'L Thumb', 22: 'R Thumb', 23: 'L Hip', 24: 'R Hip',
  25: 'L Knee', 26: 'R Knee', 27: 'L Ankle', 28: 'R Ankle',
  29: 'L Heel', 30: 'R Heel', 31: 'L Foot', 32: 'R Foot',
};

const CATEGORIES = [
  'lower_body', 'upper_body', 'compound', 'core', 'mobility', 'plyometric', 'general',
];

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
  padding: 24px;
`;

const PageHeader = styled.div`
  max-width: 900px;
  margin: 0 auto 24px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 800;
  color: #e0ecf4;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
`;

const WizardContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const StepCard = styled(motion.div)<{ $active: boolean }>`
  background: rgba(0, 32, 96, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.4)' : 'rgba(96, 192, 240, 0.1)')};
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.3s;
`;

const StepHeader = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: transparent;
  border: none;
  color: #e0ecf4;
  cursor: pointer;
  text-align: left;
  min-height: 56px;
`;

const StepNumber = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({ $active, $completed }) =>
    $completed ? '#00FF88' : $active ? '#60C0F0' : 'rgba(96, 192, 240, 0.2)'};
  color: ${({ $active, $completed }) =>
    $completed || $active ? '#001040' : 'rgba(224, 236, 244, 0.75)'};
  transition: all 0.3s;
`;

const StepTitle = styled.div`
  flex: 1;
  font-size: 15px;
  font-weight: 600;
`;

const StepBody = styled(motion.div)`
  padding: 0 20px 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.8);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(96, 192, 240, 0.5);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.5);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  outline: none;
  resize: vertical;
  min-height: 60px;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(96, 192, 240, 0.5);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  option {
    background: #001040;
    color: #e0ecf4;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const Column = styled.div<{ $flex?: number }>`
  flex: ${({ $flex }) => $flex ?? 1};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s;

  background: ${({ $variant }) =>
    $variant === 'danger'
      ? 'rgba(255, 71, 87, 0.2)'
      : $variant === 'secondary'
        ? 'rgba(96, 192, 240, 0.15)'
        : 'linear-gradient(135deg, #60C0F0 0%, #7851A9 100%)'};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#FF4757' : $variant === 'secondary' ? '#60C0F0' : '#FFFFFF'};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'danger'
        ? 'rgba(255, 71, 87, 0.3)'
        : $variant === 'secondary'
          ? 'rgba(96, 192, 240, 0.2)'
          : 'transparent'};

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const RuleCard = styled.div`
  background: rgba(0, 16, 64, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 10px;
`;

const RuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const RuleTypeBadge = styled.span<{ $type: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $type }) =>
    $type === 'angle_threshold'
      ? 'rgba(96, 192, 240, 0.2)'
      : $type === 'landmark_deviation'
        ? 'rgba(120, 81, 169, 0.3)'
        : 'rgba(0, 255, 136, 0.2)'};
  color: ${({ $type }) =>
    $type === 'angle_threshold'
      ? '#60C0F0'
      : $type === 'landmark_deviation'
        ? '#B088E0'
        : '#00FF88'};
`;

const SeverityBadge = styled.span<{ $severity: string }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  background: ${({ $severity }) =>
    $severity === 'danger'
      ? 'rgba(255, 71, 87, 0.2)'
      : $severity === 'warning'
        ? 'rgba(255, 184, 0, 0.2)'
        : 'rgba(96, 192, 240, 0.2)'};
  color: ${({ $severity }) =>
    $severity === 'danger' ? '#FF4757' : $severity === 'warning' ? '#FFB800' : '#60C0F0'};
`;

const ValidationBox = styled.div<{ $valid: boolean }>`
  background: ${({ $valid }) =>
    $valid ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 71, 87, 0.08)'};
  border: 1px solid ${({ $valid }) =>
    $valid ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'};
  border-radius: 8px;
  padding: 14px;
  margin-top: 12px;
`;

const ValidationTitle = styled.div<{ $valid: boolean }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $valid }) => ($valid ? '#00FF88' : '#FF4757')};
  margin-bottom: 8px;
`;

const ValidationItem = styled.div<{ $type: 'error' | 'warning' }>`
  font-size: 13px;
  color: ${({ $type }) => ($type === 'error' ? '#FF4757' : '#FFB800')};
  padding: 2px 0;

  &::before {
    content: '${({ $type }) => ($type === 'error' ? 'x' : '!')}';
    display: inline-block;
    width: 16px;
    font-weight: 700;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

const SummaryStat = styled.div`
  background: rgba(0, 16, 64, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #60c0f0;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.7);
  text-transform: uppercase;
  margin-top: 4px;
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
`;

const TemplateCard = styled.button`
  background: rgba(0, 16, 64, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 14px;
  text-align: left;
  color: #e0ecf4;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;

  &:hover {
    border-color: rgba(96, 192, 240, 0.4);
    background: rgba(0, 16, 64, 0.6);
  }
`;

const TemplateName = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const TemplateInfo = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.7);
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 32px;
  color: rgba(224, 236, 244, 0.65);
  font-size: 14px;
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 71, 87, 0.1)'};
  color: ${({ $type }) => ($type === 'success' ? '#00FF88' : '#FF4757')};
  border: 1px solid ${({ $type }) =>
    $type === 'success' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)'};
`;

// --- Helper: create empty rule by type ---

function emptyRule(type: FormRule['type']): FormRule {
  if (type === 'angle_threshold') {
    return {
      type: 'angle_threshold',
      name: '',
      landmarks: [23, 25, 27],
      min: 80,
      max: 170,
      severity: 'warning',
      cue: '',
    };
  }
  if (type === 'landmark_deviation') {
    return {
      type: 'landmark_deviation',
      name: '',
      landmarkA: 11,
      landmarkB: 12,
      axis: 'y',
      maxDeviation: 0.05,
      severity: 'warning',
      cue: '',
    };
  }
  return {
    type: 'bilateral_symmetry',
    name: '',
    leftJoint: '',
    rightJoint: '',
    leftLandmarks: [23, 25, 27],
    rightLandmarks: [24, 26, 28],
    maxDiff: 15,
    severity: 'info',
    cue: '',
  };
}

// --- Step Components ---

interface StepProps {
  schema: MechanicsSchema;
  setSchema: React.Dispatch<React.SetStateAction<MechanicsSchema>>;
}

interface MetadataProps {
  name: string;
  setName: (n: string) => void;
  category: string;
  setCategory: (c: string) => void;
  description: string;
  setDescription: (d: string) => void;
  templates: ExerciseTemplate[];
  onTemplateSelect: (key: string) => void;
  loadingTemplates: boolean;
}

const MetadataStep: React.FC<MetadataProps> = ({
  name, setName, category, setCategory, description, setDescription,
  templates, onTemplateSelect, loadingTemplates,
}) => (
  <>
    <FormGroup>
      <Label>Exercise Name *</Label>
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g., Bulgarian Split Squat"
      />
    </FormGroup>
    <Row>
      <Column>
        <FormGroup>
          <Label>Category</Label>
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </FormGroup>
      </Column>
    </Row>
    <FormGroup>
      <Label>Description (optional)</Label>
      <TextArea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Notes for yourself or other trainers..."
      />
    </FormGroup>
    <FormGroup>
      <Label>Start from Template</Label>
      {loadingTemplates ? (
        <EmptyMessage>Loading templates...</EmptyMessage>
      ) : (
        <TemplateGrid>
          {templates.map(t => (
            <TemplateCard key={t.key} onClick={() => onTemplateSelect(t.key)}>
              <TemplateName>{t.name}</TemplateName>
              <TemplateInfo>
                {t.category.replace(/_/g, ' ')} | {t.ruleCount} rules
              </TemplateInfo>
            </TemplateCard>
          ))}
        </TemplateGrid>
      )}
    </FormGroup>
  </>
);

const RepMechanicsStep: React.FC<StepProps> = ({ schema, setSchema }) => {
  const pa = schema.primaryAngle;

  const updatePrimary = (field: string, value: any) => {
    setSchema(prev => ({
      ...prev,
      primaryAngle: {
        joint: prev.primaryAngle?.joint || '',
        landmarks: prev.primaryAngle?.landmarks || [23, 25, 27],
        repPhases: prev.primaryAngle?.repPhases || { startAngle: 170, bottomAngle: 90 },
        ...prev.primaryAngle,
        [field]: value,
      },
    }));
  };

  const updateRepPhase = (field: string, value: number) => {
    setSchema(prev => ({
      ...prev,
      primaryAngle: {
        ...prev.primaryAngle!,
        repPhases: {
          ...prev.primaryAngle!.repPhases,
          [field]: value,
        },
      },
    }));
  };

  const setLandmark = (idx: 0 | 1 | 2, value: number) => {
    setSchema(prev => {
      const lm = [...(prev.primaryAngle?.landmarks || [23, 25, 27])] as [number, number, number];
      lm[idx] = value;
      return {
        ...prev,
        primaryAngle: { ...prev.primaryAngle!, landmarks: lm },
      };
    });
  };

  return (
    <>
      <FormGroup>
        <Label>Joint Name (for display)</Label>
        <Input
          value={pa?.joint || ''}
          onChange={e => updatePrimary('joint', e.target.value)}
          placeholder="e.g., left_knee"
        />
      </FormGroup>
      <FormGroup>
        <Label>Tracking Landmarks (3 points: A - Vertex - C)</Label>
        <Row>
          {[0, 1, 2].map(i => (
            <Column key={i}>
              <Select
                value={pa?.landmarks?.[i] ?? [23, 25, 27][i]}
                onChange={e => setLandmark(i as 0 | 1 | 2, parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 33 }, (_, idx) => (
                  <option key={idx} value={idx}>
                    {idx}: {LANDMARK_NAMES[idx]}
                  </option>
                ))}
              </Select>
            </Column>
          ))}
        </Row>
      </FormGroup>
      <Row>
        <Column>
          <FormGroup>
            <Label>Start Angle (top of rep)</Label>
            <Input
              type="number"
              value={pa?.repPhases?.startAngle ?? 170}
              onChange={e => updateRepPhase('startAngle', parseFloat(e.target.value))}
            />
          </FormGroup>
        </Column>
        <Column>
          <FormGroup>
            <Label>Bottom Angle (bottom of rep)</Label>
            <Input
              type="number"
              value={pa?.repPhases?.bottomAngle ?? 90}
              onChange={e => updateRepPhase('bottomAngle', parseFloat(e.target.value))}
            />
          </FormGroup>
        </Column>
        <Column>
          <FormGroup>
            <Label>Hysteresis</Label>
            <Input
              type="number"
              value={pa?.repPhases?.hysteresis ?? 10}
              onChange={e => updateRepPhase('hysteresis', parseFloat(e.target.value))}
            />
          </FormGroup>
        </Column>
      </Row>
    </>
  );
};

const FormRulesStep: React.FC<StepProps> = ({ schema, setSchema }) => {
  const [addType, setAddType] = useState<FormRule['type']>('angle_threshold');

  const addRule = () => {
    setSchema(prev => ({
      ...prev,
      formRules: [...prev.formRules, emptyRule(addType)],
    }));
  };

  const removeRule = (idx: number) => {
    setSchema(prev => ({
      ...prev,
      formRules: prev.formRules.filter((_, i) => i !== idx),
    }));
  };

  const updateRule = (idx: number, updates: Partial<FormRule>) => {
    setSchema(prev => ({
      ...prev,
      formRules: prev.formRules.map((r, i) => (i === idx ? { ...r, ...updates } as FormRule : r)),
    }));
  };

  const updateRuleLandmark = (ruleIdx: number, lmIdx: 0 | 1 | 2, value: number, field: string = 'landmarks') => {
    setSchema(prev => ({
      ...prev,
      formRules: prev.formRules.map((r, i) => {
        if (i !== ruleIdx) return r;
        const arr = [...((r as any)[field] || [23, 25, 27])] as [number, number, number];
        arr[lmIdx] = value;
        return { ...r, [field]: arr } as FormRule;
      }),
    }));
  };

  return (
    <>
      {schema.formRules.length === 0 && (
        <EmptyMessage>No form rules yet. Add one below.</EmptyMessage>
      )}

      {schema.formRules.map((rule, idx) => (
        <RuleCard key={idx}>
          <RuleHeader>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <RuleTypeBadge $type={rule.type}>
                {rule.type === 'angle_threshold'
                  ? 'Angle'
                  : rule.type === 'landmark_deviation'
                    ? 'Deviation'
                    : 'Symmetry'}
              </RuleTypeBadge>
              <SeverityBadge $severity={rule.severity}>{rule.severity}</SeverityBadge>
            </div>
            <Button $variant="danger" onClick={() => removeRule(idx)} style={{ padding: '4px 10px', minHeight: 'auto', fontSize: 12 }}>
              Remove
            </Button>
          </RuleHeader>

          <Row>
            <Column $flex={2}>
              <FormGroup>
                <Label>Rule Name</Label>
                <Input
                  value={rule.name}
                  onChange={e => updateRule(idx, { name: e.target.value })}
                  placeholder="e.g., Knee Depth Check"
                />
              </FormGroup>
            </Column>
            <Column>
              <FormGroup>
                <Label>Severity</Label>
                <Select
                  value={rule.severity}
                  onChange={e => updateRule(idx, { severity: e.target.value as any })}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </Select>
              </FormGroup>
            </Column>
          </Row>

          {/* Type-specific fields */}
          {rule.type === 'angle_threshold' && (
            <>
              <FormGroup>
                <Label>Landmarks (A - Vertex - C)</Label>
                <Row>
                  {[0, 1, 2].map(i => (
                    <Column key={i}>
                      <Select
                        value={(rule as AngleThresholdRule).landmarks[i]}
                        onChange={e =>
                          updateRuleLandmark(idx, i as 0 | 1 | 2, parseInt(e.target.value, 10))
                        }
                      >
                        {Array.from({ length: 33 }, (_, li) => (
                          <option key={li} value={li}>
                            {li}: {LANDMARK_NAMES[li]}
                          </option>
                        ))}
                      </Select>
                    </Column>
                  ))}
                </Row>
              </FormGroup>
              <Row>
                <Column>
                  <FormGroup>
                    <Label>Min Angle</Label>
                    <Input
                      type="number"
                      value={(rule as AngleThresholdRule).min}
                      onChange={e => updateRule(idx, { min: parseFloat(e.target.value) } as any)}
                    />
                  </FormGroup>
                </Column>
                <Column>
                  <FormGroup>
                    <Label>Max Angle</Label>
                    <Input
                      type="number"
                      value={(rule as AngleThresholdRule).max}
                      onChange={e => updateRule(idx, { max: parseFloat(e.target.value) } as any)}
                    />
                  </FormGroup>
                </Column>
              </Row>
            </>
          )}

          {rule.type === 'landmark_deviation' && (
            <Row>
              <Column>
                <FormGroup>
                  <Label>Landmark A</Label>
                  <Select
                    value={(rule as LandmarkDeviationRule).landmarkA}
                    onChange={e => updateRule(idx, { landmarkA: parseInt(e.target.value, 10) } as any)}
                  >
                    {Array.from({ length: 33 }, (_, li) => (
                      <option key={li} value={li}>{li}: {LANDMARK_NAMES[li]}</option>
                    ))}
                  </Select>
                </FormGroup>
              </Column>
              <Column>
                <FormGroup>
                  <Label>Landmark B</Label>
                  <Select
                    value={(rule as LandmarkDeviationRule).landmarkB}
                    onChange={e => updateRule(idx, { landmarkB: parseInt(e.target.value, 10) } as any)}
                  >
                    {Array.from({ length: 33 }, (_, li) => (
                      <option key={li} value={li}>{li}: {LANDMARK_NAMES[li]}</option>
                    ))}
                  </Select>
                </FormGroup>
              </Column>
              <Column>
                <FormGroup>
                  <Label>Axis</Label>
                  <Select
                    value={(rule as LandmarkDeviationRule).axis}
                    onChange={e => updateRule(idx, { axis: e.target.value } as any)}
                  >
                    <option value="x">X (horizontal)</option>
                    <option value="y">Y (vertical)</option>
                    <option value="z">Z (depth)</option>
                  </Select>
                </FormGroup>
              </Column>
              <Column>
                <FormGroup>
                  <Label>Max Deviation</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(rule as LandmarkDeviationRule).maxDeviation}
                    onChange={e => updateRule(idx, { maxDeviation: parseFloat(e.target.value) } as any)}
                  />
                </FormGroup>
              </Column>
            </Row>
          )}

          {rule.type === 'bilateral_symmetry' && (
            <>
              <Row>
                <Column>
                  <FormGroup>
                    <Label>Left Landmarks (A-V-C)</Label>
                    <Row>
                      {[0, 1, 2].map(i => (
                        <Column key={i}>
                          <Select
                            value={(rule as BilateralSymmetryRule).leftLandmarks[i]}
                            onChange={e =>
                              updateRuleLandmark(idx, i as 0 | 1 | 2, parseInt(e.target.value, 10), 'leftLandmarks')
                            }
                          >
                            {Array.from({ length: 33 }, (_, li) => (
                              <option key={li} value={li}>{li}: {LANDMARK_NAMES[li]}</option>
                            ))}
                          </Select>
                        </Column>
                      ))}
                    </Row>
                  </FormGroup>
                </Column>
              </Row>
              <Row>
                <Column>
                  <FormGroup>
                    <Label>Right Landmarks (A-V-C)</Label>
                    <Row>
                      {[0, 1, 2].map(i => (
                        <Column key={i}>
                          <Select
                            value={(rule as BilateralSymmetryRule).rightLandmarks[i]}
                            onChange={e =>
                              updateRuleLandmark(idx, i as 0 | 1 | 2, parseInt(e.target.value, 10), 'rightLandmarks')
                            }
                          >
                            {Array.from({ length: 33 }, (_, li) => (
                              <option key={li} value={li}>{li}: {LANDMARK_NAMES[li]}</option>
                            ))}
                          </Select>
                        </Column>
                      ))}
                    </Row>
                  </FormGroup>
                </Column>
              </Row>
              <FormGroup>
                <Label>Max Difference (degrees)</Label>
                <Input
                  type="number"
                  value={(rule as BilateralSymmetryRule).maxDiff}
                  onChange={e => updateRule(idx, { maxDiff: parseFloat(e.target.value) } as any)}
                />
              </FormGroup>
            </>
          )}

          <FormGroup>
            <Label>Coaching Cue</Label>
            <Input
              value={rule.cue}
              onChange={e => updateRule(idx, { cue: e.target.value })}
              placeholder="e.g., Push your knees out over your toes"
            />
          </FormGroup>
        </RuleCard>
      ))}

      <Row>
        <Column>
          <Select value={addType} onChange={e => setAddType(e.target.value as FormRule['type'])}>
            <option value="angle_threshold">Angle Threshold</option>
            <option value="landmark_deviation">Landmark Deviation</option>
            <option value="bilateral_symmetry">Bilateral Symmetry</option>
          </Select>
        </Column>
        <Column>
          <Button $variant="secondary" onClick={addRule} style={{ width: '100%' }}>
            + Add Rule
          </Button>
        </Column>
      </Row>
    </>
  );
};

// --- Main Component ---

interface BiomechanicsStudioProps {
  editExerciseId?: number;
  onSaved?: (exercise: CustomExercise) => void;
  onCancel?: () => void;
}

const BiomechanicsStudio: React.FC<BiomechanicsStudioProps> = ({
  editExerciseId,
  onSaved,
  onCancel,
}) => {
  const api = useCustomExerciseAPI();

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [schema, setSchema] = useState<MechanicsSchema>({
    primaryAngle: {
      joint: 'left_knee',
      landmarks: [23, 25, 27],
      repPhases: { startAngle: 170, bottomAngle: 90, hysteresis: 10 },
    },
    formRules: [],
  });

  // Templates
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Validation
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load templates on mount
  useEffect(() => {
    api.listTemplates()
      .then(res => setTemplates(res.templates))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Load existing exercise if editing
  useEffect(() => {
    if (!editExerciseId) return;
    api.getExercise(editExerciseId).then(res => {
      const ex = res.exercise;
      setName(ex.name);
      setCategory(ex.category);
      setDescription(ex.description || '');
      setSchema(ex.mechanicsSchema);
    }).catch(() => {
      setStatusMsg({ type: 'error', text: 'Failed to load exercise' });
    });
  }, [editExerciseId]);

  const handleTemplateSelect = useCallback(async (key: string) => {
    try {
      const res = await api.getTemplate(key);
      const t = res.template;
      setSchema(t.mechanicsSchema);
      if (!name) setName(`${t.name} (Custom)`);
      setCategory(t.category);
      setActiveStep(1);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load template' });
    }
  }, [api, name]);

  const handleValidate = useCallback(async () => {
    try {
      const res = await api.validateSchema(schema);
      setValidation(res.validation);
    } catch {
      setStatusMsg({ type: 'error', text: 'Validation request failed' });
    }
  }, [api, schema]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Exercise name is required' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      let res;
      if (editExerciseId) {
        res = await api.updateExercise(editExerciseId, { name, category, mechanicsSchema: schema, description });
      } else {
        res = await api.createExercise({ name, category, mechanicsSchema: schema, description });
      }

      setStatusMsg({ type: 'success', text: `Exercise "${res.exercise.name}" saved (v${res.exercise.version})` });
      onSaved?.(res.exercise);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }, [api, name, category, schema, description, editExerciseId, onSaved]);

  const steps = [
    { title: 'Metadata', completed: !!name.trim() },
    { title: 'Rep Mechanics', completed: !!schema.primaryAngle?.landmarks?.length },
    { title: 'Form Rules', completed: schema.formRules.length > 0 },
    { title: 'Review & Save', completed: false },
  ];

  return (
    <PageWrapper>
      <PageHeader>
        <Title>Biomechanics Studio</Title>
        <Subtitle>Build custom exercise analysis rules</Subtitle>
      </PageHeader>

      {statusMsg && (
        <WizardContainer>
          <StatusMessage $type={statusMsg.type}>{statusMsg.text}</StatusMessage>
        </WizardContainer>
      )}

      <WizardContainer>
        {steps.map((step, idx) => (
          <StepCard key={idx} $active={activeStep === idx}>
            <StepHeader
              $active={activeStep === idx}
              $completed={step.completed}
              onClick={() => setActiveStep(activeStep === idx ? -1 : idx)}
              aria-label={`Step ${idx + 1}: ${step.title}`}
              aria-expanded={activeStep === idx}
              aria-controls={`step-body-${idx}`}
            >
              <StepNumber $active={activeStep === idx} $completed={step.completed}>
                {step.completed ? '\u2713' : idx + 1}
              </StepNumber>
              <StepTitle>{step.title}</StepTitle>
            </StepHeader>

            <AnimatePresence>
              {activeStep === idx && (
                <StepBody
                  id={`step-body-${idx}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {idx === 0 && (
                    <MetadataStep
                      name={name}
                      setName={setName}
                      category={category}
                      setCategory={setCategory}
                      description={description}
                      setDescription={setDescription}
                      templates={templates}
                      onTemplateSelect={handleTemplateSelect}
                      loadingTemplates={loadingTemplates}
                    />
                  )}
                  {idx === 1 && <RepMechanicsStep schema={schema} setSchema={setSchema} />}
                  {idx === 2 && <FormRulesStep schema={schema} setSchema={setSchema} />}
                  {idx === 3 && (
                    <>
                      <SummaryGrid>
                        <SummaryStat>
                          <StatValue>{schema.formRules.length}</StatValue>
                          <StatLabel>Form Rules</StatLabel>
                        </SummaryStat>
                        <SummaryStat>
                          <StatValue>{schema.primaryAngle ? 'Yes' : 'No'}</StatValue>
                          <StatLabel>Rep Detection</StatLabel>
                        </SummaryStat>
                        <SummaryStat>
                          <StatValue>
                            {new Set(schema.formRules.map(r => r.type)).size}
                          </StatValue>
                          <StatLabel>Rule Types</StatLabel>
                        </SummaryStat>
                        <SummaryStat>
                          <StatValue>{category.replace(/_/g, ' ')}</StatValue>
                          <StatLabel>Category</StatLabel>
                        </SummaryStat>
                      </SummaryGrid>

                      <Button $variant="secondary" onClick={handleValidate} style={{ marginBottom: 12 }}>
                        Validate Schema
                      </Button>

                      {validation && (
                        <ValidationBox $valid={validation.valid}>
                          <ValidationTitle $valid={validation.valid}>
                            {validation.valid
                              ? `Schema Valid (${validation.ruleCount} rules)`
                              : `Schema Invalid (${validation.errors.length} errors)`}
                          </ValidationTitle>
                          {validation.errors.map((e, i) => (
                            <ValidationItem key={`e-${i}`} $type="error">{e}</ValidationItem>
                          ))}
                          {validation.warnings.map((w, i) => (
                            <ValidationItem key={`w-${i}`} $type="warning">{w}</ValidationItem>
                          ))}
                        </ValidationBox>
                      )}

                      <ButtonRow>
                        {onCancel && (
                          <Button $variant="secondary" onClick={onCancel}>
                            Cancel
                          </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                          {saving ? 'Saving...' : editExerciseId ? 'Update Exercise' : 'Create Exercise'}
                        </Button>
                      </ButtonRow>
                    </>
                  )}

                  {/* Next step shortcut */}
                  {idx < 3 && (
                    <ButtonRow>
                      <Button $variant="secondary" onClick={() => setActiveStep(idx + 1)}>
                        Next: {steps[idx + 1].title}
                      </Button>
                    </ButtonRow>
                  )}
                </StepBody>
              )}
            </AnimatePresence>
          </StepCard>
        ))}
      </WizardContainer>
    </PageWrapper>
  );
};

export default BiomechanicsStudio;
