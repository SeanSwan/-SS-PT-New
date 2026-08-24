/**
 * AiConsentScreen.tsx
 * ====================
 * Client-facing AI privacy consent management screen.
 * Allows clients to grant, view, or withdraw AI consent.
 *
 * Follows Crystalline Swan design system (styled-components, 44px touch targets).
 * Wired to backend /api/ai/consent/* endpoints.
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldOff, Brain, Lock, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import {
  AI_CONSENT_DISCLOSURE,
  AI_CONSENT_RECONSENT_PROMPT,
  AI_CONSENT_VERSION,
} from '../../../../content/aiConsentCopy';
import {
  getConsentStatus,
  grantConsent,
  withdrawConsent,
  type ConsentStatusResponse,
} from '../../../../services/aiConsentService';

const ReconsentNotice = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--warning-border, rgba(198, 168, 75, 0.4));
  background: var(--warning-surface, rgba(198, 168, 75, 0.1));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9375rem;
  line-height: 1.55;

  svg { color: var(--warning-accent, #C6A84B); flex-shrink: 0; margin-top: 2px; }
`;

// ── Animations ──────────────────────────────────────────────────────────────

const coachPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.15); }
  50% { box-shadow: 0 0 35px rgba(139, 92, 246, 0.3); }
`;

// ── Styled Components ───────────────────────────────────────────────────────

const PageContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const PageSubtitle = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  line-height: 1.5;
`;

const Card = styled.div`
  background: rgba(29, 31, 43, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(12px);
`;

const InlineErrorCard = styled(Card)`
  border-color: rgba(239, 68, 68, 0.3);
  margin-bottom: 1rem;
`;

const InlineErrorMessage = styled.div`
  color: var(--error-accent, #ef4444);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
`;

const StatusCard = styled(Card)<{ $status: 'granted' | 'withdrawn' | 'none' }>`
  border-color: ${({ $status }) => {
    switch ($status) {
      case 'granted': return 'rgba(139, 92, 246, 0.25)';
      case 'withdrawn': return 'rgba(239, 68, 68, 0.25)';
      default: return 'rgba(255, 255, 255, 0.08)';
    }
  }};
  animation: ${coachPulse} 4s ease-in-out infinite;
`;

const StatusBadge = styled.div<{ $status: 'granted' | 'withdrawn' | 'none' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: ${({ $status }) => {
    switch ($status) {
      case 'granted': return 'rgba(139, 92, 246, 0.12)';
      case 'withdrawn': return 'rgba(239, 68, 68, 0.12)';
      default: return 'rgba(255, 255, 255, 0.06)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'granted': return '#60C0F0';
      case 'withdrawn': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  }};
  border: 1px solid ${({ $status }) => {
    switch ($status) {
      case 'granted': return 'rgba(139, 92, 246, 0.3)';
      case 'withdrawn': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const StatusLabel = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 1rem;

  @media (min-width: 480px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetaLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetaValue = styled.span`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.85);
`;

const DangerMetaValue = styled(MetaValue)`
  color: var(--error-accent, #ef4444);
`;

const MutedConsentNote = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PrivacyList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PrivacyItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
`;

const PrivacyIcon = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ $color }) => $color || '#60C0F0'};
`;

const WithdrawWarningIcon = styled(AlertTriangle)`
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--error-accent, #ef4444);
`;

const ConsentDisclosure = styled.div`
  background: rgba(139, 92, 246, 0.04);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  margin: 1.25rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.65;
`;

const ConsentDisclosureTitle = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #60C0F0;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const ConfirmButtonRow = styled(ButtonRow)`
  margin-top: 1rem;
`;

const ConsentButton = styled.button<{ $variant: 'grant' | 'withdraw' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  min-width: 44px;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.25s ease;
  font-family: inherit;

  ${({ $variant }) => $variant === 'grant' ? `
    background: linear-gradient(135deg, rgba(96, 192, 240, 0.9), rgba(139, 92, 246, 0.8));
    color: var(--bg-base, #030712);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);

    &:hover:not(:disabled) {
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
      transform: translateY(-1px);
    }
  ` : `
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    border-color: rgba(239, 68, 68, 0.3);

    &:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4);
  }
`;

const WithdrawWarning = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9375rem;
`;

const Spinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(139, 92, 246, 0.15);
  border-top-color: #60C0F0;
  border-radius: 50%;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 1rem;
  color: #ef4444;
  text-align: center;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4);
  }
`;

const SuccessToast = styled(motion.div)`
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(16, 185, 129, 0.95);
  border-radius: 12px;
  color: var(--bg-base, #030712);
  font-size: 0.9375rem;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 9999;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 1.5rem 0;
`;

// ── Component ───────────────────────────────────────────────────────────────

type ConsentState = 'granted' | 'withdrawn' | 'none';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    return typeof message === 'string' && message.length > 0 ? message : fallback;
  }
  return fallback;
};

const getErrorStatus = (err: unknown): number | undefined => {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
};

const AiConsentScreen: React.FC = () => {
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load consent status.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGrant = async () => {
    try {
      setActionLoading(true);
      setError(null);
      // Record the version of the disclosure the user actually read. Without
      // this the backend defaults to its own CURRENT, so a grant against the
      // corrected v2.0 text would have been stored indistinguishably from a
      // v1.0 grant -- defeating the point of correcting the copy.
      await grantConsent(AI_CONSENT_VERSION);
      await fetchStatus();
      showToast('Swan Coach consent granted successfully.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to grant consent.'));
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
      showToast('Swan Coach consent withdrawn. Swan Coach features are now disabled.');
    } catch (err: unknown) {
      if (getErrorStatus(err) === 404) {
        setError('No consent record found to withdraw.');
      } else {
        setError(getErrorMessage(err, 'Failed to withdraw consent.'));
      }
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

  // Owner decision Q5: v1.0 consents were captured under a description that
  // overstated anonymity, so they are re-prompted rather than silently carried
  // forward. Detection is a version comparison against the stored grant.
  // A missing stored version must COUNT as stale, not skip the prompt. The first
  // cut required a truthy consentVersion, which meant legacy records with a null
  // version — the ones most likely to predate the corrected disclosure — silently
  // skipped re-consent. Fail-open on precisely the wrong population (ox-alpha,
  // post-ship panel).
  // Arriving via the interceptor redirect means an AI call was just refused.
  // Show the notice even before the status fetch resolves, so the screen never
  // renders as if nothing happened.
  const arrivedForReconsent =
    typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('reconsent') === '1';

  const needsReconsent =
    consentState === 'granted'
    && (status?.profile?.consentVersion ?? null) !== AI_CONSENT_VERSION;

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ── Loading State ──
  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          Loading consent status...
        </LoadingContainer>
      </PageContainer>
    );
  }

  // ── Error State (full page) ──
  if (error && !status) {
    return (
      <PageContainer>
        <ErrorContainer>
          <AlertTriangle size={36} />
          <div>{error}</div>
          <RetryButton onClick={fetchStatus}>
            <RefreshCw size={16} /> Retry
          </RetryButton>
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <SuccessToast
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CheckCircle size={20} />
            {toast}
          </SuccessToast>
        )}
      </AnimatePresence>

      {/* Header */}
      <PageHeader>
        <PageTitle>
          <Shield size={28} color="#60C0F0" />
          Swan Coach Privacy & Consent
        </PageTitle>
        <PageSubtitle>
          Manage how your data is used with Swan Coach workout features.
          Your privacy is our priority.
        </PageSubtitle>
      </PageHeader>

      {/* Inline error */}
      {error && status && (
        <InlineErrorCard>
          <InlineErrorMessage>
            <AlertTriangle size={18} />
            {error}
          </InlineErrorMessage>
        </InlineErrorCard>
      )}

      {/* Current Status Card */}
      <StatusCard $status={consentState}>
        <StatusRow>
          <StatusLabel>Current Swan Coach Consent Status</StatusLabel>
          <StatusBadge $status={consentState}>
            {consentState === 'granted' && <><ShieldCheck size={14} /> Active</>}
            {consentState === 'withdrawn' && <><ShieldOff size={14} /> Withdrawn</>}
            {consentState === 'none' && <><Shield size={14} /> Not Set</>}
          </StatusBadge>
        </StatusRow>

        {(needsReconsent || arrivedForReconsent) && (
          <ReconsentNotice role="status">
            <AlertTriangle size={18} />
            <div>{AI_CONSENT_RECONSENT_PROMPT}</div>
          </ReconsentNotice>
        )}

        {status?.profile && (
          <MetaGrid>
            <MetaItem>
              <MetaLabel>Consent Version</MetaLabel>
              <MetaValue>v{status.profile.consentVersion}</MetaValue>
            </MetaItem>
            {status.profile.consentedAt && (
              <MetaItem>
                <MetaLabel>Granted On</MetaLabel>
                <MetaValue>{formatDate(status.profile.consentedAt)}</MetaValue>
              </MetaItem>
            )}
            {status.profile.withdrawnAt && (
              <MetaItem>
                <MetaLabel>Withdrawn On</MetaLabel>
                <DangerMetaValue>{formatDate(status.profile.withdrawnAt)}</DangerMetaValue>
              </MetaItem>
            )}
          </MetaGrid>
        )}

        {consentState === 'none' && (
          <MutedConsentNote>
            You have not yet opted in to Swan Coach features. Review the information below and grant consent to get started.
          </MutedConsentNote>
        )}
      </StatusCard>

      {/* What AI Features Do */}
      <Card>
        <SectionTitle>
          <Brain size={20} color="#60C0F0" />
          What Swan Coach Features Provide
        </SectionTitle>
        <PrivacyList>
          <PrivacyItem>
            <PrivacyIcon><CheckCircle size={18} /></PrivacyIcon>
            <div><strong>Personalized workout plans</strong> generated using your fitness profile, goals, and training preferences — powered by the NASM Optimum Performance Training model.</div>
          </PrivacyItem>
          <PrivacyItem>
            <PrivacyIcon><CheckCircle size={18} /></PrivacyIcon>
            <div><strong>Adaptive programming</strong> that accounts for your injury history, movement limitations, and current fitness level to keep workouts safe and effective.</div>
          </PrivacyItem>
          <PrivacyItem>
            <PrivacyIcon><CheckCircle size={18} /></PrivacyIcon>
            <div><strong>Progress-based adjustments</strong> as your baseline measurements and workout history evolve over time.</div>
          </PrivacyItem>
        </PrivacyList>
      </Card>

      {/* Privacy Protections */}
      <Card>
        <SectionTitle>
          <Lock size={20} color="#60C0F0" />
          Your Privacy Protections
        </SectionTitle>
        <PrivacyList>
          <PrivacyItem>
            <PrivacyIcon $color="#10b981"><ShieldCheck size={18} /></PrivacyIcon>
            <div><strong>De-identified data only.</strong> Your name, email, phone number, and other personal identifiers are stripped before anything reaches the Swan Coach provider.</div>
          </PrivacyItem>
          <PrivacyItem>
            <PrivacyIcon $color="#10b981"><Eye size={18} /></PrivacyIcon>
            <div><strong>What is shared.</strong> Training-relevant information only — goals, fitness level, measurements, training history, exercise preferences, injury and pain history, and medical conditions that affect exercise, so Swan Coach can avoid programming that could hurt you. Medications, surgeries, occupation, date of birth, insurance details, supplements, sleep, and stress data are never sent.</div>
          </PrivacyItem>
          <PrivacyItem>
            <PrivacyIcon $color="#10b981"><Lock size={18} /></PrivacyIcon>
            <div><strong>Full audit trail.</strong> Every Swan Coach interaction is logged with a cryptographic hash — never your raw data. You can withdraw consent at any time.</div>
          </PrivacyItem>
          <PrivacyItem>
            <PrivacyIcon $color="#10b981"><ShieldCheck size={18} /></PrivacyIcon>
            <div><strong>Pseudonymized, not anonymous.</strong> Swan Coach knows you by a stable client ID rather than your name. Because that ID stays the same across sessions, this is de-identification — not full anonymity.</div>
          </PrivacyItem>
        </PrivacyList>
      </Card>

      {/* Consent Disclosure */}
      <ConsentDisclosure>
        <ConsentDisclosureTitle>
          <Shield size={18} />
          Consent Disclosure (v{AI_CONSENT_VERSION})
        </ConsentDisclosureTitle>
        {AI_CONSENT_DISCLOSURE}
      </ConsentDisclosure>

      {/* Action Buttons */}
      <ButtonRow>
        {(consentState === 'none' || consentState === 'withdrawn') && (
          <ConsentButton
            $variant="grant"
            onClick={handleGrant}
            disabled={actionLoading}
            aria-label="Grant Swan Coach consent"
          >
            {actionLoading ? (
              <><RefreshCw size={18} /> Processing...</>
            ) : (
              <><ShieldCheck size={18} /> Grant Swan Coach Consent</>
            )}
          </ConsentButton>
        )}

        {consentState === 'granted' && !confirmWithdraw && (
          <ConsentButton
            $variant="withdraw"
            onClick={() => setConfirmWithdraw(true)}
            disabled={actionLoading}
            aria-label="Withdraw Swan Coach consent"
          >
            <ShieldOff size={18} /> Withdraw Consent
          </ConsentButton>
        )}
      </ButtonRow>

      {/* Withdraw Confirmation */}
      <AnimatePresence>
        {confirmWithdraw && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WithdrawWarning>
              <WithdrawWarningIcon size={20} />
              <div>
                <strong>Are you sure?</strong> Withdrawing consent will immediately disable all Swan Coach
                workout features. Your existing workout plans will remain, but no new Swan Coach-generated plans
                can be created until you re-grant consent.
                <ConfirmButtonRow>
                  <ConsentButton
                    $variant="withdraw"
                    onClick={handleWithdraw}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Yes, Withdraw Consent'}
                  </ConsentButton>
                  <RetryButton onClick={() => setConfirmWithdraw(false)}>
                    Cancel
                  </RetryButton>
                </ConfirmButtonRow>
              </div>
            </WithdrawWarning>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What happens section */}
      {consentState === 'withdrawn' && (
        <>
          <SectionDivider />
          <Card>
            <SectionTitle>
              <AlertTriangle size={20} color="#f59e0b" />
              What Is Disabled
            </SectionTitle>
            <PrivacyList>
              <PrivacyItem>
                <PrivacyIcon $color="#ef4444"><ShieldOff size={18} /></PrivacyIcon>
                <div>Swan Coach workout generation is <strong>disabled</strong>. You can still use manual workout templates and trainer-assigned plans.</div>
              </PrivacyItem>
              <PrivacyItem>
                <PrivacyIcon $color="#f59e0b"><AlertTriangle size={18} /></PrivacyIcon>
                <div>You can re-enable Swan Coach features at any time by granting consent above.</div>
              </PrivacyItem>
            </PrivacyList>
          </Card>
        </>
      )}
    </PageContainer>
  );
};

export default AiConsentScreen;
