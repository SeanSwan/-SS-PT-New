/**
 * ClientWeighInPanel
 * ─────────────────────────────────────────────────────────────
 * Simplified modal for quick weight entry and trend display.
 *
 * Phase 11C — Client Measurement Status
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Scale, TrendingDown, TrendingUp, Minus, Save } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { getCheckStatus } from '../../../../../utils/measurementStatus';

const SWAN_CYAN = '#00FFFF';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─── Styled Components ─────────────────────────────────── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 480px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  color: ${SWAN_CYAN};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: rgba(255, 255, 255, 0.1); }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const CurrentWeight = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const BigWeight = styled.div<{ $color?: string }>`
  font-size: 3rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#e2e8f0'};
  line-height: 1;
`;

const WeightUnit = styled.span`
  font-size: 1rem;
  color: #94a3b8;
  margin-left: 4px;
`;

const TrendBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}20;
  border: 1px solid ${({ $color }) => $color}50;
  margin-top: 8px;
`;

const WeightHistory = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const WeightChip = styled.div<{ $latest?: boolean }>`
  flex-shrink: 0;
  text-align: center;
  padding: 8px 14px;
  background: ${({ $latest }) => $latest ? 'rgba(0, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.95)'};
  border: 1px solid ${({ $latest }) => $latest ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 8px;
`;

const ChipWeight = styled.div`
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.9rem;
`;

const ChipDate = styled.div`
  color: #94a3b8;
  font-size: 0.7rem;
  margin-top: 2px;
`;

const FormSection = styled.div`
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 20px;
`;

const FormTitle = styled.h3`
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const FormRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
`;

const FormField = styled.div`
  flex: 1;
`;

const Label = styled.label`
  display: block;
  color: #94a3b8;
  font-size: 0.8rem;
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  box-sizing: border-box;
  &::placeholder { color: #94a3b8; }
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    background: rgba(255, 255, 255, 0.08);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  resize: vertical;
  box-sizing: border-box;
  &::placeholder { color: #94a3b8; }
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const PrimaryButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: ${({ $disabled }) => $disabled
    ? 'rgba(255, 255, 255, 0.1)'
    : 'linear-gradient(135deg, #00ffff, #00c8ff)'};
  color: ${({ $disabled }) => $disabled ? '#555' : '#0a0a1a'};
  font-weight: 600;
  font-size: 0.875rem;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }
`;

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 32px auto;
`;

const EmptyMsg = styled.div`
  text-align: center;
  color: #94a3b8;
  padding: 24px 0;
`;

/* ─── Types ──────────────────────────────────────────────── */

interface WeighIn {
  id: number;
  measurementDate: string;
  weight: number;
}

interface Props {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onUpdate?: () => void;
}

/* ─── Component ──────────────────────────────────────────── */

const ClientWeighInPanel: React.FC<Props> = ({ clientId, clientName, onClose, onUpdate }) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<WeighIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get(`/api/measurements/user/${clientId}`);
      const data = res.data?.data?.measurements || res.data?.measurements || res.data?.data || [];
      const arr = Array.isArray(data) ? data : [];
      // Filter to entries that have weight
      setHistory(arr.filter((m: any) => m.weight != null).map((m: any) => ({
        id: m.id,
        measurementDate: m.measurementDate,
        weight: m.weight,
      })));
    } catch (err: any) {
      console.error('Failed to fetch weigh-ins:', err);
      toast({ title: 'Error', description: 'Failed to load weigh-in history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId, toast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSubmit = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      toast({ title: 'Validation', description: 'Please enter a valid weight', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await authAxios.post('/api/measurements', {
        userId: clientId,
        measurementDate: date,
        weight: w,
        notes: notes || undefined,
      });
      toast({ title: 'Saved', description: `Weigh-in recorded: ${w} lbs` });
      setWeight('');
      setNotes('');
      fetchHistory();
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to save weigh-in:', err);
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save weigh-in', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const latest = history[0];
  const prev = history[1];
  const diff = latest && prev ? +(latest.weight - prev.weight).toFixed(1) : null;

  const trendColor = diff == null ? '#94a3b8' : diff < 0 ? '#22c55e' : diff > 0 ? '#ef4444' : '#eab308';
  const trendLabel = diff == null ? '' : diff < 0 ? `${diff} lbs` : diff > 0 ? `+${diff} lbs` : 'No change';
  const TrendIconComp = diff == null ? Minus : diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;

  const scheduleStatus = latest ? getCheckStatus(latest.measurementDate, 7) : null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Scale size={20} />
            Weigh-In — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose}><X size={20} /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <Spinner />
          ) : (
            <>
              {/* Current weight display */}
              <CurrentWeight>
                {latest ? (
                  <>
                    <BigWeight $color={scheduleStatus?.color}>
                      {latest.weight}<WeightUnit>lbs</WeightUnit>
                    </BigWeight>
                    {diff != null && (
                      <TrendBadge $color={trendColor}>
                        <TrendIconComp size={14} />
                        {trendLabel}
                      </TrendBadge>
                    )}
                  </>
                ) : (
                  <EmptyMsg>No weigh-ins recorded yet</EmptyMsg>
                )}
              </CurrentWeight>

              {/* Recent history chips */}
              {history.length > 0 && (
                <WeightHistory>
                  {history.slice(0, 8).map((w, i) => (
                    <WeightChip key={w.id} $latest={i === 0}>
                      <ChipWeight>{w.weight}</ChipWeight>
                      <ChipDate>{new Date(w.measurementDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</ChipDate>
                    </WeightChip>
                  ))}
                </WeightHistory>
              )}

              {/* Quick entry form */}
              <FormSection>
                <FormTitle>Quick Weigh-In</FormTitle>
                <FormRow>
                  <FormField>
                    <Label>Weight (lbs)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 185"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </FormField>
                  <FormField>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </FormField>
                </FormRow>
                <FormField>
                  <Label>Notes (optional)</Label>
                  <TextArea
                    placeholder="Morning weight, post-workout, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </FormSection>
            </>
          )}
        </ModalBody>

        <ActionBar>
          <PrimaryButton
            onClick={handleSubmit}
            disabled={saving || !weight}
            $disabled={saving || !weight}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Record Weigh-In'}
          </PrimaryButton>
        </ActionBar>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default ClientWeighInPanel;
