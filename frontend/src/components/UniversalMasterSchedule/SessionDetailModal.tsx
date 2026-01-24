/**
 * Session Detail Modal
 * ====================
 * Trainer/admin completion flow and read-only session details.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
  BodyText,
  Caption,
  FlexBox
} from './ui';

interface Session {
  id: number;
  sessionDate: string;
  duration: number;
  status: string;
  location?: string;
  notes?: string;
  reason?: string;
  trainerId?: number;
  userId?: number;
  rating?: number | null;
  feedback?: string | null;
  clientName?: string;
  trainerName?: string;
  isRecurring?: boolean;
  isBlocked?: boolean;
  recurringGroupId?: string | null;
}

interface SessionDetailModalProps {
  session: Session | null;
  open: boolean;
  mode: 'admin' | 'trainer' | 'client';
  onClose: () => void;
  onUpdated: () => void;
  onManageSeries?: (groupId: string) => void;
  seriesCount?: number;
}

const statusColors: Record<string, string> = {
  available: '#3b82f6',
  scheduled: '#10b981',
  confirmed: '#059669',
  completed: '#6b7280',
  cancelled: '#ef4444',
  blocked: '#f59e0b'
};

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  open,
  mode,
  onClose,
  onUpdated,
  onManageSeries,
  seriesCount
}) => {
  const [notes, setNotes] = useState('');
  const [trainerRating, setTrainerRating] = useState<string>('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [earlyCancel, setEarlyCancel] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const isBlocked = Boolean(session?.isBlocked) || session?.status === 'blocked';
  const canManage = mode === 'admin' || mode === 'trainer';
  const canManageSeries = mode === 'admin' && Boolean(session?.recurringGroupId);

  // Check if session is in the future (for early cancel eligibility)
  const isEarlyCancelEligible = useMemo(() => {
    if (!session) return false;
    const sessionTime = new Date(session.sessionDate).getTime();
    const now = Date.now();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    // Early cancel available if more than 24 hours before session
    return hoursUntilSession > 24;
  }, [session]);

  const isTrainerAssigned = useMemo(() => {
    if (mode !== 'trainer') {
      return true;
    }
    if (!session?.trainerId || !currentUserId) {
      return false;
    }
    return session.trainerId === currentUserId;
  }, [mode, session?.trainerId, currentUserId]);

  const canComplete = Boolean(
    session
    && canManage
    && isTrainerAssigned
    && !isBlocked
    && (session.status === 'scheduled' || session.status === 'confirmed')
  );

  const canCancel = Boolean(
    session
    && !isBlocked
    && session.status !== 'completed'
    && session.status !== 'cancelled'
    && (canManage || (mode === 'client' && session.userId === currentUserId))
  );

  useEffect(() => {
    if (!open || !session) {
      setFormError(null);
      setLoading(false);
      return;
    }

    setNotes(session.notes || '');
    setTrainerRating(session.rating ? String(session.rating) : '');
    setClientFeedback(session.feedback || '');
    setCancelReason('');
    setFormError(null);
  }, [open, session]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user?.id) {
          setCurrentUserId(Number(user.id));
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
  }, [open]);

  const handleComplete = async () => {
    if (!session) {
      return;
    }

    setFormError(null);
    setLoading(true);

    const ratingValue = trainerRating ? Number(trainerRating) : undefined;
    if (trainerRating && ratingValue !== undefined && (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5)) {
      setFormError('Trainer rating must be a number between 1 and 5.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to complete sessions.');
        return;
      }

      const payload = {
        notes: notes.trim() || undefined,
        trainerRating: ratingValue,
        clientFeedback: clientFeedback.trim() || undefined
      };

      const response = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to mark session complete.');
        return;
      }

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error completing session:', error);
      setFormError('Failed to mark session complete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!session?.recurringGroupId) {
      return;
    }

    if (!window.confirm('Delete all future sessions in this recurring series?')) {
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to delete recurring series.');
        return;
      }

      const response = await fetch(`/api/sessions/recurring/${session.recurringGroupId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to delete recurring series.');
        return;
      }

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting recurring series:', error);
      setFormError('Failed to delete recurring series. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!session) {
      return;
    }

    const confirmMsg = earlyCancel
      ? 'Early cancel - no session credit will be deducted. Proceed?'
      : 'Cancel this session? A session credit may be deducted.';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to cancel sessions.');
        return;
      }

      const payload = {
        reason: cancelReason.trim() || undefined,
        earlyCancel: earlyCancel && isEarlyCancelEligible
      };

      const response = await fetch(`/api/sessions/${session.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to cancel session.');
        return;
      }

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling session:', error);
      setFormError('Failed to cancel session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  const sessionDate = new Date(session.sessionDate);
  const statusTone = statusColors[session.status] || statusColors.available;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Session Details"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={loading}>
            Close
          </OutlinedButton>
          {canCancel && (
            <OutlinedButton
              onClick={handleCancel}
              disabled={loading}
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              Cancel Session
            </OutlinedButton>
          )}
          {canComplete && (
            <PrimaryButton onClick={handleComplete} disabled={loading}>
              Mark Complete
            </PrimaryButton>
          )}
        </>
      )}
    >
      {formError && (
        <ErrorText style={{ marginBottom: '1rem' }}>
          {formError}
        </ErrorText>
      )}

      {canManageSeries && (
        <SeriesCallout>
          <SmallText>
            Part of recurring series{seriesCount ? ` (${seriesCount} sessions)` : ''}.
          </SmallText>
          <FlexBox gap="0.5rem">
            <OutlinedButton
              onClick={() => onManageSeries?.(session.recurringGroupId as string)}
              disabled={loading}
            >
              Edit Series
            </OutlinedButton>
            <OutlinedButton
              onClick={handleDeleteSeries}
              disabled={loading}
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              Delete Series
            </OutlinedButton>
          </FlexBox>
        </SeriesCallout>
      )}

      <DetailGrid>
        <DetailItem>
          <Caption secondary>Date</Caption>
          <BodyText>{sessionDate.toLocaleDateString()}</BodyText>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Time</Caption>
          <BodyText>{sessionDate.toLocaleTimeString()}</BodyText>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Duration</Caption>
          <BodyText>{session.duration} min</BodyText>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Status</Caption>
          <StatusBadge $tone={statusTone}>{session.status}</StatusBadge>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Location</Caption>
          <BodyText>{session.location || 'Main Studio'}</BodyText>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Client</Caption>
          <BodyText>{session.clientName || 'Unassigned'}</BodyText>
        </DetailItem>
        <DetailItem>
          <Caption secondary>Trainer</Caption>
          <BodyText>{session.trainerName || 'Unassigned'}</BodyText>
        </DetailItem>
        {(session.isRecurring || session.recurringGroupId) && (
          <DetailItem>
            <Caption secondary>Series</Caption>
            <SmallText>Recurring</SmallText>
          </DetailItem>
        )}
      </DetailGrid>

      {isBlocked && session.reason && (
        <SmallText secondary style={{ marginBottom: '1rem' }}>
          Block reason: {session.reason}
        </SmallText>
      )}

      <FormField>
        <Label htmlFor="session-notes">Trainer Notes</Label>
        <StyledTextarea
          id="session-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={!canManage}
          placeholder="Add notes from the session..."
        />
      </FormField>

      <FlexBox gap="1rem" wrap>
        <FormField style={{ flex: 1, minWidth: '160px' }}>
          <Label htmlFor="trainer-rating">Trainer Rating (1-5)</Label>
          <StyledInput
            id="trainer-rating"
            type="number"
            min={1}
            max={5}
            step={1}
            value={trainerRating}
            onChange={(e) => setTrainerRating(e.target.value)}
            disabled={!canManage}
            placeholder="Optional"
          />
        </FormField>

        <FormField style={{ flex: 2, minWidth: '220px' }}>
          <Label htmlFor="client-feedback">Client Feedback</Label>
          <StyledTextarea
            id="client-feedback"
            value={clientFeedback}
            onChange={(e) => setClientFeedback(e.target.value)}
            rows={2}
            disabled={!canManage}
            placeholder="Share feedback for the client..."
          />
        </FormField>
      </FlexBox>

      {canCancel && (
        <FormField>
          <Label htmlFor="cancel-reason">Cancellation Reason (optional)</Label>
          <StyledInput
            id="cancel-reason"
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancelling this session"
          />
          {isEarlyCancelEligible && (
            <EarlyCancelOption>
              <input
                type="checkbox"
                id="early-cancel"
                checked={earlyCancel}
                onChange={(e) => setEarlyCancel(e.target.checked)}
              />
              <label htmlFor="early-cancel">
                <SmallText>Early Cancel (no session credit deducted)</SmallText>
                <Caption secondary>Available for cancellations more than 24 hours before session</Caption>
              </label>
            </EarlyCancelOption>
          )}
        </FormField>
      )}
    </Modal>
  );
};

export default SessionDetailModal;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const DetailItem = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const StatusBadge = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: ${props => props.$tone};
  color: #0f172a;
`;

const SeriesCallout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.35);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const EarlyCancelOption = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);

  input[type="checkbox"] {
    margin-top: 2px;
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    cursor: pointer;
  }
`;
