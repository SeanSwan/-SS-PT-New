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
  packageInfo?: {
    name: string;
    sessionsRemaining?: number;
    sessionsTotal?: number | null;
    purchasedAt?: string | Date | null;
  };
  // Attendance tracking fields (Phase D)
  attendanceStatus?: 'present' | 'no_show' | 'late' | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  noShowReason?: string | null;
  attendanceRecordedAt?: string | null;
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
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [chargeType, setChargeType] = useState<'none' | 'full' | 'partial' | 'late_fee'>('none');
  const [chargeAmount, setChargeAmount] = useState<string>('');
  const [restoreCredit, setRestoreCredit] = useState(true);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [packagePrice, setPackagePrice] = useState<number | null>(null);
  const [packageName, setPackageName] = useState<string | null>(null);
  const [defaultFullCharge, setDefaultFullCharge] = useState<number>(175);
  const [defaultLateFee, setDefaultLateFee] = useState<number>(88);

  // Client feedback state
  const [clientRating, setClientRating] = useState<number>(0);
  const [clientComment, setClientComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Attendance tracking state (Phase D)
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [noShowReasonInput, setNoShowReasonInput] = useState('');
  const [showNoShowReason, setShowNoShowReason] = useState(false);

  // Late cancel warning state (Phase E)
  const [showLateCancelWarning, setShowLateCancelWarning] = useState(false);
  const [lateCancelWarning, setLateCancelWarning] = useState<{
    isLateCancellation: boolean;
    hoursUntilSession: number;
    lateFeeAmount: number;
    creditRestored: boolean;
    warningMessage: string;
    sessionDateFormatted: string;
  } | null>(null);
  const [lateCancelLoading, setLateCancelLoading] = useState(false);

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

  // Phase D: Check if attendance can be recorded
  const canRecordAttendance = Boolean(
    session
    && canManage
    && isTrainerAssigned
    && !isBlocked
    && !session.attendanceStatus // Not already recorded
    && (session.status === 'scheduled' || session.status === 'confirmed')
  );

  const hasAttendanceRecorded = Boolean(session?.attendanceStatus);

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
    setShowCancelOptions(false);
    setChargeType('none');
    setChargeAmount('');
    setRestoreCredit(true);
    setNotifyOnCancel(true);
    setFormError(null);

    // Client feedback state
    setClientRating(session.rating || 0);
    setClientComment('');
    setFeedbackSubmitted(session.rating != null && session.rating > 0);
    setFeedbackLoading(false);

    // Phase E: Reset late cancel warning state
    setShowLateCancelWarning(false);
    setLateCancelWarning(null);
    setLateCancelLoading(false);
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

  // Fetch client's package price when session changes
  useEffect(() => {
    const fetchPackagePrice = async () => {
      if (!open || !session?.id || !canManage) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/sessions/${session.id}/client-package-price`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const data = result.data;
            const fullCharge = data.pricePerSession || data.defaultChargeAmount || 175;
            const lateFee = data.lateFeeAmount || Math.round(fullCharge * 0.5);

            setPackagePrice(data.pricePerSession);
            setPackageName(data.packageName);
            setDefaultFullCharge(fullCharge);
            setDefaultLateFee(lateFee);
          }
        }
      } catch (error) {
        console.warn('Could not fetch package price:', error);
        // Use defaults
        setDefaultFullCharge(175);
        setDefaultLateFee(88);
      }
    };

    fetchPackagePrice();
  }, [open, session?.id, canManage]);

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

  // Phase D: Handle attendance recording
  const handleRecordAttendance = async (status: 'present' | 'no_show' | 'late') => {
    if (!session) return;

    // For no-show, show reason input first
    if (status === 'no_show' && !showNoShowReason) {
      setShowNoShowReason(true);
      return;
    }

    setFormError(null);
    setAttendanceLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to record attendance.');
        return;
      }

      const payload: {
        attendanceStatus: string;
        noShowReason?: string;
        notes?: string;
      } = {
        attendanceStatus: status
      };

      if (status === 'no_show' && noShowReasonInput.trim()) {
        payload.noShowReason = noShowReasonInput.trim();
      }

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const response = await fetch(`/api/sessions/${session.id}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to record attendance.');
        return;
      }

      setShowNoShowReason(false);
      setNoShowReasonInput('');
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error recording attendance:', error);
      setFormError('Failed to record attendance. Please try again.');
    } finally {
      setAttendanceLoading(false);
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

  // Client submits feedback for a completed session
  const handleSubmitFeedback = async () => {
    if (!session || clientRating === 0) {
      setFormError('Please select a rating before submitting.');
      return;
    }

    setFeedbackLoading(true);
    setFormError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to submit feedback.');
        return;
      }

      const response = await fetch(`/api/sessions/${session.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: clientRating,
          comment: clientComment.trim() || undefined
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to submit feedback.');
        return;
      }

      setFeedbackSubmitted(true);
      onUpdated();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFormError('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Phase E: Fetch late cancel warning before showing confirmation
  const fetchCancelWarning = async () => {
    if (!session) return;

    setLateCancelLoading(true);
    setFormError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to cancel sessions.');
        return;
      }

      const response = await fetch(`/api/sessions/${session.id}/cancel-warning`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to check cancellation status.');
        return;
      }

      // Store warning info
      setLateCancelWarning({
        isLateCancellation: result.isLateCancellation,
        hoursUntilSession: result.hoursUntilSession,
        lateFeeAmount: result.cancellationPolicy?.lateFeeAmount || defaultLateFee,
        creditRestored: result.cancellationPolicy?.creditRestored ?? true,
        warningMessage: result.warningMessage,
        sessionDateFormatted: result.sessionDateFormatted
      });

      // Show the warning dialog
      setShowLateCancelWarning(true);

    } catch (error) {
      console.error('Error fetching cancel warning:', error);
      setFormError('Failed to check cancellation status. Please try again.');
    } finally {
      setLateCancelLoading(false);
    }
  };

  const handleCancelClick = () => {
    // For admins/trainers, show the cancel options panel
    if (canManage) {
      setShowCancelOptions(true);
      // Default to 'full' charge (package price) for late cancellations, 'none' for early
      if (isEarlyCancelEligible) {
        setChargeType('none');
        setRestoreCredit(true);
        setChargeAmount('');
      } else {
        // Default to full session charge based on client's package price
        setChargeType('full');
        setChargeAmount(String(defaultFullCharge));
        setRestoreCredit(false);
      }
    } else {
      // Phase E: For clients, fetch and show late cancel warning first
      fetchCancelWarning();
    }
  };

  // Phase E: Proceed with cancellation after warning acknowledgment
  const handleConfirmLateCancellation = () => {
    setShowLateCancelWarning(false);
    handleCancel();
  };

  const handleCancel = async () => {
    if (!session) {
      return;
    }

    // Build confirmation message based on charge type
    let confirmMsg = 'Cancel this session?';
    if (canManage) {
      if (chargeType === 'none') {
        confirmMsg = restoreCredit
          ? 'Cancel with no charge. Session credit will be restored. Proceed?'
          : 'Cancel with no charge. Proceed?';
      } else if (chargeType === 'full') {
        confirmMsg = `Cancel with FULL SESSION CHARGE ($${defaultFullCharge}). Proceed?`;
      } else if (chargeType === 'partial') {
        const amt = parseFloat(chargeAmount) || 0;
        confirmMsg = `Cancel with partial charge ($${amt.toFixed(2)}). Proceed?`;
      } else if (chargeType === 'late_fee') {
        const amt = parseFloat(chargeAmount) || defaultLateFee;
        confirmMsg = `Cancel with late fee ($${amt.toFixed(2)}). Proceed?`;
      }
    } else {
      confirmMsg = earlyCancel
        ? 'Early cancel - no session credit will be deducted. Proceed?'
        : 'Cancel this session? A session credit may be deducted.';
    }

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

      // Build payload based on user type
      const payload: Record<string, unknown> = {
        reason: cancelReason.trim() || undefined,
        notifyClient: notifyOnCancel,
        notifyTrainer: notifyOnCancel
      };

      if (canManage) {
        // Admin/trainer gets full charge options
        payload.chargeType = chargeType;
        payload.chargeAmount = chargeType === 'partial' || chargeType === 'late_fee'
          ? parseFloat(chargeAmount) || 0
          : 0;
        payload.restoreCredit = restoreCredit && chargeType === 'none';
      } else {
        // Client gets early cancel option
        payload.chargeType = earlyCancel && isEarlyCancelEligible ? 'none' : 'late_fee';
        payload.restoreCredit = earlyCancel && isEarlyCancelEligible;
      }

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

      // Show success message with charge info
      if (result?.data?.chargeAmount > 0) {
        alert(`Session cancelled. Charge applied: $${result.data.chargeAmount.toFixed(2)}`);
      } else if (result?.data?.creditRestored) {
        alert('Session cancelled. Session credit has been restored.');
      }

      onUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling session:', error);
      setFormError('Failed to cancel session. Please try again.');
    } finally {
      setLoading(false);
      setShowCancelOptions(false);
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
          {canCancel && !showCancelOptions && !showLateCancelWarning && (
            <OutlinedButton
              onClick={handleCancelClick}
              disabled={loading || lateCancelLoading}
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              {lateCancelLoading ? 'Checking...' : 'Cancel Session'}
            </OutlinedButton>
          )}
          {showCancelOptions && (
            <>
              <OutlinedButton
                onClick={() => setShowCancelOptions(false)}
                disabled={loading}
              >
                Back
              </OutlinedButton>
              <OutlinedButton
                onClick={handleCancel}
                disabled={loading}
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
              >
                Confirm Cancellation
              </OutlinedButton>
            </>
          )}
          {/* Phase D: Attendance buttons */}
          {canRecordAttendance && !showCancelOptions && !showNoShowReason && (
            <>
              <AttendanceButton
                onClick={() => handleRecordAttendance('present')}
                disabled={attendanceLoading}
                $variant="present"
              >
                {attendanceLoading ? 'Recording...' : 'Present'}
              </AttendanceButton>
              <AttendanceButton
                onClick={() => handleRecordAttendance('late')}
                disabled={attendanceLoading}
                $variant="late"
              >
                Late
              </AttendanceButton>
              <AttendanceButton
                onClick={() => handleRecordAttendance('no_show')}
                disabled={attendanceLoading}
                $variant="noshow"
              >
                No-Show
              </AttendanceButton>
            </>
          )}
          {showNoShowReason && (
            <>
              <OutlinedButton
                onClick={() => {
                  setShowNoShowReason(false);
                  setNoShowReasonInput('');
                }}
                disabled={attendanceLoading}
              >
                Back
              </OutlinedButton>
              <AttendanceButton
                onClick={() => handleRecordAttendance('no_show')}
                disabled={attendanceLoading}
                $variant="noshow"
              >
                {attendanceLoading ? 'Recording...' : 'Confirm No-Show'}
              </AttendanceButton>
            </>
          )}
          {canComplete && !showNoShowReason && (
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

      {/* Phase D: No-Show Reason Input */}
      {showNoShowReason && (
        <NoShowReasonBox>
          <Label>No-Show Reason (Optional)</Label>
          <StyledTextarea
            value={noShowReasonInput}
            onChange={(e) => setNoShowReasonInput(e.target.value)}
            placeholder="Enter reason for no-show..."
            rows={3}
          />
          <SmallText secondary>
            Client will be notified about the no-show.
          </SmallText>
        </NoShowReasonBox>
      )}

      {/* Show existing no-show reason if recorded */}
      {session?.noShowReason && (
        <NoShowReasonDisplay>
          <Caption secondary>No-Show Reason</Caption>
          <BodyText>{session.noShowReason}</BodyText>
        </NoShowReasonDisplay>
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
        {hasAttendanceRecorded && (
          <DetailItem>
            <Caption secondary>Attendance</Caption>
            <AttendanceBadge $status={session.attendanceStatus || 'present'}>
              {session.attendanceStatus === 'present' && 'Present'}
              {session.attendanceStatus === 'no_show' && 'No-Show'}
              {session.attendanceStatus === 'late' && 'Late'}
            </AttendanceBadge>
          </DetailItem>
        )}
        {session.checkInTime && (
          <DetailItem>
            <Caption secondary>Checked In</Caption>
            <SmallText>{new Date(session.checkInTime).toLocaleTimeString()}</SmallText>
          </DetailItem>
        )}
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

      {session.packageInfo && (
        <PackageSection>
          <PackageSectionTitle>Package Info</PackageSectionTitle>
          <PackageDetail>
            <PackageLabel>Package</PackageLabel>
            <PackageValue>{session.packageInfo.name}</PackageValue>
          </PackageDetail>
          {session.packageInfo.purchasedAt && (
            <PackageDetail>
              <PackageLabel>Purchased</PackageLabel>
              <PackageValue>
                {new Date(session.packageInfo.purchasedAt).toLocaleDateString()}
              </PackageValue>
            </PackageDetail>
          )}
          {session.packageInfo.sessionsTotal != null ? (
            <>
              <PackageDetail>
                <PackageLabel>Sessions Used</PackageLabel>
                <PackageValue>
                  {Math.max(
                    0,
                    session.packageInfo.sessionsTotal - (session.packageInfo.sessionsRemaining ?? 0)
                  )}{' '}
                  of {session.packageInfo.sessionsTotal}
                </PackageValue>
              </PackageDetail>
              <PackageDetail>
                <PackageLabel>Sessions Remaining</PackageLabel>
                <PackageValue style={{ color: '#00FF88' }}>
                  {Math.max(0, session.packageInfo.sessionsRemaining ?? 0)}
                </PackageValue>
              </PackageDetail>
              <SessionsProgress>
                <PackageLabel>Progress</PackageLabel>
                <ProgressBar>
                  <ProgressFill
                    $percent={
                      session.packageInfo.sessionsTotal > 0
                        ? Math.min(
                          100,
                          (Math.max(
                            0,
                            session.packageInfo.sessionsTotal - (session.packageInfo.sessionsRemaining ?? 0)
                          ) / session.packageInfo.sessionsTotal) * 100
                        )
                        : 0
                    }
                  />
                </ProgressBar>
              </SessionsProgress>
            </>
          ) : (
            <PackageDetail>
              <PackageLabel>Plan Type</PackageLabel>
              <PackageValue style={{ color: '#FFD700' }}>Unlimited</PackageValue>
            </PackageDetail>
          )}
        </PackageSection>
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

      {/* Client Feedback Section - shown for completed sessions in client mode */}
      {mode === 'client' && session?.status === 'completed' && (
        <ClientFeedbackPanel>
          <FeedbackHeader>
            <h3>Rate Your Session</h3>
            {feedbackSubmitted && (
              <FeedbackSubmittedBadge>Feedback Submitted</FeedbackSubmittedBadge>
            )}
          </FeedbackHeader>

          {!feedbackSubmitted ? (
            <>
              <SmallText secondary style={{ marginBottom: '1rem' }}>
                How was your training session? Your feedback helps us improve.
              </SmallText>

              <StarRatingContainer>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarButton
                    key={star}
                    $active={star <= clientRating}
                    onClick={() => setClientRating(star)}
                    type="button"
                  >
                    ★
                  </StarButton>
                ))}
                {clientRating > 0 && (
                  <span style={{ marginLeft: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                    {clientRating} / 5
                  </span>
                )}
              </StarRatingContainer>

              <FormField style={{ marginTop: '1rem' }}>
                <Label htmlFor="client-feedback-comment">Comments (optional)</Label>
                <StyledTextarea
                  id="client-feedback-comment"
                  value={clientComment}
                  onChange={(e) => setClientComment(e.target.value)}
                  rows={3}
                  placeholder="Share your thoughts about the session..."
                />
              </FormField>

              <PrimaryButton
                onClick={handleSubmitFeedback}
                disabled={feedbackLoading || clientRating === 0}
                style={{ marginTop: '1rem' }}
              >
                {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
              </PrimaryButton>
            </>
          ) : (
            <FeedbackThankYou>
              <span style={{ fontSize: '2rem' }}>🎉</span>
              <BodyText>Thank you for your feedback!</BodyText>
              <Caption secondary>
                Your rating: {clientRating} / 5 stars
              </Caption>
            </FeedbackThankYou>
          )}
        </ClientFeedbackPanel>
      )}

      {/* Phase E: Late Cancel Warning for Clients */}
      {showLateCancelWarning && !canManage && lateCancelWarning && (
        lateCancelWarning.isLateCancellation ? (
          <LateCancelWarningPanel>
            <LateCancelWarningHeader>
              <LateCancelWarningIcon>⚠️</LateCancelWarningIcon>
              Late Cancellation Warning
            </LateCancelWarningHeader>
            <LateCancelSessionInfo>
              <LateCancelSessionDate>{lateCancelWarning.sessionDateFormatted}</LateCancelSessionDate>
              <LateCancelHoursLeft>
                {lateCancelWarning.hoursUntilSession > 0
                  ? `${lateCancelWarning.hoursUntilSession.toFixed(1)} hours until session`
                  : 'Session time has passed'}
              </LateCancelHoursLeft>
            </LateCancelSessionInfo>
            <LateCancelWarningMessage>
              {lateCancelWarning.warningMessage}
            </LateCancelWarningMessage>
            <LateCancelFeeBox>
              <LateCancelFeeLabel>Late Cancellation Fee</LateCancelFeeLabel>
              <LateCancelFeeAmount>${lateCancelWarning.lateFeeAmount}</LateCancelFeeAmount>
            </LateCancelFeeBox>
            <FormField>
              <Label htmlFor="cancel-reason">Cancellation Reason (optional)</Label>
              <StyledInput
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling"
              />
            </FormField>
            <LateCancelButtonRow>
              <LateCancelBackButton
                onClick={() => setShowLateCancelWarning(false)}
                disabled={loading}
              >
                Go Back
              </LateCancelBackButton>
              <LateCancelContinueButton
                onClick={handleConfirmLateCancellation}
                disabled={loading}
              >
                {loading ? 'Cancelling...' : 'I Understand, Cancel Session'}
              </LateCancelContinueButton>
            </LateCancelButtonRow>
          </LateCancelWarningPanel>
        ) : (
          <EarlyCancelPanel>
            <EarlyCancelHeader>
              <span>✓</span>
              Free Cancellation Available
            </EarlyCancelHeader>
            <LateCancelSessionInfo>
              <LateCancelSessionDate>{lateCancelWarning.sessionDateFormatted}</LateCancelSessionDate>
              <LateCancelHoursLeft>
                {lateCancelWarning.hoursUntilSession.toFixed(1)} hours until session
              </LateCancelHoursLeft>
            </LateCancelSessionInfo>
            <LateCancelWarningMessage style={{ color: 'rgba(16, 185, 129, 0.9)' }}>
              {lateCancelWarning.warningMessage}
            </LateCancelWarningMessage>
            <FormField>
              <Label htmlFor="cancel-reason">Cancellation Reason (optional)</Label>
              <StyledInput
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancelling"
              />
            </FormField>
            <LateCancelButtonRow>
              <LateCancelBackButton
                onClick={() => setShowLateCancelWarning(false)}
                disabled={loading}
              >
                Go Back
              </LateCancelBackButton>
              <LateCancelContinueButton
                onClick={handleConfirmLateCancellation}
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {loading ? 'Cancelling...' : 'Cancel Session (No Fee)'}
              </LateCancelContinueButton>
            </LateCancelButtonRow>
          </EarlyCancelPanel>
        )
      )}

      {/* Original client cancel section - hidden when warning is shown */}
      {canCancel && !showCancelOptions && !canManage && !showLateCancelWarning && (
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

      {/* Admin/Trainer Cancellation Options Panel */}
      {showCancelOptions && canManage && (
        <CancellationPanel>
          <CancelPanelHeader>
            <h3>Cancel Session - Choose Charge Option</h3>
            {!isEarlyCancelEligible && (
              <LateCancelWarning>
                Late cancellation (less than 24 hours notice)
              </LateCancelWarning>
            )}
          </CancelPanelHeader>

          {/* Show client's package info */}
          {packagePrice && (
            <PackageInfoBanner>
              <SmallText>Client Package: {packageName || 'Standard'}</SmallText>
              <Caption secondary>Rate: ${packagePrice}/session</Caption>
            </PackageInfoBanner>
          )}

          <FormField>
            <Label htmlFor="cancel-reason-admin">Cancellation Reason</Label>
            <StyledInput
              id="cancel-reason-admin"
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancelling this session"
            />
          </FormField>

          <ChargeTypeGrid>
            <ChargeOption
              $selected={chargeType === 'full'}
              $variant="danger"
              onClick={() => {
                setChargeType('full');
                setChargeAmount(String(defaultFullCharge));
                setRestoreCredit(false);
              }}
            >
              <ChargeOptionHeader>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'full'}
                  onChange={() => {}}
                />
                <span>Full Session Charge (Default)</span>
              </ChargeOptionHeader>
              <Caption secondary>
                Charge the full session rate based on client's package.
              </Caption>
              <ChargeAmount $variant="danger">${defaultFullCharge.toFixed(2)}</ChargeAmount>
            </ChargeOption>

            <ChargeOption
              $selected={chargeType === 'late_fee'}
              $variant="warning"
              onClick={() => {
                setChargeType('late_fee');
                setChargeAmount(String(defaultLateFee));
                setRestoreCredit(false);
              }}
            >
              <ChargeOptionHeader>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'late_fee'}
                  onChange={() => {}}
                />
                <span>Late Cancellation Fee (50%)</span>
              </ChargeOptionHeader>
              <Caption secondary>
                Apply a 50% late cancellation fee. Session credit is NOT restored.
              </Caption>
              <ChargeAmount $variant="warning">${defaultLateFee.toFixed(2)}</ChargeAmount>
            </ChargeOption>

            <ChargeOption
              $selected={chargeType === 'partial'}
              $variant="warning"
              onClick={() => {
                setChargeType('partial');
                setChargeAmount(String(Math.round(defaultFullCharge * 0.5)));
                setRestoreCredit(false);
              }}
            >
              <ChargeOptionHeader>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'partial'}
                  onChange={() => {}}
                />
                <span>Custom Amount</span>
              </ChargeOptionHeader>
              <Caption secondary>
                Apply a custom charge amount.
              </Caption>
              <ChargeInputWrapper>
                <span>$</span>
                <StyledInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Amount"
                />
              </ChargeInputWrapper>
            </ChargeOption>

            <ChargeOption
              $selected={chargeType === 'none'}
              $variant="success"
              onClick={() => {
                setChargeType('none');
                setChargeAmount('');
                setRestoreCredit(true);
              }}
            >
              <ChargeOptionHeader>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'none'}
                  onChange={() => {}}
                />
                <span>No Charge</span>
              </ChargeOptionHeader>
              <Caption secondary>
                Cancel without charging. Session credit will be restored to client.
              </Caption>
              <ChargeAmount $variant="success">$0.00</ChargeAmount>
            </ChargeOption>
          </ChargeTypeGrid>

          {chargeType === 'none' && (
            <RestoreCreditOption>
              <input
                type="checkbox"
                id="restore-credit"
                checked={restoreCredit}
                onChange={(e) => setRestoreCredit(e.target.checked)}
              />
              <label htmlFor="restore-credit">
                <SmallText>Restore session credit to client's account</SmallText>
              </label>
            </RestoreCreditOption>
          )}

          <NotificationOption>
            <input
              type="checkbox"
              id="notify-cancel"
              checked={notifyOnCancel}
              onChange={(e) => setNotifyOnCancel(e.target.checked)}
            />
            <label htmlFor="notify-cancel">
              <SmallText>Send email notification to client and trainer</SmallText>
            </label>
          </NotificationOption>
        </CancellationPanel>
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

const CancellationPanel = styled.div`
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1rem;
`;

const CancelPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #ef4444;
  }
`;

const LateCancelWarning = styled.span`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
  font-size: 0.75rem;
  font-weight: 500;
`;

// Phase E: Late Cancel Warning Dialog Styles
const LateCancelWarningPanel = styled.div`
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  margin: 1rem 0;
`;

const LateCancelWarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #ef4444;
  font-weight: 600;
  font-size: 1.1rem;
`;

const LateCancelWarningIcon = styled.span`
  font-size: 1.5rem;
`;

const LateCancelWarningMessage = styled.p`
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const LateCancelFeeBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const LateCancelFeeLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

const LateCancelFeeAmount = styled.span`
  color: #ef4444;
  font-weight: 600;
  font-size: 1.1rem;
`;

const LateCancelSessionInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const LateCancelSessionDate = styled.div`
  color: white;
  font-weight: 500;
  font-size: 0.95rem;
`;

const LateCancelHoursLeft = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

const LateCancelButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const LateCancelContinueButton = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LateCancelBackButton = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

// Early (no penalty) cancel confirmation styling
const EarlyCancelPanel = styled.div`
  padding: 1.25rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  margin: 1rem 0;
`;

const EarlyCancelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #10b981;
  font-weight: 600;
  font-size: 1.1rem;
`;

const PackageInfoBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 1rem;
`;

const PackageSection = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: rgba(120, 81, 169, 0.1);
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
`;

const PackageSectionTitle = styled.h4`
  color: #00FFFF;
  font-size: 0.875rem;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PackageDetail = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const PackageLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
`;

const PackageValue = styled.span`
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
`;

const SessionsProgress = styled.div`
  margin-top: 12px;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #00FFFF, #7851A9);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ChargeTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

const ChargeOption = styled.div<{ $selected: boolean; $variant: 'success' | 'warning' | 'danger' }>`
  position: relative;
  padding: 1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${props => {
    if (!props.$selected) return 'rgba(255, 255, 255, 0.03)';
    switch (props.$variant) {
      case 'success': return 'rgba(16, 185, 129, 0.12)';
      case 'warning': return 'rgba(245, 158, 11, 0.12)';
      case 'danger': return 'rgba(239, 68, 68, 0.12)';
    }
  }};

  border: 2px solid ${props => {
    if (!props.$selected) return 'rgba(255, 255, 255, 0.1)';
    switch (props.$variant) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
    }
  }};

  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'success': return 'rgba(16, 185, 129, 0.08)';
        case 'warning': return 'rgba(245, 158, 11, 0.08)';
        case 'danger': return 'rgba(239, 68, 68, 0.08)';
      }
    }};
  }
`;

const ChargeOptionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  span {
    font-weight: 600;
    font-size: 0.9rem;
  }
`;

const ChargeAmount = styled.div<{ $variant: 'success' | 'warning' | 'danger' }>`
  margin-top: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;

  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
    }
  }};
`;

const ChargeInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;

  span {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f59e0b;
  }

  input {
    width: 100px;
    padding: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
  }
`;

const RestoreCreditOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 0.75rem;

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
  }

  label {
    cursor: pointer;
  }
