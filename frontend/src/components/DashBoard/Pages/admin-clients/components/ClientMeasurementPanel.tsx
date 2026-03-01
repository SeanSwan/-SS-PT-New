/**
 * ClientMeasurementPanel
 * ─────────────────────────────────────────────────────────────
 * Modal showing measurement history for a client with a link
 * to the full MeasurementEntry page.
 *
 * Phase 11C — Client Measurement Status
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Ruler, TrendingDown, TrendingUp, Minus, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { getMeasurementColor, getCheckStatus } from '../../../../../utils/measurementStatus';

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
  max-width: 720px;
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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const SummaryCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
`;

const SummaryLabel = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  margin-bottom: 4px;
`;

const SummaryValue = styled.div<{ $color?: string }>`
  color: ${({ $color }) => $color || '#e2e8f0'};
  font-size: 1.5rem;
  font-weight: 700;
`;

const TrendIcon = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
`;

const HistoryDate = styled.div`
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
`;

const HistoryMetrics = styled.div`
  display: flex;
  gap: 16px;
  color: #94a3b8;
  font-size: 0.8rem;
`;

const MetricChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const StatusDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => $color}80;
`;

const EmptyMsg = styled.div`
  text-align: center;
  color: #94a3b8;
  padding: 32px 0;
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

const ActionBar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  color: #0a0a1a;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }
`;

/* ─── Types ──────────────────────────────────────────────── */

interface Measurement {
  id: number;
  measurementDate: string;
  weight?: number;
  bodyFatPercentage?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  notes?: string;
}

interface Props {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onUpdate?: () => void;
}

/* ─── Component ──────────────────────────────────────────── */

const ClientMeasurementPanel: React.FC<Props> = ({ clientId, clientName, onClose, onUpdate }) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get(`/api/measurements/user/${clientId}`);
      const data = res.data?.data?.measurements || res.data?.measurements || res.data?.data || [];
      setMeasurements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch measurements:', err);
      toast({ title: 'Error', description: 'Failed to load measurements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId, toast]);

  useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

  const latest = measurements[0];

  const getTrend = (field: keyof Measurement) => {
    if (measurements.length < 2) return null;
    const curr = measurements[0]?.[field] as number | undefined;
    const prev = measurements[1]?.[field] as number | undefined;
    if (curr == null || prev == null) return null;
    if (curr < prev) return 'down';
    if (curr > prev) return 'up';
    return 'stable';
  };

  const TrendArrow = ({ field }: { field: keyof Measurement }) => {
    const trend = getTrend(field);
    if (!trend) return null;
    if (trend === 'down') return <TrendIcon $color="#22c55e"><TrendingDown size={14} /></TrendIcon>;
    if (trend === 'up') return <TrendIcon $color="#ef4444"><TrendingUp size={14} /></TrendIcon>;
    return <TrendIcon $color="#eab308"><Minus size={14} /></TrendIcon>;
  };

  const scheduleStatus = latest
    ? getCheckStatus(latest.measurementDate, 30)
    : null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Ruler size={20} />
            Measurements — {clientName}
            {scheduleStatus && (
              <StatusDot $color={scheduleStatus.color} title={`${scheduleStatus.daysRemaining} days remaining`} />
            )}
          </ModalTitle>
          <CloseButton onClick={onClose}><X size={20} /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <Spinner />
          ) : measurements.length === 0 ? (
            <EmptyMsg>No measurements recorded yet.</EmptyMsg>
          ) : (
            <>
              {/* Summary cards */}
              <SummaryGrid>
                <SummaryCard>
                  <SummaryLabel>Weight</SummaryLabel>
                  <SummaryValue>
                    {latest?.weight ?? '—'}
                    {latest?.weight && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}> lbs</span>}
                    <TrendArrow field="weight" />
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Body Fat</SummaryLabel>
                  <SummaryValue>
                    {latest?.bodyFatPercentage != null ? `${latest.bodyFatPercentage}%` : '—'}
                    <TrendArrow field="bodyFatPercentage" />
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Waist</SummaryLabel>
                  <SummaryValue>
                    {latest?.waist != null ? `${latest.waist}"` : '—'}
                    <TrendArrow field="waist" />
                  </SummaryValue>
                </SummaryCard>
                <SummaryCard>
                  <SummaryLabel>Next Due</SummaryLabel>
                  <SummaryValue $color={scheduleStatus?.color}>
                    {scheduleStatus?.daysRemaining != null
                      ? `${scheduleStatus.daysRemaining}d`
                      : '—'}
                  </SummaryValue>
                </SummaryCard>
              </SummaryGrid>

              {/* History list */}
              <HistoryList>
                {measurements.map((m) => (
                  <HistoryItem key={m.id}>
                    <HistoryDate>
                      {new Date(m.measurementDate).toLocaleDateString()}
                    </HistoryDate>
                    <HistoryMetrics>
                      {m.weight != null && <MetricChip>{m.weight} lbs</MetricChip>}
                      {m.bodyFatPercentage != null && <MetricChip>{m.bodyFatPercentage}%</MetricChip>}
                      {m.waist != null && <MetricChip>W: {m.waist}"</MetricChip>}
                      {m.chest != null && <MetricChip>C: {m.chest}"</MetricChip>}
                      {m.hips != null && <MetricChip>H: {m.hips}"</MetricChip>}
                    </HistoryMetrics>
                  </HistoryItem>
                ))}
              </HistoryList>
            </>
          )}
        </ModalBody>

        <ActionBar>
          <PrimaryButton onClick={() => {
            window.location.hash = '#/admin-dashboard/MeasurementEntry';
            onClose();
          }}>
            <ExternalLink size={16} />
            New Full Measurement
          </PrimaryButton>
        </ActionBar>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default ClientMeasurementPanel;
