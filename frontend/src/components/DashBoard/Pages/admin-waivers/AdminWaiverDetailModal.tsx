import React from 'react';
import type { WaiverRecordDetail, BadgeLabel, PendingMatch } from './adminWaivers.types';
import {
  Modal, ModalContent, ModalTitle, Section, SectionLabel,
  InfoGrid, InfoItem, ConsentGrid, ConsentItem, ContractBadge,
  SignatureImage, MatchCard, MatchRow, ConfidenceBar, ActionButton, ButtonRow, CloseButton,
} from './adminWaivers.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface Props {
  record: WaiverRecordDetail | null;
  badges: BadgeLabel[];
  onClose: () => void;
  onApproveMatch: (matchId: number) => void;
  onRejectMatch: (matchId: number) => void;
  onRevoke: (recordId: number) => void;
  onOpenManualLink: (recordId: number) => void;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const AdminWaiverDetailModal: React.FC<Props> = ({
  record, badges, onClose, onApproveMatch, onRejectMatch, onRevoke, onOpenManualLink,
}) => {
  if (!record) return null;

  const canAct = record.status !== 'revoked' && record.status !== 'superseded';
  const pendingMatches = record.pendingMatches?.filter((m: PendingMatch) => m.status === 'pending_review') ?? [];

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Waiver Record #{record.id}</ModalTitle>

        {/* Contract §11.2 Badges */}
        {badges.length > 0 && (
          <Section>
            {badges.map((b) => (
              <ContractBadge key={b} $label={b}>{b}</ContractBadge>
            ))}
          </Section>
        )}

        {/* Identity */}
        <Section>
          <SectionLabel>Identity</SectionLabel>
          <InfoGrid>
            <InfoItem><strong>Full Name</strong>{record.fullName}</InfoItem>
            <InfoItem><strong>Date of Birth</strong>{record.dateOfBirth}</InfoItem>
            <InfoItem><strong>Email</strong>{record.email || '—'}</InfoItem>
            <InfoItem><strong>Phone</strong>{record.phone || '—'}</InfoItem>
            <InfoItem><strong>Source</strong>{record.source.replace('_', ' ')}</InfoItem>
            <InfoItem><strong>Signed</strong>{formatDate(record.signedAt)}</InfoItem>
          </InfoGrid>
        </Section>

        {/* Guardian */}
        {record.submittedByGuardian && (
          <Section>
            <SectionLabel>Guardian</SectionLabel>
            <InfoGrid>
              <InfoItem><strong>Guardian Name</strong>{record.guardianName || '—'}</InfoItem>
            </InfoGrid>
          </Section>
        )}

        {/* Consent Flags */}
        {record.consentFlags && (
          <Section>
            <SectionLabel>Consent Flags</SectionLabel>
            <ConsentGrid>
              <ConsentItem $accepted={record.consentFlags.liabilityAccepted}>
                {record.consentFlags.liabilityAccepted ? '✓' : '✗'} Liability
              </ConsentItem>
              <ConsentItem $accepted={record.consentFlags.aiConsentAccepted}>
                {record.consentFlags.aiConsentAccepted ? '✓' : '✗'} Swan Coach Consent
              </ConsentItem>
              <ConsentItem $accepted={record.consentFlags.mediaConsentAccepted}>
                {record.consentFlags.mediaConsentAccepted ? '✓' : '✗'} Media
              </ConsentItem>
              <ConsentItem $accepted={record.consentFlags.guardianAcknowledged}>
                {record.consentFlags.guardianAcknowledged ? '✓' : '✗'} Guardian
              </ConsentItem>
            </ConsentGrid>
          </Section>
        )}

        {/* Signature */}
        {record.signatureData && (
          <Section>
            <SectionLabel>Signature</SectionLabel>
            <SignatureImage src={record.signatureData} alt={`Signature of ${record.fullName}`} />
          </Section>
        )}

        {/* Waiver Versions */}
        {record.versionLinks && record.versionLinks.length > 0 && (
          <Section>
            <SectionLabel>Waiver Versions</SectionLabel>
            {record.versionLinks.map((vl) => (
              <MatchCard key={vl.id}>
                <MatchRow>
                  <div>
                    <StyledBox as="strong" $style={{ color: '#60C0F0' }}>{vl.waiverVersion.title}</StyledBox>
                    <StyledBox as="div" $style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                      {vl.waiverVersion.waiverType}{vl.waiverVersion.activityType ? ` / ${vl.waiverVersion.activityType}` : ''} — v{vl.waiverVersion.version}
                    </StyledBox>
                  </div>
                  <StyledBox as={ConsentItem} $accepted={vl.accepted} $style={{ margin: 0, padding: '4px 10px' }}>
                    {vl.accepted ? 'Accepted' : 'Not accepted'}
                  </StyledBox>
                </MatchRow>
              </MatchCard>
            ))}
          </Section>
        )}

        {/* Pending Matches */}
        <Section>
          <SectionLabel>Pending Matches ({pendingMatches.length})</SectionLabel>
          {pendingMatches.length === 0 ? (
            <StyledBox as="div" $style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              No pending matches.
            </StyledBox>
          ) : (
            pendingMatches.map((m: PendingMatch) => (
              <MatchCard key={m.id}>
                <MatchRow>
                  <div>
                    <StyledBox as="div" $style={{ fontWeight: 600 }}>
                      {m.candidateUser
                        ? `${m.candidateUser.firstName} ${m.candidateUser.lastName}`
                        : 'Unknown user'}
                    </StyledBox>
                    <StyledBox as="div" $style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                      {m.candidateUser?.email || ''}{m.matchMethod ? ` · ${m.matchMethod}` : ''}
                    </StyledBox>
                  </div>
                  <StyledBox as="div" $style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.confidenceScore != null && (
                      <StyledBox as="div" $style={{ textAlign: 'center' }}>
                        <StyledBox as="div" $style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Confidence</StyledBox>
                        <StyledBox as="div" $style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {Math.round(m.confidenceScore * 100)}%
                        </StyledBox>
                        <ConfidenceBar $score={m.confidenceScore} />
                      </StyledBox>
                    )}
                    <ActionButton $variant="approve" onClick={() => onApproveMatch(m.id)} disabled={!canAct || !m.candidateUser}>
                      Approve
                    </ActionButton>
                    <ActionButton $variant="reject" onClick={() => onRejectMatch(m.id)} disabled={!canAct}>
                      Reject
                    </ActionButton>
                  </StyledBox>
                </MatchRow>
              </MatchCard>
            ))
          )}
        </Section>

        {/* Actions */}
        <ButtonRow>
          {canAct && record.status !== 'linked' && (
            <ActionButton $variant="link" onClick={() => onOpenManualLink(record.id)}>
              Manual Link
            </ActionButton>
          )}
          {canAct && (
            <ActionButton $variant="revoke" onClick={() => onRevoke(record.id)}>
              Revoke
            </ActionButton>
          )}
          <CloseButton onClick={onClose}>Close</CloseButton>
        </ButtonRow>
      </ModalContent>
    </Modal>
  );
};

export default AdminWaiverDetailModal;