`;

const NotificationOption = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #3b82f6;
    cursor: pointer;
  }

  label {
    cursor: pointer;
  }
`;

// Client Feedback Styled Components
const ClientFeedbackPanel = styled.div`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  margin: 1rem 0;
`;

const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #3b82f6;
  }
`;

const FeedbackSubmittedBadge = styled.span`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 500;
`;

const StarRatingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const StarButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.15s ease, color 0.15s ease;
  color: ${props => props.$active ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'};

  &:hover {
    transform: scale(1.2);
    color: #fbbf24;
  }

  &:focus {
    outline: none;
  }
`;

const FeedbackThankYou = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  text-align: center;
`;

// Phase D: Attendance Styled Components
const AttendanceButton = styled.button<{ $variant: 'present' | 'late' | 'noshow' }>`
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid;

  ${props => {
    switch (props.$variant) {
      case 'present':
        return `
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #10b981;
          &:hover:not(:disabled) {
            background: rgba(16, 185, 129, 0.25);
          }
        `;
      case 'late':
        return `
          background: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
          color: #f59e0b;
          &:hover:not(:disabled) {
            background: rgba(245, 158, 11, 0.25);
          }
        `;
      case 'noshow':
        return `
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #ef4444;
          &:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.25);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AttendanceBadge = styled.span<{ $status: 'present' | 'no_show' | 'late' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;

  ${props => {
    switch (props.$status) {
      case 'present':
        return `
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
        `;
      case 'late':
        return `
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #f59e0b;
        `;
      case 'no_show':
        return `
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
        `;
    }
  }}
`;

const NoShowReasonBox = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;

  textarea {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

const NoShowReasonDisplay = styled.div`
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
`;
