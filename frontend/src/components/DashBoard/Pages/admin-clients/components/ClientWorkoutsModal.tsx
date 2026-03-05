/**
 * ClientWorkoutsModal.tsx
 * Shows completed workouts for a specific client.
 * Fetches from GET /api/admin/clients/:id/workout-stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Dumbbell, Clock, Target, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  CenterContent,
  Spinner,
} from './copilot-shared-styles';

interface Props {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
}

interface WorkoutEntry {
  id: number;
  title: string;
  date: string;
  duration: number;
  exercises: number;
  intensity: number;
  notes?: string;
}

const ClientWorkoutsModal: React.FC<Props> = ({ open, clientId, clientName, onClose }) => {
  const { authAxios } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authAxios.get(`/api/admin/clients/${clientId}/workout-stats`);
      if (resp.data.success) {
        const d = resp.data.data;
        setWorkouts(d.recentWorkouts || d.recentSessions || []);
      } else {
        setError(resp.data.message || 'Failed to load workout data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load workout data');
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  if (!open) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalPanel style={{ maxWidth: 700 }}>
        <ModalHeader>
          <ModalTitle>
            <Dumbbell size={20} />
            Workouts — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <CenterContent>
              <Spinner />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>Loading workouts...</p>
            </CenterContent>
          )}

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#fca5a5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{error}</span>
              <button
                onClick={fetchData}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  minHeight: 36,
                }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && workouts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {workouts.map((w) => (
                <div key={w.id} style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9375rem' }}>
                      {w.title || 'Workout'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                      {new Date(w.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {w.duration > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>
                        <Clock size={13} /> {w.duration}min
                      </div>
                    )}
                    {w.exercises > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>
                        <Dumbbell size={13} /> {w.exercises} exercises
                      </div>
                    )}
                    {w.intensity > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem' }}>
                        <Target size={13} /> Intensity {w.intensity}/10
                      </div>
                    )}
                  </div>
                  {w.notes && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      {w.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && !error && workouts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
              <Dumbbell size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p>No workouts recorded yet</p>
            </div>
          )}
        </ModalBody>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default ClientWorkoutsModal;
