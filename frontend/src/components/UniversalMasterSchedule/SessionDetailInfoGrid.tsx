/**
 * SessionDetailInfoGrid
 * =====================
 * Read-only session metadata, attendance state, and admin payment recovery entry.
 */

import React from 'react';
import GlowButton from '../ui/buttons/GlowButton';
import type { ClientSessionSignal } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import { BodyText, Caption, SmallText } from './ui';
import { DetailGrid, DetailItem, StatusBadge } from './SessionDetailModal.baseStyles';
import {
  AttendanceBadge,
  PaymentNeededBanner,
  PaymentNeededText,
  SessionsRemainingBadge,
} from './SessionDetailModal.feedbackStyles';
import type { SessionDetail, SessionDetailModalMode } from './SessionDetailModal.types';

export interface SessionDetailInfoGridProps {
  session: SessionDetail;
  sessionDate: Date;
  statusTone: string;
  hasAttendanceRecorded: boolean;
  canManage: boolean;
  mode: SessionDetailModalMode;
  isNonDeductingClient: boolean;
  sessionSignal: ClientSessionSignal;
  onApplyPayment?: (clientId: number) => void;
}

const SessionDetailInfoGrid: React.FC<SessionDetailInfoGridProps> = ({
  session,
  sessionDate,
  statusTone,
  hasAttendanceRecorded,
  canManage,
  mode,
  isNonDeductingClient,
  sessionSignal,
  onApplyPayment,
}) => (
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
    {canManage && session.clientEmail && (
      <DetailItem>
        <Caption secondary>Client Email</Caption>
        <BodyText>{session.clientEmail}</BodyText>
      </DetailItem>
    )}
    {canManage && session.clientPhone && (
      <DetailItem>
        <Caption secondary>Client Phone</Caption>
        <BodyText>{session.clientPhone}</BodyText>
      </DetailItem>
    )}
    {session.clientAvailableSessions != null && (
      <DetailItem>
        <Caption secondary>Session Policy</Caption>
        <SessionsRemainingBadge $low={sessionSignal.tone === 'warning'}>
          {sessionSignal.label}
        </SessionsRemainingBadge>
        <Caption secondary>{sessionSignal.note}</Caption>
      </DetailItem>
    )}
    {mode === 'admin'
      && !isNonDeductingClient
      && session.clientAvailableSessions != null
      && session.clientAvailableSessions <= 0
      && session.userId && (
        <PaymentNeededBanner>
          <PaymentNeededText>Client has no remaining session credits</PaymentNeededText>
          {onApplyPayment && (
            <GlowButton
              variant="primary"
              size="small"
              onClick={() => onApplyPayment(session.userId as number)}
            >
              Apply Payment
            </GlowButton>
          )}
        </PaymentNeededBanner>
      )}
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
);

export default SessionDetailInfoGrid;
