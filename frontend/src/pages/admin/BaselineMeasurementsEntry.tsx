import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  Heart,
  User,
  Save,
  X,
  TrendingUp,
  Activity,
  AlertCircle
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
  margin-bottom: 1rem;

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

  &[type='number'] {
    -moz-appearance: textfield;
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
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

const HistoryCard = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-left: 3px solid rgba(59, 130, 246, 0.6);
`;

const HistoryDate = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
`;

const HistoryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.span`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
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

interface BaselineMeasurement {
  id: number;
  userId: number;
  takenAt: string;
  restingHeartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  bodyWeight?: number;
  bodyFatPercentage?: number;
  benchPressWeight?: number;
  benchPressReps?: number;
  squatWeight?: number;
  squatReps?: number;
  deadliftWeight?: number;
  deadliftReps?: number;
  pullUpsReps?: number;
  plankDuration?: number;
  nasmAssessmentScore?: number;
  flexibilityNotes?: string;
  injuryNotes?: string;
  painLevel?: number;
}

interface BaselineMeasurementsEntryProps {
  preSelectedUserId?: string;
}

const BaselineMeasurementsEntry: React.FC<BaselineMeasurementsEntryProps> = ({ preSelectedUserId }) => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<BaselineMeasurement[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [restingHeartRate, setRestingHeartRate] = useState<number | ''>('');
  const [bloodPressureSystolic, setBloodPressureSystolic] = useState<number | ''>('');
  const [bloodPressureDiastolic, setBloodPressureDiastolic] = useState<number | ''>('');
  const [bodyWeight, setBodyWeight] = useState<number | ''>('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number | ''>('');
  const [benchPressWeight, setBenchPressWeight] = useState<number | ''>('');
  const [benchPressReps, setBenchPressReps] = useState<number | ''>('');
  const [squatWeight, setSquatWeight] = useState<number | ''>('');
  const [squatReps, setSquatReps] = useState<number | ''>('');
  const [deadliftWeight, setDeadliftWeight] = useState<number | ''>('');
  const [deadliftReps, setDeadliftReps] = useState<number | ''>('');
  const [pullUpsReps, setPullUpsReps] = useState<number | ''>('');
  const [plankDuration, setPlankDuration] = useState<number | ''>('');
  const [flexibilityNotes, setFlexibilityNotes] = useState('');
  const [injuryNotes, setInjuryNotes] = useState('');
  const [painLevel, setPainLevel] = useState<number | ''>(0);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMeasurementHistory(selectedUserId);
    }
  }, [selectedUserId]);

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

  const fetchMeasurementHistory = async (userId: number) => {
    try {
      const response = await apiService.get(`/api/admin/baseline-measurements/${userId}`);
      setMeasurementHistory(response.data.measurements || []);
    } catch (error) {
      console.error('Error fetching measurement history:', error);
    }
  };

  const handleSaveMeasurements = async () => {
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

      const data = {
        userId: selectedUserId,
        takenAt: new Date().toISOString(),
        restingHeartRate: restingHeartRate || undefined,
        bloodPressureSystolic: bloodPressureSystolic || undefined,
        bloodPressureDiastolic: bloodPressureDiastolic || undefined,
        bodyWeight: bodyWeight || undefined,
        bodyFatPercentage: bodyFatPercentage || undefined,
        benchPressWeight: benchPressWeight || undefined,
        benchPressReps: benchPressReps || undefined,
        squatWeight: squatWeight || undefined,
        squatReps: squatReps || undefined,
        deadliftWeight: deadliftWeight || undefined,
        deadliftReps: deadliftReps || undefined,
        pullUpsReps: pullUpsReps || undefined,
        plankDuration: plankDuration || undefined,
        flexibilityNotes: flexibilityNotes || undefined,
        injuryNotes: injuryNotes || undefined,
        painLevel: painLevel || 0,
      };

      await apiService.post(`/api/admin/baseline-measurements`, data);

      toast({
        title: 'Success',
        description: 'Baseline measurements saved successfully',
      });

      // Refresh history
      fetchMeasurementHistory(selectedUserId);

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error saving measurements:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save measurements',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setRestingHeartRate('');
    setBloodPressureSystolic('');
    setBloodPressureDiastolic('');
    setBodyWeight('');
    setBodyFatPercentage('');
    setBenchPressWeight('');
    setBenchPressReps('');
    setSquatWeight('');
    setSquatReps('');
    setDeadliftWeight('');
    setDeadliftReps('');
    setPullUpsReps('');
    setPlankDuration('');
    setFlexibilityNotes('');
    setInjuryNotes('');
    setPainLevel(0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlaceholder = (field: keyof BaselineMeasurement, defaultVal: string) => {
    if (measurementHistory.length > 0 && measurementHistory[0][field] !== undefined) {
      return `Last: ${measurementHistory[0][field]}`;
    }
    return defaultVal;
  };

  return (
    <PageContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <Title>
          <TrendingUp size={32} />
          Baseline Measurements Entry
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
            <SectionTitle>
              <Heart size={20} />
              Vitals & Body Composition
            </SectionTitle>
            <FormGrid>
              <FormGroup>
                <Label>Resting Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  value={restingHeartRate}
                  onChange={(e) => setRestingHeartRate(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('restingHeartRate', '72')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Blood Pressure (Systolic/Diastolic)</Label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Input
                    type="number"
                    value={bloodPressureSystolic}
                    onChange={(e) => setBloodPressureSystolic(e.target.value ? Number(e.target.value) : '')}
                    placeholder={getPlaceholder('bloodPressureSystolic', '120')}
                  />
                  <span>/</span>
                  <Input
                    type="number"
                    value={bloodPressureDiastolic}
                    onChange={(e) => setBloodPressureDiastolic(e.target.value ? Number(e.target.value) : '')}
                    placeholder={getPlaceholder('bloodPressureDiastolic', '80')}
                  />
                </div>
              </FormGroup>
              <FormGroup>
                <Label>Body Weight (lbs)</Label>
                <Input
                  type="number"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('bodyWeight', '185')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Body Fat Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={bodyFatPercentage}
                  onChange={(e) => setBodyFatPercentage(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('bodyFatPercentage', '18.5')}
                />
              </FormGroup>
            </FormGrid>
          </Card>

          <Card>
            <SectionTitle>
              <Activity size={20} />
              Strength Assessments
            </SectionTitle>
            <InfoBox>
              <AlertCircle size={18} />
              <div>
                Record the weight and reps for strength exercises. These measurements help track strength progress over time.
              </div>
            </InfoBox>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
              Upper Body
            </h3>
            <FormGrid>
              <FormGroup>
                <Label>Bench Press Weight (lbs)</Label>
                <Input
                  type="number"
                  value={benchPressWeight}
                  onChange={(e) => setBenchPressWeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('benchPressWeight', '135')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Bench Press Reps</Label>
                <Input
                  type="number"
                  value={benchPressReps}
                  onChange={(e) => setBenchPressReps(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('benchPressReps', '10')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Pull-Ups (Reps)</Label>
                <Input
                  type="number"
                  value={pullUpsReps}
                  onChange={(e) => setPullUpsReps(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('pullUpsReps', '5')}
                />
              </FormGroup>
            </FormGrid>

            <h3 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem', color: 'rgba(255,255,255,0.8)' }}>
              Lower Body
            </h3>
            <FormGrid>
              <FormGroup>
                <Label>Squat Weight (lbs)</Label>
                <Input
                  type="number"
                  value={squatWeight}
                  onChange={(e) => setSquatWeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('squatWeight', '225')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Squat Reps</Label>
                <Input
                  type="number"
                  value={squatReps}
                  onChange={(e) => setSquatReps(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('squatReps', '8')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Deadlift Weight (lbs)</Label>
                <Input
                  type="number"
                  value={deadliftWeight}
                  onChange={(e) => setDeadliftWeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('deadliftWeight', '275')}
                />
              </FormGroup>
              <FormGroup>
                <Label>Deadlift Reps</Label>
                <Input
                  type="number"
                  value={deadliftReps}
                  onChange={(e) => setDeadliftReps(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('deadliftReps', '5')}
                />
              </FormGroup>
            </FormGrid>

            <h3 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem', color: 'rgba(255,255,255,0.8)' }}>
              Core Stability
            </h3>
            <FormGrid>
              <FormGroup>
                <Label>Plank Duration (seconds)</Label>
                <Input
                  type="number"
                  value={plankDuration}
                  onChange={(e) => setPlankDuration(e.target.value ? Number(e.target.value) : '')}
                  placeholder={getPlaceholder('plankDuration', '60')}
                />
              </FormGroup>
            </FormGrid>
          </Card>

          <Card>
            <SectionTitle>Additional Notes</SectionTitle>
            <FormGrid>
              <FormGroup>
                <Label>Flexibility Notes</Label>
                <TextArea
                  value={flexibilityNotes}
                  onChange={(e) => setFlexibilityNotes(e.target.value)}
                  placeholder="Note any flexibility limitations or observations..."
                />
              </FormGroup>
              <FormGroup>
                <Label>Injury Notes</Label>
                <TextArea
                  value={injuryNotes}
                  onChange={(e) => setInjuryNotes(e.target.value)}
                  placeholder="Document any injuries or areas of concern..."
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
                  onChange={(e) => setPainLevel(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                />
              </FormGroup>
            </FormGrid>
          </Card>

          <ButtonGroup>
            <CancelButton onClick={resetForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <X size={18} />
              Clear Form
            </CancelButton>
            <Button
              onClick={handleSaveMeasurements}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Measurements'}
            </Button>
          </ButtonGroup>

          {measurementHistory.length > 0 && (
            <Card>
              <SectionTitle>Measurement History</SectionTitle>
              {measurementHistory.map((measurement) => (
                <HistoryCard key={measurement.id}>
                  <HistoryDate>{formatDate(measurement.takenAt)}</HistoryDate>
                  <HistoryMetrics>
                    {measurement.restingHeartRate && (
                      <MetricItem>
                        <MetricLabel>Resting HR</MetricLabel>
                        <MetricValue>{measurement.restingHeartRate} bpm</MetricValue>
                      </MetricItem>
                    )}
                    {measurement.bloodPressureSystolic && (
                      <MetricItem>
                        <MetricLabel>Blood Pressure</MetricLabel>
                        <MetricValue>
                          {measurement.bloodPressureSystolic}/{measurement.bloodPressureDiastolic}
                        </MetricValue>
                      </MetricItem>
                    )}
                    {measurement.bodyWeight && (
                      <MetricItem>
                        <MetricLabel>Body Weight</MetricLabel>
                        <MetricValue>{measurement.bodyWeight} lbs</MetricValue>
                      </MetricItem>
                    )}
                    {measurement.benchPressWeight && (
                      <MetricItem>
                        <MetricLabel>Bench Press</MetricLabel>
                        <MetricValue>
                          {measurement.benchPressWeight} lbs x {measurement.benchPressReps}
                        </MetricValue>
                      </MetricItem>
                    )}
                    {measurement.squatWeight && (
                      <MetricItem>
                        <MetricLabel>Squat</MetricLabel>
                        <MetricValue>
                          {measurement.squatWeight} lbs x {measurement.squatReps}
                        </MetricValue>
                      </MetricItem>
                    )}
                    {measurement.nasmAssessmentScore && (
                      <MetricItem>
                        <MetricLabel>NASM Score</MetricLabel>
                        <MetricValue>{measurement.nasmAssessmentScore}/100</MetricValue>
                      </MetricItem>
                    )}
                  </HistoryMetrics>
                </HistoryCard>
              ))}
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default BaselineMeasurementsEntry;
