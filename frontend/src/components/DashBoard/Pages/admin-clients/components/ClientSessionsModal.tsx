/**
 * ClientSessionsModal.tsx
 * Shows training session history for a specific client.
 * Fetches from GET /api/admin/clients/:id/workout-stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Clock, Activity, RefreshCw } from 'lucide-react';
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

interface SessionStat {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  avgDuration: number;
  recentSessions: Array<{
    id: number;
    date: string;
    type: string;
    duration: number;
    status: string;
    notes?: string;
  }>;
}

const ClientSessionsModal: React.FC<Props> = ({ open, clientId, clientName, onClose }) => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<SessionStat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authAxios.get(`/api/admin/clients/${clientId}/workout-stats`);
      if (resp.data.success) {
        setData(resp.data.data);
      } else {
        setError(resp.data.message || 'Failed to load session data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load session data');
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
            <Calendar size={20} />
            Sessions — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <CenterContent>
              <Spinner />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>Loading sessions...</p>
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

          {!loading && !error && data && (
            <>
              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                {[
                  { label: 'Total Sessions', value: data.totalSessions, icon: <Calendar size={16} /> },
                  { label: 'Completed', value: data.completedSessions, icon: <Activity size={16} /> },
                  { label: 'Cancelled', value: data.cancelledSessions, icon: <X size={16} /> },
                  { label: 'Avg Duration', value: `${data.avgDuration || 0}m`, icon: <Clock size={16} /> },
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 10,
                    padding: '1rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ffff' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Sessions List */}
              <h3 style={{ color: '#e2e8f0', fontSize: '1rem', marginBottom: '0.75rem' }}>Recent Sessions</h3>
              {data.recentSessions && data.recentSessions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.recentSessions.map((session) => (
                    <div key={session.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                    }}>
                      <div>
                        <div style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.875rem' }}>
                          {session.type || 'Training Session'}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                          {new Date(session.date).toLocaleDateString()} • {session.duration}min
                        </div>
                      </div>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: session.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                        color: session.status === 'completed' ? '#10b981' : '#f59e0b',
                      }}>
                        {session.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                  <Calendar size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                  <p>No sessions recorded yet</p>
                </div>
              )}
            </>
          )}

          {!loading && !error && !data && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
              <Calendar size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p>No session data available</p>
            </div>
          )}
        </ModalBody>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default ClientSessionsModal;
