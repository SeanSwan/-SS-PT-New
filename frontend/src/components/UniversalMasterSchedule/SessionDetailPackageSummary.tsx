import React from 'react';
import {
  PackageDetail,
  PackageLabel,
  PackageSection,
  PackageSectionTitle,
  PackageValue,
  ProgressBar,
  ProgressFill,
  SessionsProgress,
} from './SessionDetailModal.lateCancelStyles';
import { normalizeAvailableSessions } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import type { SessionDetail } from './SessionDetailModal.types';

interface SessionDetailPackageSummaryProps {
  packageInfo: NonNullable<SessionDetail['packageInfo']>;
}

const SessionDetailPackageSummary: React.FC<SessionDetailPackageSummaryProps> = ({
  packageInfo,
}) => {
  const rawSessionsRemaining = Number(packageInfo.sessionsRemaining ?? 0);
  const sessionsRemaining = normalizeAvailableSessions(packageInfo.sessionsRemaining);
  const sessionsUsed = Math.max(
    0,
    (packageInfo.sessionsTotal ?? 0) - (Number.isFinite(rawSessionsRemaining) ? rawSessionsRemaining : 0),
  );
  const progressPercent = packageInfo.sessionsTotal && packageInfo.sessionsTotal > 0
    ? Math.min(100, (sessionsUsed / packageInfo.sessionsTotal) * 100)
    : 0;

  return (
    <PackageSection>
      <PackageSectionTitle>Package Info</PackageSectionTitle>
      <PackageDetail>
        <PackageLabel>Package</PackageLabel>
        <PackageValue>{packageInfo.name}</PackageValue>
      </PackageDetail>
      {packageInfo.purchasedAt && (
        <PackageDetail>
          <PackageLabel>Purchased</PackageLabel>
          <PackageValue>
            {new Date(packageInfo.purchasedAt).toLocaleDateString()}
          </PackageValue>
        </PackageDetail>
      )}
      {packageInfo.sessionsTotal != null ? (
        <>
          <PackageDetail>
            <PackageLabel>Sessions Used</PackageLabel>
            <PackageValue>
              {sessionsUsed} of {packageInfo.sessionsTotal}
            </PackageValue>
          </PackageDetail>
          <PackageDetail>
            <PackageLabel>Sessions Remaining</PackageLabel>
            <PackageValue $tone="success">
              {sessionsRemaining}
            </PackageValue>
          </PackageDetail>
          <SessionsProgress>
            <PackageLabel>Progress</PackageLabel>
            <ProgressBar>
              <ProgressFill $percent={progressPercent} />
            </ProgressBar>
          </SessionsProgress>
        </>
      ) : (
        <PackageDetail>
          <PackageLabel>Plan Type</PackageLabel>
          <PackageValue $tone="gold">Unlimited</PackageValue>
        </PackageDetail>
      )}
    </PackageSection>
  );
};

export default SessionDetailPackageSummary;
