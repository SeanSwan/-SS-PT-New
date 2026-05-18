/**
 * ClientWorkoutLoggerSection.tsx
 * ==============================
 * Client-scoped workout logger wrapper.
 * Reuses the existing WorkoutLogger component but passes the
 * authenticated user's own ID, enforcing client-only RBAC.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Dumbbell, Plus, CheckCircle, History } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';
import WorkoutLogger from '../../WorkoutLogger/WorkoutLogger';

const SWAN_CYAN = '#8B5CF6';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(12px);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 1.5rem 0;
`;

const StartButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 2rem;
  min-height: 56px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: ${SWAN_CYAN};
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.25));
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const SuccessCard = styled(SectionCard)`
  text-align: center;
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.05);
`;

const ClientWorkoutLoggerSection: React.FC = () => {
  const { user } = useAuth();
  const [isLogging, setIsLogging] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);

  if (!user?.id) {
    return null;
  }

  const handleComplete = (formData: any) => {
    setIsLogging(false);
    setLastCompleted(new Date().toLocaleString());
    toast.success('Workout logged! Great job!');
  };

  const handleCancel = () => {
    setIsLogging(false);
  };

  if (isLogging) {
    return (
      <WorkoutLogger
        clientId={user.id}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Container>
        <SectionCard>
          <SectionTitle>
            <Dumbbell size={28} color={SWAN_CYAN} />
            Workout Logger
          </SectionTitle>
          <Subtitle>
            Log your exercises, sets, reps, and track your progress over time.
          </Subtitle>

          <StartButton
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsLogging(true)}
          >
            <Plus size={20} />
            Log New Workout
          </StartButton>
        </SectionCard>

        {lastCompleted && (
          <SuccessCard>
            <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.75rem' }} />
            <div style={{ color: '#10b981', fontWeight: 600, fontSize: '1rem' }}>
              Workout Completed!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {lastCompleted}
            </div>
          </SuccessCard>
        )}
      </Container>
    </motion.div>
  );
};

export default ClientWorkoutLoggerSection;
