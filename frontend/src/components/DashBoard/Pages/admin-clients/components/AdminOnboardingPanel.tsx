/**
 * AdminOnboardingPanel
 * ====================
 * Admin wrapper around ClientOnboardingWizard for onboarding clients.
 * Loads existing draft/status, provides autosave via callbacks, and
 * shows admin-specific feedback (no client credentials modal).
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import ClientOnboardingWizard from '../../../../../pages/onboarding/ClientOnboardingWizard';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';

/* ─────────────────────── Theme Tokens ─────────────────────── */

const SWAN_CYAN = '#00FFFF';
const COSMIC_PURPLE = '#7851A9';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─────────────────────── Styled Components ─────────────────────── */

const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const PanelContainer = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 960px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

const PanelTitle = styled.h2`
  color: ${SWAN_CYAN};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const PanelBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
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
      case 'completed': return 'rgba(0, 255, 128, 0.15)';
      case 'in_progress': return 'rgba(255, 200, 0, 0.15)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  }};
  color: ${(props) => {
    switch (props.$status) {
      case 'completed': return '#00ff80';
      case 'in_progress': return '#ffc800';
      default: return '#94a3b8';
    }
  }};
  border: 1px solid ${(props) => {
    switch (props.$status) {
      case 'completed': return 'rgba(0, 255, 128, 0.3)';
      case 'in_progress': return 'rgba(255, 200, 0, 0.3)';
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
  color: ${SWAN_CYAN};
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

const CompletedIcon = styled(CheckCircle)`
  color: #00ff80;
`;

const CompletedText = styled.p`
  color: #e2e8f0;
  font-size: 1.1rem;
  margin: 0;
`;

const ResetButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid rgba(255, 100, 100, 0.4);
  background: rgba(255, 50, 50, 0.1);
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 50, 50, 0.2);
    border-color: rgba(255, 100, 100, 0.6);
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

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.08);
  color: ${SWAN_CYAN};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
    border-color: ${SWAN_CYAN};
  }
`;

/* ─────────────────────── Component ─────────────────────── */

interface AdminOnboardingPanelProps {
  clientId: number;
  clientName: string;
  onClose: () => void;
  onComplete?: () => void;
}

type PanelState =
  | { type: 'loading' }
  | { type: 'fresh' }
  | { type: 'draft'; data: Record<string, any> }
  | { type: 'completed' }
  | { type: 'error'; message: string };

const AdminOnboardingPanel: React.FC<AdminOnboardingPanelProps> = ({
  clientId,
  clientName,
  onClose,
  onComplete,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const adminClientService = createAdminClientService(authAxios);
  const [panelState, setPanelState] = useState<PanelState>({ type: 'loading' });
  const [resetting, setResetting] = useState(false);

  // Debounced draft save ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveDisabledRef = useRef(false);

  // Cancel any pending draft save timer
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

  // Debounced draft save — skipped while submitting/resetting
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
    // Cancel any pending draft save and disable autosave during submit
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
      variant: 'success',
    });
    onComplete?.();
    onClose();
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
    <PanelOverlay onClick={onClose}>
      <PanelContainer
        data-testid="admin-onboarding-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <PanelHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PanelTitle>Onboarding — {clientName}</PanelTitle>
            <StatusBadge
              $status={getStatusLabel()}
              data-testid="onboarding-status-badge"
            >
              {panelState.type === 'completed' && <CheckCircle size={14} />}
              {getStatusLabel().replace('_', ' ')}
            </StatusBadge>
          </div>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </PanelHeader>

        <PanelBody>
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
              <RetryButton onClick={loadStatus}>
                <RefreshCw size={16} />
                Retry
              </RetryButton>
            </ErrorContainer>
          )}

          {panelState.type === 'completed' && (
            <CompletedContainer>
              <CompletedIcon size={48} />
              <CompletedText>{clientName}'s onboarding is complete.</CompletedText>
              <ResetButton onClick={handleReset} disabled={resetting}>
                <RefreshCw size={16} />
                {resetting ? 'Resetting...' : 'Reset Onboarding'}
              </ResetButton>
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
              onCancel={onClose}
            />
          )}
        </PanelBody>
      </PanelContainer>
    </PanelOverlay>
  );
};

export default AdminOnboardingPanel;
