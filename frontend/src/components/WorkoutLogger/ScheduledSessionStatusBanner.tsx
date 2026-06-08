/**
 * ScheduledSessionStatusBanner
 * ============================
 *
 * Shows schedule-origin billing/source consequences before a trainer saves a
 * workout log. The backend remains authoritative for deduction; this banner
 * only mirrors the schedule context already passed through the logger route.
 */

import React from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle } from 'lucide-react';
import { normalizeClientSource } from '../../utils/clientSource';
import { getSessionDeductionSummary } from './SessionSummaryForm';
import {
  ScheduleBanner,
  ScheduleBannerBody,
  ScheduleBannerText,
  ScheduleBannerTitle,
  ScheduleIconShell,
  ScheduleMetaPill,
  ScheduleMetaRow,
} from './ScheduledSessionStatusBanner.styles';

interface ScheduledSessionStatusBannerProps {
  clientSource?: string | null;
  scheduledSessionCreditHint?: number | null;
  scheduledSessionDate?: string | null;
  scheduledSessionId?: string | null;
}

const getClientSourceLabel = (clientSource: string | null | undefined): string => {
  if (!clientSource?.trim()) return 'Client source not set';
  const normalizedSource = normalizeClientSource(clientSource);
  if (normalizedSource === 'move_fitness') return 'Move Fitness free tracking';
  if (normalizedSource === 'external') return 'External free tracking';
  return 'SwanStudios paid client';
};

const formatSessionDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalizedDateInput = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const parsed = new Date(normalizedDateInput);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ScheduledSessionStatusBanner: React.FC<ScheduledSessionStatusBannerProps> = React.memo(({
  clientSource,
  scheduledSessionCreditHint,
  scheduledSessionDate,
  scheduledSessionId,
}) => {
  if (!scheduledSessionId) return null;

  const deductionSummary = getSessionDeductionSummary(clientSource, scheduledSessionCreditHint);
  const StatusIcon = deductionSummary.isDeducting ? AlertTriangle : CheckCircle;
  const sessionDateLabel = formatSessionDate(scheduledSessionDate);

  return (
    <ScheduleBanner
      role="status"
      aria-live="polite"
      aria-label="Scheduled session workout billing status"
      $deducting={deductionSummary.isDeducting}
    >
      <ScheduleIconShell $deducting={deductionSummary.isDeducting}>
        <CalendarCheck size={20} aria-hidden="true" />
      </ScheduleIconShell>
      <ScheduleBannerBody>
        <ScheduleBannerTitle>Schedule-linked workout</ScheduleBannerTitle>
        <ScheduleBannerText>
          Saving this workout completes the appointment and keeps the log tied to the schedule.
        </ScheduleBannerText>
        <ScheduleMetaRow>
          {sessionDateLabel && (
            <ScheduleMetaPill>Session date: {sessionDateLabel}</ScheduleMetaPill>
          )}
          <ScheduleMetaPill>{getClientSourceLabel(clientSource)}</ScheduleMetaPill>
          <ScheduleMetaPill $deducting={deductionSummary.isDeducting}>
            <StatusIcon size={14} aria-hidden="true" />
            {deductionSummary.label}
          </ScheduleMetaPill>
        </ScheduleMetaRow>
      </ScheduleBannerBody>
    </ScheduleBanner>
  );
});

ScheduledSessionStatusBanner.displayName = 'ScheduledSessionStatusBanner';

export default ScheduledSessionStatusBanner;
