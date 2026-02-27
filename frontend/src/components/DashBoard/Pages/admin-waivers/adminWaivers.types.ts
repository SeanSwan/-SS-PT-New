/** Waiver Admin Types — Phase 5W-D */

export interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ConsentFlags {
  aiConsentAccepted: boolean;
  liabilityAccepted: boolean;
  mediaConsentAccepted: boolean;
  guardianAcknowledged: boolean;
}

export interface PendingMatch {
  id: number;
  confidenceScore: number | null;
  matchMethod: string | null;
  status: 'pending_review' | 'auto_linked' | 'approved' | 'rejected';
  candidateUser: UserSummary | null;
  reviewedByUser: UserSummary | null;
  reviewedAt: string | null;
}

export interface VersionLink {
  id: number;
  accepted: boolean;
  acceptedAt: string | null;
  waiverVersion: {
    id: number;
    waiverType: string;
    activityType: string | null;
    version: string;
    title: string;
    effectiveAt: string;
    retiredAt: string | null;
  };
}

export type WaiverStatus = 'pending_match' | 'linked' | 'superseded' | 'revoked';
export type WaiverSource = 'qr' | 'header_waiver' | 'admin_tablet' | 'in_app';

export interface WaiverRecordSummary {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: WaiverStatus;
  source: WaiverSource;
  signedAt: string;
  createdAt: string;
  user: UserSummary | null;
  consentFlags: ConsentFlags | null;
  pendingMatches: PendingMatch[];
}

export interface WaiverRecordDetail extends WaiverRecordSummary {
  dateOfBirth: string;
  activityTypes: string[];
  ipAddress: string | null;
  userAgent: string | null;
  submittedByGuardian: boolean;
  guardianName: string | null;
  versionLinks: VersionLink[];
}

export type BadgeLabel =
  | 'Waiver Signed'
  | 'AI Consent Signed'
  | 'Consent Missing'
  | 'Guardian Required'
  | 'Version Outdated'
  | 'Pending Match';

export interface WaiverDetailResponse {
  record: WaiverRecordDetail;
  badges: BadgeLabel[];
}
