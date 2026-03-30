/**
 * ============================================================================
 * FILE: OnboardClientCard.tsx
 * PURPOSE: Confirmation card for AI-parsed client onboarding data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Renders a styled confirmation card when the AI returns an ONBOARD_CLIENT
 *   action block. Shows parsed client data, client source badge, and a confirm
 *   button that POSTs to /api/clients/onboard. Displays success or error state.
 *
 * HOW IT FITS IN THE APP:
 *   ChatMessage → detects ONBOARD_CLIENT action → renders OnboardClientCard
 *   OnboardClientCard → user confirms → POST /api/clients/onboard → success card
 *
 * KEY DECISIONS:
 *   Extracted from ChatMessage.tsx to stay under 300-line limit.
 *   Uses fetch with token from localStorage (same pattern as ChatMessage).
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { UserPlus, Check, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import type { AIAction } from '../../utils/parseAIActions';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Onboarding data shape from the AI action block
// ─────────────────────────────────────────────────────────────

interface OnboardData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  clientSource?: 'move_fitness' | 'swanstudios';
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  trainerNotes?: string;
  assignToSelf?: boolean;
  generateClaimCode?: boolean;
  availableSessions?: number;
}

interface OnboardResponse {
  success: boolean;
  message?: string;
  error?: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    temporaryPassword?: string;
    claimCode?: string;
    claimUrl?: string;
  };
}

interface OnboardClientCardProps {
  action: AIAction;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first Crystalline Swan themed card elements
// ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 0.92rem;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  color: var(--text-primary, #E0ECF4);
`;

const SourceBadge = styled.span<{ $source: 'move_fitness' | 'swanstudios' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  letter-spacing: 0.02em;
  background: ${({ $source }) =>
    $source === 'swanstudios'
      ? 'rgba(198, 168, 75, 0.15)'
      : 'rgba(255, 255, 255, 0.06)'};
  color: ${({ $source }) =>
    $source === 'swanstudios'
      ? 'var(--accent-gold, #C6A84B)'
      : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  border: 1px solid ${({ $source }) =>
    $source === 'swanstudios'
      ? 'rgba(198, 168, 75, 0.3)'
      : 'rgba(255, 255, 255, 0.1)'};
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div<{ $full?: boolean }>`
  grid-column: ${({ $full }) => $full ? '1 / -1' : 'auto'};
`;

const FieldLabel = styled.div`
  font-size: 0.68rem;
  font-family: 'Sora', sans-serif;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
`;

const FieldValue = styled.div`
  font-size: 0.82rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.4;
`;

const NotesBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 0.78rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid rgba(139, 92, 246, 0.1);
`;

const ConfirmBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  box-shadow: 0 0 20px rgba(96, 192, 240, 0.2);
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.15s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 28px rgba(96, 192, 240, 0.35);
  }

  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SuccessCard = styled(Card)`
  border-color: rgba(96, 192, 240, 0.3);
  background: rgba(96, 192, 240, 0.05);
`;

const SuccessHeader = styled(CardHeader)`
  color: var(--accent-primary, #60C0F0);
`;

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 6px;
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-size: 0.72rem;
  font-family: 'Fira Code', monospace;
  cursor: pointer;
  min-height: 44px;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

const ErrorCard = styled(Card)`
  border-color: rgba(201, 42, 84, 0.3);
`;

const ErrorText = styled.div`
  font-size: 0.82rem;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 10px;
`;

const RetryBtn = styled(ConfirmBtn)`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(201, 42, 84, 0.3);
  box-shadow: none;

  &:hover {
    box-shadow: 0 0 16px rgba(201, 42, 84, 0.15);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Render onboarding confirmation with confirm/success/error states
// ─────────────────────────────────────────────────────────────

const OnboardClientCard: React.FC<OnboardClientCardProps> = React.memo(({ action }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [response, setResponse] = useState<OnboardResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const data = action.data as OnboardData;
  const clientSource = data.clientSource || 'swanstudios';
  const sourceLabel = clientSource === 'move_fitness' ? 'Move Fitness (Free)' : 'SwanStudios (Paid)';

  const handleConfirm = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

      const res = await fetch(`${API_BASE}/api/clients/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const result: OnboardResponse = await res.json();
      if (result.success) {
        setStatus('success');
        setResponse(result);
        toast.success(`Client ${data.firstName} ${data.lastName} created`);
      } else {
        setStatus('error');
        setErrorMsg(result.error || 'Failed to create client');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error — could not reach server');
    }
  }, [data]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy');
    });
  }, []);

  // Success state — show created client info
  if (status === 'success' && response?.client) {
    const c = response.client;
    return (
      <SuccessCard>
        <SuccessHeader>
          <Check size={16} />
          Client Created
        </SuccessHeader>
        <FieldGrid>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <FieldValue>{c.firstName} {c.lastName}</FieldValue>
          </Field>
          <Field>
            <FieldLabel>Client ID</FieldLabel>
            <FieldValue>#{c.id}</FieldValue>
          </Field>
          {c.email && (
            <Field $full>
              <FieldLabel>Email</FieldLabel>
              <FieldValue>{c.email}</FieldValue>
            </Field>
          )}
          {c.temporaryPassword && (
            <Field $full>
              <FieldLabel>Temporary Password</FieldLabel>
              <CopyBtn onClick={() => copyToClipboard(c.temporaryPassword!, 'Password')}>
                {c.temporaryPassword}
                <Copy size={12} />
              </CopyBtn>
            </Field>
          )}
          {c.claimCode && (
            <Field $full>
              <FieldLabel>Claim Code</FieldLabel>
              <CopyBtn onClick={() => copyToClipboard(c.claimCode!, 'Claim code')}>
                {c.claimCode}
                <Copy size={12} />
              </CopyBtn>
            </Field>
          )}
          {c.claimUrl && (
            <Field $full>
              <FieldLabel>Claim URL</FieldLabel>
              <CopyBtn onClick={() => copyToClipboard(c.claimUrl!, 'Claim URL')}>
                {c.claimUrl}
                <Copy size={12} />
              </CopyBtn>
            </Field>
          )}
        </FieldGrid>
      </SuccessCard>
    );
  }

  // Error state — show message with retry
  if (status === 'error') {
    return (
      <ErrorCard>
        <CardHeader>
          <AlertTriangle size={16} style={{ color: '#C92A54' }} />
          Onboarding Failed
        </CardHeader>
        <ErrorText>{errorMsg}</ErrorText>
        <RetryBtn onClick={handleConfirm}>
          <RefreshCw size={14} />
          Retry
        </RetryBtn>
      </ErrorCard>
    );
  }

  // Default: confirmation card
  return (
    <Card>
      <CardHeader>
        <UserPlus size={16} style={{ color: '#8B5CF6' }} />
        New Client Intake
        <SourceBadge $source={clientSource}>{sourceLabel}</SourceBadge>
      </CardHeader>

      <FieldGrid>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <FieldValue>{data.firstName || '—'} {data.lastName || '—'}</FieldValue>
        </Field>
        {data.dateOfBirth && (
          <Field>
            <FieldLabel>Date of Birth</FieldLabel>
            <FieldValue>{data.dateOfBirth}</FieldValue>
          </Field>
        )}
        {data.gender && (
          <Field>
            <FieldLabel>Gender</FieldLabel>
            <FieldValue>{data.gender}</FieldValue>
          </Field>
        )}
        {data.trainingExperience && (
          <Field>
            <FieldLabel>Experience</FieldLabel>
            <FieldValue style={{ textTransform: 'capitalize' }}>{data.trainingExperience}</FieldValue>
          </Field>
        )}
        {data.fitnessGoal && (
          <Field $full>
            <FieldLabel>Goals</FieldLabel>
            <FieldValue>{data.fitnessGoal}</FieldValue>
          </Field>
        )}
        {data.healthConcerns && (
          <Field $full>
            <FieldLabel>Health Concerns</FieldLabel>
            <FieldValue>{data.healthConcerns}</FieldValue>
          </Field>
        )}
      </FieldGrid>

      {data.trainerNotes && (
        <>
          <FieldLabel style={{ marginBottom: 4 }}>NASM Assessment Notes</FieldLabel>
          <NotesBox>{data.trainerNotes}</NotesBox>
        </>
      )}

      <ConfirmBtn onClick={handleConfirm} disabled={status === 'loading'}>
        <UserPlus size={16} />
        {status === 'loading' ? 'Creating Client...' : 'Confirm & Create Client'}
      </ConfirmBtn>
    </Card>
  );
});

OnboardClientCard.displayName = 'OnboardClientCard';
export default OnboardClientCard;
