/**
 * InlineOnboardingTab
 * ===================
 * Inline (non-modal) wrapper around ClientOnboardingWizard for use
 * as a tab panel inside the admin client management view.
 *
 * Reuses the same draft-save / status-load logic as AdminOnboardingPanel
 * but renders inline without a fixed overlay.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import ClientOnboardingWizard from '../../../../../pages/onboarding/ClientOnboardingWizard';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';

/* ─────────────────────── Animations ─────────────────────── */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─────────────────────── Styled Components ─────────────────────── */

const TabContainer = styled.div`
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.15);
`;

const StatusLabel = styled.span`
  color: #e2e8f0;
  font-size: 0.95rem;
  font-weight: 600;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${(props) => {
    switch (props.$status) {
      case 'completed': return 'rgba(34, 197, 94, 0.15)';
      case 'in_progress': return 'rgba(245, 158, 11, 0.15)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case 'completed': return '#22c55e';
      case 'in_progress': return '#f59e0b';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${(props) => {
    switch (props.$status) {
      case 'completed': return 'rgba(34, 197, 94, 0.3)';
      case 'in_progress': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(255, 255, 255, 0.15)';
    }
  }};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  color: #94a3b8;
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
  color: #8B5CF6;
`;

const CompletedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1.5rem;
  text-align: center;
`;

const CompletedText = styled.p`
  color: #e2e8f0;
  font-size: 1.1rem;
  margin: 0;
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;

  border: 1px solid ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 100, 100, 0.4)' : 'rgba(139, 92, 246, 0.3)'};
  background: ${({ $variant }) =>
    $variant === 'danger' ? 'rgba(255, 50, 50, 0.1)' : 'rgba(139, 92, 246, 0.08)'};
  color: ${({ $variant }) =>
    $variant === 'danger' ? '#ff6b6b' : '#8B5CF6'};

  &:hover {
    border-color: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(255, 100, 100, 0.6)' : '#8B5CF6'};
    background: ${({ $variant }) =>
      $variant === 'danger' ? 'rgba(255, 50, 50, 0.2)' : 'rgba(139, 92, 246, 0.15)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  gap: 1rem;
  text-align: center;
`;

/* ─────────────────────── Component ─────────────────────── */

interface InlineOnboardingTabProps {
  clientId: number;
  clientName: string;
  onComplete?: () => void;
}

type PanelState =
  | { type: 'loading' }
  | { type: 'fresh' }
  | { type: 'draft'; data: Record<string, any> }
  | { type: 'completed' }
  | { type: 'error'; message: string };

const InlineOnboardingTab: React.FC<InlineOnboardingTabProps> = ({
  clientId,
  clientName,
  onComplete,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const adminClientService = createAdminClientService(authAxios);
  const [panelState, setPanelState] = useState<PanelState>({ type: 'loading' });
  const [resetting, setResetting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveDisabledRef = useRef(false);

  const cancelPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setPanelState({ type: 'loading' });
    try {
      const result = await adminClientService.getOnboardingStatus(clientId);
      if (result.status === 'not_found') {
        setPanelState({ type: 'fresh' });
      } else if (result.questionnaire?.status === 'completed') {
        setPanelState({ type: 'completed' });
      } else if (result.questionnaire?.status === 'in_progress') {
        setPanelState({ type: 'draft', data: result.questionnaire.responsesJson || {} });
      } else {
        setPanelState({ type: 'fresh' });
      }
    } catch (err: any) {
      setPanelState({ type: 'error', message: err.message || 'Failed to load onboarding status' });
    }
  }, [clientId]);

  useEffect(() => {
    loadStatus();
    return () => cancelPendingSave();
  }, [loadStatus, cancelPendingSave]);

  const saveDraft = useCallback((formData: any) => {
    if (autosaveDisabledRef.current) return;
    cancelPendingSave();
    saveTimerRef.current = setTimeout(async () => {
      if (autosaveDisabledRef.current) return;
      try {
        await adminClientService.saveOnboardingDraft(clientId, formData);
      } catch {
        // Silent fail — draft save is best-effort
      }
    }, 500);
  }, [clientId, cancelPendingSave]);

  const handleStepChange = useCallback((_stepIndex: number, formData: any) => {
    saveDraft(formData);
  }, [saveDraft]);

  const handleFormDataChange = useCallback((formData: any) => {
    saveDraft(formData);
  }, [saveDraft]);

  const handleAdminSubmit = async (formData: any) => {
    cancelPendingSave();
    autosaveDisabledRef.current = true;
    try {
      const response = await adminClientService.submitOnboarding(clientId, formData);
      return { success: response.success, data: response };
    } catch (err: any) {
      return { success: false, error: err.message || 'Submission failed' };
    } finally {
      autosaveDisabledRef.current = false;
    }
  };

  const handleComplete = (data: any) => {
    toast({
      title: 'Onboarding Complete',
      description: `${clientName}'s onboarding submitted. Spirit name: ${data?.spiritName || 'assigned'}.`,
      variant: 'success' as any,
    });
    setPanelState({ type: 'completed' });
    onComplete?.();
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset ${clientName}'s onboarding? This will delete all saved progress.`)) return;
    cancelPendingSave();
    autosaveDisabledRef.current = true;
    setResetting(true);
    try {
      await adminClientService.resetOnboarding(clientId);
      toast({
        title: 'Onboarding Reset',
        description: `${clientName}'s onboarding has been reset.`,
        variant: 'default',
      });
      await loadStatus();
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message || 'Failed to reset onboarding',
        variant: 'destructive',
      });
    } finally {
      autosaveDisabledRef.current = false;
      setResetting(false);
    }
  };

  const getStatusLabel = () => {
    switch (panelState.type) {
      case 'completed': return 'completed';
      case 'draft': return 'in_progress';
      default: return 'not_started';
    }
  };

  return (
    <TabContainer data-testid="inline-onboarding-tab">
      <StatusRow>
        <StatusLabel>Onboarding — {clientName}</StatusLabel>
        <StatusBadge $status={getStatusLabel()}>
          {panelState.type === 'completed' && <CheckCircle size={14} />}
          {getStatusLabel().replace('_', ' ')}
        </StatusBadge>
      </StatusRow>

      {panelState.type === 'loading' && (
        <LoadingContainer>
          <Spinner size={32} />
          <span>Loading onboarding status...</span>
        </LoadingContainer>
      )}

      {panelState.type === 'error' && (
        <ErrorContainer>
          <AlertTriangle size={40} color="#ff6b6b" />
          <p style={{ color: '#ff6b6b', margin: 0 }}>{panelState.message}</p>
          <ActionButton onClick={loadStatus}>
            <RefreshCw size={16} />
            Retry
          </ActionButton>
        </ErrorContainer>
      )}

      {panelState.type === 'completed' && (
        <CompletedContainer>
          <CheckCircle size={48} color="#22c55e" />
          <CompletedText>{clientName}'s onboarding is complete.</CompletedText>
          <ActionButton $variant="danger" onClick={handleReset} disabled={resetting}>
            <RefreshCw size={16} />
            {resetting ? 'Resetting...' : 'Reset Onboarding'}
          </ActionButton>
        </CompletedContainer>
      )}

      {(panelState.type === 'fresh' || panelState.type === 'draft') && (
        <ClientOnboardingWizard
          embedded
          onSubmit={handleAdminSubmit}
          onComplete={handleComplete}
          skipSuccessModal
          initialData={panelState.type === 'draft' ? panelState.data : undefined}
          onStepChange={handleStepChange}
          onFormDataChange={handleFormDataChange}
        />
      )}
    </TabContainer>
  );
};

export default InlineOnboardingTab;
