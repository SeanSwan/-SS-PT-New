import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Activity,
  User,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Video
} from 'lucide-react';
import apiService from '../../services/api.service';
import { useToast } from '../../hooks/use-toast';

const PageContainer = styled(motion.div)`
  padding: 2rem;
  color: white;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
`;

const Select = styled.select`
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }

  option {
    background: #1e293b;
    color: white;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  min-height: 100px;
  resize: vertical;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);

  input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const ScoreDisplay = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: 3rem;
  font-weight: 700;
  color: ${props => {
    if (props.score >= 80) return '#22c55e';
    if (props.score >= 60) return '#eab308';
    return '#ef4444';
  }};
`;

const ScoreLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const OPTPhaseDisplay = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border: 2px solid rgba(139, 92, 246, 0.4);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
`;

const PhaseTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #a78bfa;
  margin-bottom: 0.5rem;
`;

const PhaseDetails = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
`;

const CorrectiveStrategyDisplay = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StrategyCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
`;

const StrategyTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StrategyList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StrategyItem = styled.li`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.25rem 0;
  display: flex;
  align-items: start;
  gap: 0.5rem;

  &:before {
    content: '•';
    color: rgba(59, 130, 246, 0.8);
    font-weight: bold;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const Button = styled(motion.button)`
  padding: 0.875rem 2rem;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(59, 130, 246, 1);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background: rgba(100, 100, 100, 0.5);

  &:hover {
    background: rgba(100, 100, 100, 0.7);
  }
`;

const InfoBox = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border-left: 4px solid rgba(59, 130, 246, 0.6);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ClientInfoBar = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SegmentedControl = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const SegmentedButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.75rem;
  background: ${props => props.$active ? 'rgba(59, 130, 246, 0.8)' : 'transparent'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  transition: all 0.2s ease;
  min-height: 44px; /* Touch target */

  &:hover {
    background: ${props => props.$active ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.2)'};
  }
`;

interface OHSACheckpoint {
  feetTurnout: 'none' | 'minor' | 'significant';
  feetFlattening: 'none' | 'minor' | 'significant';
  kneeValgus: 'none' | 'minor' | 'significant';
  kneeVarus: 'none' | 'minor' | 'significant';
  excessiveForwardLean: 'none' | 'minor' | 'significant';
  lowBackArch: 'none' | 'minor' | 'significant';
  armsFallForward: 'none' | 'minor' | 'significant';
  forwardHead: 'none' | 'minor' | 'significant';
  asymmetricWeightShift: 'none' | 'minor' | 'significant';
}

interface MovementScreenData {
  userId: number;
  parqScreening: {
    q1_heart_condition: boolean;
    q2_chest_pain: boolean;
    q3_balance_dizziness: boolean;
    q4_bone_joint_problem: boolean;
    q5_blood_pressure_meds: boolean;
    q6_medical_reason: boolean;
    q7_aware_of_other: boolean;
  };
  overheadSquatAssessment: OHSACheckpoint;
  posturalAssessment: {
    anteriorView: string;
    lateralView: string;
    posteriorView: string;
  };
  performanceAssessments: any;
  flexibilityNotes: string;
  injuryNotes: string;
  painLevel: number;
  videoUrl?: string;
}

interface MovementScreenManagerProps {
  preSelectedUserId?: string;
}

