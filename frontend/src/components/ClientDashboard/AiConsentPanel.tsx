/**
 * AiConsentPanel.tsx
 * ===================
 * Embeddable AI privacy consent management panel for the active client dashboard.
 * Designed to live inside AccountGalaxy (GalaxySections.tsx).
 *
 * Uses the same Galaxy-Swan styling patterns as other GalaxySections components.
 * Wired to backend /api/ai/consent/* via apiService.
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ShieldOff, Brain, Lock, Eye,
  AlertTriangle, CheckCircle, RefreshCw,
} from 'lucide-react';
import {
  getConsentStatus,
  grantConsent,
  withdrawConsent,
  type ConsentStatusResponse,
} from '../../services/aiConsentService';

// ── Styled Components (Galaxy-Swan patterns from GalaxySections) ─────────────

const PanelCard = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 12px 35px rgba(0, 255, 255, 0.1);
  }
`;

const PanelTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const StatusBadge = styled.span<{ $status: 'granted' | 'withdrawn' | 'none' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${({ $status }) => {
    switch ($status) {
      case 'granted': return 'rgba(0, 255, 255, 0.12)';
      case 'withdrawn': return 'rgba(239, 68, 68, 0.12)';
      default: return 'rgba(255, 255, 255, 0.06)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'granted': return '#00ffff';
      case 'withdrawn': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  }};
  border: 1px solid ${({ $status }) => {
    switch ($status) {
      case 'granted': return 'rgba(0, 255, 255, 0.3)';
      case 'withdrawn': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

const MetaRow = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const InfoIcon = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ $color }) => $color || '#10b981'};
`;

const ConsentDisclosure = styled.div`
  background: rgba(0, 255, 255, 0.04);
  border: 1px solid rgba(0, 255, 255, 0.12);
  border-radius: 10px;
  padding: 1rem;
  margin: 0.75rem 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant: 'grant' | 'withdraw' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  font-family: inherit;

  ${({ $variant }) => {
    switch ($variant) {
      case 'grant': return `
        background: linear-gradient(135deg, rgba(0, 204, 204, 0.9), rgba(0, 255, 255, 0.8));
        color: #0a0a1a;
        border-color: rgba(0, 255, 255, 0.5);
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
        &:hover:not(:disabled) { box-shadow: 0 0 25px rgba(0, 255, 255, 0.4); transform: translateY(-1px); }
      `;
      case 'withdraw': return `
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
        &:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.5); }
      `;
      default: return `
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.7);
        border-color: rgba(255, 255, 255, 0.1);
        &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #fff; }
      `;
    }
  }}

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.4); }
`;

const WithdrawWarning = styled.div`
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  padding: 0.875rem 1rem;
  margin-top: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  gap: 0.5rem;
`;

const Spinner = styled(motion.div)`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 255, 0.15);
  border-top-color: #00ffff;
  border-radius: 50%;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: #ef4444;
  margin-bottom: 0.75rem;
`;

const SuccessToast = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: #10b981;
  margin-bottom: 0.75rem;
`;

const ReconsentBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

// ── Component ───────────────────────────────────────────────────────────────

type ConsentState = 'granted' | 'withdrawn' | 'none';

const AiConsentPanel: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConsentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConsentStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load consent status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGrant = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await grantConsent();
      await fetchStatus();
      showToast('AI consent granted.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to grant consent.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await withdrawConsent();
      await fetchStatus();
      setConfirmWithdraw(false);
      showToast('AI consent withdrawn.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to withdraw consent.');
    } finally {
      setActionLoading(false);
    }
  };

  const getConsentState = (): ConsentState => {
    if (!status || !status.profile) return 'none';
    if (status.consentGranted) return 'granted';
    return 'withdrawn';
  };

  const consentState = getConsentState();

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <PanelCard
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PanelTitle>
        <Shield size={22} color="#00ffff" />
        AI Privacy & Consent
      </PanelTitle>

      {/* Loading */}
      {loading && (
        <LoadingBox>
          <Spinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          Loading...
        </LoadingBox>
      )}

      {/* Error */}
      {error && (
        <ErrorBox>
          <AlertTriangle size={16} />
          {error}
          {!status && (
            <ActionButton $variant="neutral" onClick={fetchStatus} style={{ marginLeft: 'auto', minHeight: 32, padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
              <RefreshCw size={14} /> Retry
            </ActionButton>
          )}
        </ErrorBox>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <SuccessToast
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <CheckCircle size={16} /> {toast}
          </SuccessToast>
        )}
      </AnimatePresence>

      {!loading && (
        <>
          {/* Status */}
          <StatusRow>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Status</span>
            <StatusBadge $status={consentState}>
              {consentState === 'granted' && <><ShieldCheck size={12} /> Active</>}
              {consentState === 'withdrawn' && <><ShieldOff size={12} /> Withdrawn</>}
              {consentState === 'none' && <><Shield size={12} /> Not Set</>}
            </StatusBadge>
          </StatusRow>

          {/* 5W-F: Re-consent prompt when waiver is outdated */}
          {status?.waiverEligibility?.requiresReconsent && (
            <ReconsentBanner>
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: '#f59e0b' }}>Waiver update required</strong> — The terms of your
                AI consent waiver have been updated. Please sign the updated waiver to continue
                using AI-powered features without interruption.
                <ButtonRow style={{ marginTop: '0.75rem' }}>
                  <ActionButton $variant="grant" onClick={() => navigate('/waiver')}>
                    Sign Updated Waiver
                  </ActionButton>
                </ButtonRow>
              </div>
            </ReconsentBanner>
          )}

          {/* Meta info */}
          {status?.profile && (
            <MetaRow>
              <MetaItem>v{status.profile.consentVersion}</MetaItem>
              {status.profile.consentedAt && (
                <MetaItem>Granted {formatDate(status.profile.consentedAt)}</MetaItem>
              )}
              {status.profile.withdrawnAt && (
                <MetaItem style={{ color: '#ef4444' }}>Withdrawn {formatDate(status.profile.withdrawnAt)}</MetaItem>
              )}
            </MetaRow>
          )}

          {/* Privacy protections (collapsed) */}
          <InfoList>
            <InfoItem>
              <InfoIcon><ShieldCheck size={14} /></InfoIcon>
              <span><strong>De-identified data only</strong> — name, email, phone stripped before reaching AI</span>
            </InfoItem>
            <InfoItem>
              <InfoIcon><Eye size={14} /></InfoIcon>
              <span><strong>Training data only</strong> — medications, surgeries, occupation never sent</span>
            </InfoItem>
            <InfoItem>
              <InfoIcon><Lock size={14} /></InfoIcon>
              <span><strong>Spirit name used</strong> — the AI only knows your SwanStudios alias</span>
            </InfoItem>
          </InfoList>

          {/* Disclosure */}
          <ConsentDisclosure>
            <strong style={{ color: '#00ffff' }}>Consent Disclosure (v1.0)</strong> — By granting consent, SwanStudios
            may process your de-identified fitness profile through an AI provider to generate personalized workout plans.
            Personal identifiers are never shared. You may withdraw consent at any time.
          </ConsentDisclosure>

          {/* Actions */}
          <ButtonRow>
            {(consentState === 'none' || consentState === 'withdrawn') && (
              <ActionButton $variant="grant" onClick={handleGrant} disabled={actionLoading}>
                {actionLoading ? <><RefreshCw size={16} /> Processing...</> : <><ShieldCheck size={16} /> Grant AI Consent</>}
              </ActionButton>
            )}
            {consentState === 'granted' && !confirmWithdraw && (
              <ActionButton $variant="withdraw" onClick={() => setConfirmWithdraw(true)} disabled={actionLoading}>
                <ShieldOff size={16} /> Withdraw Consent
              </ActionButton>
            )}
          </ButtonRow>

          {/* Withdraw confirmation */}
          <AnimatePresence>
            {confirmWithdraw && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <WithdrawWarning>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Are you sure?</strong> AI workout features will be disabled immediately.
                    Existing plans remain, but no new AI plans can be generated.
                    <ButtonRow style={{ marginTop: '0.75rem' }}>
                      <ActionButton $variant="withdraw" onClick={handleWithdraw} disabled={actionLoading}>
                        {actionLoading ? 'Processing...' : 'Yes, Withdraw'}
                      </ActionButton>
                      <ActionButton $variant="neutral" onClick={() => setConfirmWithdraw(false)}>
                        Cancel
                      </ActionButton>
                    </ButtonRow>
                  </div>
                </WithdrawWarning>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Withdrawn state info */}
          {consentState === 'withdrawn' && (
            <InfoList style={{ marginTop: '0.75rem' }}>
              <InfoItem>
                <InfoIcon $color="#f59e0b"><AlertTriangle size={14} /></InfoIcon>
                <span>AI features are <strong>disabled</strong>. Manual templates and trainer-assigned plans still work. Re-enable anytime above.</span>
              </InfoItem>
            </InfoList>
          )}

          {consentState === 'none' && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              You haven't opted in to AI features yet. Grant consent above to enable AI-powered workouts.
            </div>
          )}
        </>
      )}
    </PanelCard>
  );
};

export default AiConsentPanel;