const MovementScreenManager: React.FC<MovementScreenManagerProps> = ({ preSelectedUserId }) => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [nasmScore, setNasmScore] = useState<number | null>(null);
  const [optPhase, setOptPhase] = useState<any>(null);
  const [correctiveStrategy, setCorrectiveStrategy] = useState<any>(null);

  // PAR-Q+ Screening
  const [parqScreening, setParqScreening] = useState({
    q1_heart_condition: false,
    q2_chest_pain: false,
    q3_balance_dizziness: false,
    q4_bone_joint_problem: false,
    q5_blood_pressure_meds: false,
    q6_medical_reason: false,
    q7_aware_of_other: false,
  });

  // OHSA Checkpoints
  const [ohsa, setOhsa] = useState<OHSACheckpoint>({
    feetTurnout: 'none',
    feetFlattening: 'none',
    kneeValgus: 'none',
    kneeVarus: 'none',
    excessiveForwardLean: 'none',
    lowBackArch: 'none',
    armsFallForward: 'none',
    forwardHead: 'none',
    asymmetricWeightShift: 'none',
  });

  // Additional fields
  const [posturalAssessment, setPosturalAssessment] = useState({
    anteriorView: '',
    lateralView: '',
    posteriorView: '',
  });

  const [flexibilityNotes, setFlexibilityNotes] = useState('');
  const [injuryNotes, setInjuryNotes] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Auto-calculate NASM score when OHSA changes
    calculateNASMScore();
  }, [ohsa]);

  useEffect(() => {
    if (preSelectedUserId) {
      setSelectedUserId(Number(preSelectedUserId));
    }
  }, [preSelectedUserId]);

  const fetchClients = async () => {
    try {
      const response = await apiService.get('/api/admin/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const calculateNASMScore = () => {
    const compensationScores = {
      none: 100,
      minor: 70,
      significant: 40,
    };

    const scores = [
      compensationScores[ohsa.feetTurnout],
      compensationScores[ohsa.feetFlattening],
      compensationScores[ohsa.kneeValgus],
      compensationScores[ohsa.kneeVarus],
      compensationScores[ohsa.excessiveForwardLean],
      compensationScores[ohsa.lowBackArch],
      compensationScores[ohsa.armsFallForward],
      compensationScores[ohsa.forwardHead],
      compensationScores[ohsa.asymmetricWeightShift],
    ];

    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    setNasmScore(avgScore);

    // Determine OPT phase
    const primaryGoal = 'weight_loss'; // Would come from questionnaire
    let phase = null;

    if (avgScore < 60) {
      phase = {
        phase: 1,
        name: 'Stabilization Endurance',
        focus: 'Muscular endurance and core stability',
        duration: '4-6 weeks',
        repRange: '12-20 reps',
        tempo: '4-2-1',
        rest: '0-90 seconds',
      };
    } else if (avgScore < 80) {
      phase = {
        phase: 2,
        name: 'Strength Endurance',
        focus: 'Stability and strength',
        duration: '4 weeks',
        repRange: '8-12 reps',
        tempo: '2-0-2',
        rest: '0-60 seconds',
      };
    } else {
      if (primaryGoal === 'weight_loss') {
        phase = {
          phase: 2,
          name: 'Strength Endurance',
          focus: 'Caloric expenditure and muscle building',
          duration: '4-6 weeks',
          repRange: '8-12 reps',
          tempo: '2-0-2',
          rest: '0-60 seconds',
        };
      } else {
        phase = {
          phase: 3,
          name: 'Hypertrophy',
          focus: 'Maximal muscle growth',
          duration: '3-4 weeks',
          repRange: '6-12 reps',
          tempo: '2-0-2',
          rest: '0-60 seconds',
        };
      }
    }

    setOptPhase(phase);
    generateCorrectiveStrategy();
  };

  const generateCorrectiveStrategy = () => {
    const strategy: any = {
      compensationsIdentified: [],
      inhibit: [],
      lengthen: [],
      activate: [],
      integrate: [],
    };

    // Identify compensations
    Object.entries(ohsa).forEach(([key, value]) => {
      if (value !== 'none') {
        strategy.compensationsIdentified.push(key);
      }
    });

    // Generate corrective exercises based on compensations
    if (ohsa.kneeValgus !== 'none') {
      strategy.inhibit.push({ muscle: 'TFL/IT Band', exercise: 'Foam roll TFL', duration: '30s' });
      strategy.inhibit.push({ muscle: 'Adductors', exercise: 'Foam roll adductors', duration: '30s' });
      strategy.lengthen.push({ muscle: 'Hip flexors', exercise: 'Kneeling hip flexor stretch', sets: '1', duration: '30s' });
      strategy.lengthen.push({ muscle: 'Adductors', exercise: 'Standing adductor stretch', sets: '1', duration: '30s' });
      strategy.activate.push({ muscle: 'Glute medius', exercise: 'Side-lying hip abduction', sets: '2', reps: '10' });
      strategy.activate.push({ muscle: 'Glute maximus', exercise: 'Floor bridges', sets: '2', reps: '15' });
      strategy.integrate.push({ exercise: 'Ball wall squats', sets: '2', reps: '10' });
    }

    if (ohsa.excessiveForwardLean !== 'none') {
      strategy.inhibit.push({ muscle: 'Calves', exercise: 'Foam roll calves', duration: '30s' });
      strategy.lengthen.push({ muscle: 'Calves', exercise: 'Standing calf stretch', sets: '1', duration: '30s' });
      strategy.activate.push({ muscle: 'Anterior tibialis', exercise: 'Ankle dorsiflexion', sets: '2', reps: '10' });
    }

    if (ohsa.armsFallForward !== 'none') {
      strategy.inhibit.push({ muscle: 'Pectorals', exercise: 'Foam roll pecs', duration: '30s' });
      strategy.lengthen.push({ muscle: 'Pectorals', exercise: 'Standing pec stretch', sets: '1', duration: '30s' });
      strategy.activate.push({ muscle: 'Mid/lower traps', exercise: 'Floor cobras', sets: '2', reps: '10' });
    }

    setCorrectiveStrategy(strategy);
  };

  const handleSaveMovementScreen = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a client first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const data: MovementScreenData = {
        userId: selectedUserId,
        parqScreening,
        overheadSquatAssessment: ohsa,
        posturalAssessment,
        performanceAssessments: {},
        flexibilityNotes,
        injuryNotes,
        painLevel,
        videoUrl: videoUrl || undefined,
      };

      await apiService.post(`/api/onboarding/${selectedUserId}/movement-screen`, data);

      toast({
        title: 'Success',
        description: 'Movement screen saved successfully',
      });

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error saving movement screen:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save movement screen',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setParqScreening({
      q1_heart_condition: false,
      q2_chest_pain: false,
      q3_balance_dizziness: false,
      q4_bone_joint_problem: false,
      q5_blood_pressure_meds: false,
      q6_medical_reason: false,
      q7_aware_of_other: false,
    });
    setOhsa({
      feetTurnout: 'none',
      feetFlattening: 'none',
      kneeValgus: 'none',
      kneeVarus: 'none',
      excessiveForwardLean: 'none',
      lowBackArch: 'none',
      armsFallForward: 'none',
      forwardHead: 'none',
      asymmetricWeightShift: 'none',
    });
    setPosturalAssessment({ anteriorView: '', lateralView: '', posteriorView: '' });
    setFlexibilityNotes('');
    setInjuryNotes('');
    setPainLevel(0);
    setVideoUrl('');
    setNasmScore(null);
    setOptPhase(null);
    setCorrectiveStrategy(null);
  };

  const medicalClearanceRequired =
    parqScreening.q1_heart_condition ||
    parqScreening.q2_chest_pain ||
    parqScreening.q3_balance_dizziness ||
    parqScreening.q4_bone_joint_problem ||
    parqScreening.q5_blood_pressure_meds ||
    parqScreening.q6_medical_reason ||
    parqScreening.q7_aware_of_other;

  return (
    <PageContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <Title>
          <Activity size={32} />
          NASM Movement Screen Assessment
        </Title>
      </Header>

      {!preSelectedUserId && (
        <Card>
          <SectionTitle>
            <User size={20} />
            Client Selection
          </SectionTitle>
          <FormGroup>
            <Label>Select Client</Label>
            <Select value={selectedUserId || ''} onChange={(e) => setSelectedUserId(Number(e.target.value))}>
              <option value="">-- Select a client --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName} ({client.email})
                </option>
              ))}
            </Select>
          </FormGroup>
        </Card>
      )}


      {selectedUserId && (
        <>
          <Card>
            <SectionTitle>PAR-Q+ Pre-Screening</SectionTitle>
            <InfoBox>
              <Info size={18} />
              <div>
                PAR-Q+ is a 7-question screening tool to identify individuals who may require medical clearance
                before beginning an exercise program.
              </div>
            </InfoBox>
            <CheckboxGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q1_heart_condition}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q1_heart_condition: e.target.checked })
                  }
                />
                Has your doctor ever said you have a heart condition?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q2_chest_pain}
                  onChange={(e) => setParqScreening({ ...parqScreening, q2_chest_pain: e.target.checked })}
                />
                Do you feel pain in your chest during physical activity?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q3_balance_dizziness}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q3_balance_dizziness: e.target.checked })
                  }
                />
                Do you lose balance or consciousness?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q4_bone_joint_problem}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q4_bone_joint_problem: e.target.checked })
                  }
                />
                Do you have a bone or joint problem that could be made worse by exercise?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q5_blood_pressure_meds}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q5_blood_pressure_meds: e.target.checked })
                  }
                />
                Are you currently taking medication for blood pressure?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q6_medical_reason}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q6_medical_reason: e.target.checked })
                  }
                />
                Do you know of any other reason you should not exercise?
              </CheckboxLabel>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={parqScreening.q7_aware_of_other}
                  onChange={(e) =>
                    setParqScreening({ ...parqScreening, q7_aware_of_other: e.target.checked })
                  }
                />
                Are you aware of any other medical condition?
              </CheckboxLabel>
            </CheckboxGroup>

            {medicalClearanceRequired && (
              <InfoBox style={{ marginTop: '1rem', borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <div>
                  <strong>Medical clearance required.</strong> Client answered YES to one or more PAR-Q+ questions.
                  Obtain physician approval before conducting movement assessment.
                </div>
              </InfoBox>
            )}
          </Card>

          <Card>
            <SectionTitle>NASM Overhead Squat Assessment (OHSA)</SectionTitle>
            <InfoBox>
              <Info size={18} />
              <div>
                Observe client performing 5 bodyweight overhead squats. Rate each kinetic chain checkpoint as: <strong>none</strong> (no compensation), <strong>minor</strong> (slight deviation), or <strong>significant</strong> (clear compensation).
              </div>
            </InfoBox>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>Anterior View</h3>
              <FormGrid>
                <FormGroup>
                  <Label>Feet Turnout</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.feetTurnout === 'none'}
                      onClick={() => setOhsa({...ohsa, feetTurnout: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.feetTurnout === 'minor'}
                      onClick={() => setOhsa({...ohsa, feetTurnout: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.feetTurnout === 'significant'}
                      onClick={() => setOhsa({...ohsa, feetTurnout: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Feet Flattening (Pronation)</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.feetFlattening === 'none'}
                      onClick={() => setOhsa({...ohsa, feetFlattening: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.feetFlattening === 'minor'}
                      onClick={() => setOhsa({...ohsa, feetFlattening: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.feetFlattening === 'significant'}
                      onClick={() => setOhsa({...ohsa, feetFlattening: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Knee Valgus (Knees In)</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.kneeValgus === 'none'}
                      onClick={() => setOhsa({...ohsa, kneeValgus: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.kneeValgus === 'minor'}
                      onClick={() => setOhsa({...ohsa, kneeValgus: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.kneeValgus === 'significant'}
                      onClick={() => setOhsa({...ohsa, kneeValgus: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Knee Varus (Knees Out)</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.kneeVarus === 'none'}
                      onClick={() => setOhsa({...ohsa, kneeVarus: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.kneeVarus === 'minor'}
                      onClick={() => setOhsa({...ohsa, kneeVarus: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.kneeVarus === 'significant'}
                      onClick={() => setOhsa({...ohsa, kneeVarus: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
              </FormGrid>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>Lateral View</h3>
              <FormGrid>
                <FormGroup>
                  <Label>Excessive Forward Lean</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.excessiveForwardLean === 'none'}
                      onClick={() => setOhsa({...ohsa, excessiveForwardLean: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.excessiveForwardLean === 'minor'}
                      onClick={() => setOhsa({...ohsa, excessiveForwardLean: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.excessiveForwardLean === 'significant'}
                      onClick={() => setOhsa({...ohsa, excessiveForwardLean: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Low Back Arch (Lumbar Extension)</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.lowBackArch === 'none'}
                      onClick={() => setOhsa({...ohsa, lowBackArch: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.lowBackArch === 'minor'}
                      onClick={() => setOhsa({...ohsa, lowBackArch: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.lowBackArch === 'significant'}
                      onClick={() => setOhsa({...ohsa, lowBackArch: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Arms Fall Forward</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.armsFallForward === 'none'}
                      onClick={() => setOhsa({...ohsa, armsFallForward: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.armsFallForward === 'minor'}
                      onClick={() => setOhsa({...ohsa, armsFallForward: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.armsFallForward === 'significant'}
                      onClick={() => setOhsa({...ohsa, armsFallForward: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
                <FormGroup>
                  <Label>Forward Head</Label>
                  <SegmentedControl>
                    <SegmentedButton
                      $active={ohsa.forwardHead === 'none'}
                      onClick={() => setOhsa({...ohsa, forwardHead: 'none'})}
                    >
                      None
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.forwardHead === 'minor'}
                      onClick={() => setOhsa({...ohsa, forwardHead: 'minor'})}
                    >
                      Minor
                    </SegmentedButton>
                    <SegmentedButton
                      $active={ohsa.forwardHead === 'significant'}
                      onClick={() => setOhsa({...ohsa, forwardHead: 'significant'})}
                    >
                      Significant
                    </SegmentedButton>
                  </SegmentedControl>
                </FormGroup>
              </FormGrid>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>Additional Observations</h3>
              <FormGroup>
                <Label>Asymmetric Weight Shift</Label>
                <SegmentedControl>
                  <SegmentedButton
                    $active={ohsa.asymmetricWeightShift === 'none'}
                    onClick={() => setOhsa({...ohsa, asymmetricWeightShift: 'none'})}
                  >
                    None
                  </SegmentedButton>
                  <SegmentedButton
                    $active={ohsa.asymmetricWeightShift === 'minor'}
                    onClick={() => setOhsa({...ohsa, asymmetricWeightShift: 'minor'})}
                  >
                    Minor
                  </SegmentedButton>
                  <SegmentedButton
                    $active={ohsa.asymmetricWeightShift === 'significant'}
                    onClick={() => setOhsa({...ohsa, asymmetricWeightShift: 'significant'})}
                  >
                    Significant
                  </SegmentedButton>
                </SegmentedControl>
              </FormGroup>
            </div>
          </Card>

          {nasmScore !== null && (
            <Card>
              <SectionTitle>
                <CheckCircle size={20} />
                Assessment Results
              </SectionTitle>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ScoreDisplay>
                  <ScoreLabel>NASM Score</ScoreLabel>
                  <ScoreValue score={nasmScore}>{nasmScore}/100</ScoreValue>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Auto-calculated</div>
                </ScoreDisplay>

                {optPhase && (
                  <OPTPhaseDisplay>
                    <PhaseTitle>
                      OPT Phase {optPhase.phase}: {optPhase.name}
                    </PhaseTitle>
                    <PhaseDetails>
                      <strong>Focus:</strong> {optPhase.focus}
                      <br />
                      <strong>Duration:</strong> {optPhase.duration}
                      <br />
                      <strong>Rep Range:</strong> {optPhase.repRange} | <strong>Tempo:</strong> {optPhase.tempo} |{' '}
                      <strong>Rest:</strong> {optPhase.rest}
                    </PhaseDetails>
                  </OPTPhaseDisplay>
                )}
              </div>

              {correctiveStrategy && correctiveStrategy.compensationsIdentified.length > 0 && (
                <>
                  <SectionTitle style={{ fontSize: '1rem', marginTop: '1.5rem' }}>
                    4-Phase Corrective Exercise Strategy
                  </SectionTitle>
                  <CorrectiveStrategyDisplay>
                    <StrategyCard>
                      <StrategyTitle>1. Inhibit (Foam Rolling)</StrategyTitle>
                      <StrategyList>
                        {correctiveStrategy.inhibit.map((ex: any, i: number) => (
                          <StrategyItem key={i}>
                            {ex.muscle}: {ex.exercise} ({ex.duration})
                          </StrategyItem>
                        ))}
                      </StrategyList>
                    </StrategyCard>

                    <StrategyCard>
                      <StrategyTitle>2. Lengthen (Stretching)</StrategyTitle>
                      <StrategyList>
                        {correctiveStrategy.lengthen.map((ex: any, i: number) => (
                          <StrategyItem key={i}>
                            {ex.muscle}: {ex.exercise} ({ex.sets} x {ex.duration})
                          </StrategyItem>
                        ))}
                      </StrategyList>
                    </StrategyCard>

                    <StrategyCard>
                      <StrategyTitle>3. Activate (Strengthening)</StrategyTitle>
                      <StrategyList>
                        {correctiveStrategy.activate.map((ex: any, i: number) => (
                          <StrategyItem key={i}>
                            {ex.muscle}: {ex.exercise} ({ex.sets} x {ex.reps})
                          </StrategyItem>
                        ))}
                      </StrategyList>
                    </StrategyCard>

                    <StrategyCard>
                      <StrategyTitle>4. Integrate (Functional)</StrategyTitle>
                      <StrategyList>
                        {correctiveStrategy.integrate.map((ex: any, i: number) => (
                          <StrategyItem key={i}>
                            {ex.exercise} ({ex.sets} x {ex.reps})
                          </StrategyItem>
                        ))}
                      </StrategyList>
                    </StrategyCard>
                  </CorrectiveStrategyDisplay>
                </>
              )}
            </Card>
          )}

          <Card>
            <SectionTitle>Additional Notes</SectionTitle>
            <FormGrid>
              <FormGroup>
                <Label>Flexibility Notes</Label>
                <TextArea
                  value={flexibilityNotes}
                  onChange={(e) => setFlexibilityNotes(e.target.value)}
                  placeholder="Note any flexibility limitations..."
                />
              </FormGroup>
              <FormGroup>
                <Label>Injury History / Notes</Label>
                <TextArea
                  value={injuryNotes}
                  onChange={(e) => setInjuryNotes(e.target.value)}
                  placeholder="Document any previous injuries or current pain..."
                />
              </FormGroup>
            </FormGrid>

            <FormGrid>
              <FormGroup>
                <Label>Pain Level (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                />
              </FormGroup>
              <FormGroup>
                <Label>Video URL (Optional)</Label>
                <Input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </FormGroup>
            </FormGrid>
          </Card>

          <ButtonGroup>
            <CancelButton onClick={resetForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <X size={18} />
              Cancel
            </CancelButton>
            <Button
              onClick={handleSaveMovementScreen}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save NASM Assessment'}
            </Button>
          </ButtonGroup>
        </>
      )}
    </PageContainer>
  );
};

export default MovementScreenManager;
