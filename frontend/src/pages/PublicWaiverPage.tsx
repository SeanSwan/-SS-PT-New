/**
 * PublicWaiverPage — Phase 5W-G
 * ===============================
 * Public waiver submission form accessible via /waiver (QR code / header link).
 * Galaxy-Swan themed, glass card layout.
 *
 * Contract: WAIVER-CONSENT-QR-FLOW-CONTRACT.md §5, §5.2
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import SignaturePad, { type SignaturePadHandle } from '../components/SignatureCapture/SignaturePad';
import {
  fetchCurrentWaiverVersions,
  submitPublicWaiver,
  type ActivityType,
  type WaiverSource,
  type WaiverVersionInfo,
  type WaiverSubmitResponse,
} from '../services/publicWaiverService';

// ── Activity display names ───────────────────────────────────
const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'HOME_GYM_PT', label: 'Home Gym PT' },
  { value: 'PARK_TRAINING', label: 'Park Training' },
  { value: 'SWIMMING_LESSONS', label: 'Swimming Lessons' },
];

// ── Styled Components ────────────────────────────────────────

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #0a0a1a;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
`;

const GlassCard = styled.div`
  width: 100%;
  max-width: 720px;
  background: rgba(15, 15, 40, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 16px;
  padding: 2rem;
  color: #fff;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  color: #00ffff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.15rem;
  color: #00ffff;
  margin: 1.5rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.15);
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
`;

const CheckboxLabel = styled.label<{ $checked?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${(p) => (p.$checked ? '#00ffff' : 'rgba(255,255,255,0.15)')};
  border-radius: 8px;
  background: ${(p) => (p.$checked ? 'rgba(0,255,255,0.08)' : 'transparent')};
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;

  input {
    width: 18px;
    height: 18px;
    accent-color: #00ffff;
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const Input = styled.input<{ $error?: boolean }>`
  padding: 0.75rem;
  min-height: 44px;
  background: rgba(10, 10, 30, 0.6);
  border: 1px solid ${(p) => (p.$error ? '#f44' : 'rgba(255,255,255,0.15)')};
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;

  &:focus {
    border-color: #00ffff;
    outline: none;
  }
`;

const WaiverTextContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
  background: rgba(5, 5, 20, 0.6);
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;

  h1, h2, h3, h4 { color: #00ffff; margin-top: 1rem; }
  p { margin: 0.5rem 0; }
  ul, ol { padding-left: 1.5rem; }
`;

const WaiverVersionTitle = styled.h3`
  font-size: 1rem;
  color: #00ffff;
  margin: 1rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
`;

const PreText = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  margin: 0;
`;

const WarningBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  color: #f59e0b;
  margin-bottom: 1rem;
`;

const ConsentRow = styled.label<{ $required?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.5rem 0;
  cursor: pointer;
  font-weight: ${(p) => (p.$required ? 600 : 400)};

  input {
    width: 20px;
    height: 20px;
    accent-color: #00ffff;
    flex-shrink: 0;
  }
`;

const SubmitButton = styled.button<{ $disabled?: boolean }>`
  width: 100%;
  min-height: 48px;
  margin-top: 1.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: ${(p) =>
    p.$disabled
      ? 'rgba(100, 100, 100, 0.4)'
      : 'linear-gradient(135deg, #00d9ff, #00ffff)'};
  color: ${(p) => (p.$disabled ? 'rgba(255,255,255,0.4)' : '#0a0a1a')};
  font-size: 1.1rem;
  font-weight: 700;
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;
`;

const SuccessCard = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const CheckIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #00ffff;
`;

const ErrorText = styled.p`
  color: #f44;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const LinkButton = styled.a`
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
  border: 1px solid #00ffff;
  border-radius: 8px;
  color: #00ffff;
  text-decoration: none;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }
`;

const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.5);
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  cursor: pointer;
  margin-bottom: 0.5rem;

  input {
    width: 20px;
    height: 20px;
    accent-color: #00ffff;
  }
`;

// ── Helpers ──────────────────────────────────────────────────

function containsHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// ── Component ────────────────────────────────────────────────

type PageState = 'form' | 'submitting' | 'success' | 'error';

export default function PublicWaiverPage() {
  // Determine source from URL: ?source=qr → 'qr', otherwise 'header_waiver'
  const [searchParams] = useSearchParams();
  const waiverSource: WaiverSource = searchParams.get('source') === 'qr' ? 'qr' : 'header_waiver';

  // Form state
  const [selectedActivities, setSelectedActivities] = useState<Set<ActivityType>>(new Set());
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [aiConsentAccepted, setAiConsentAccepted] = useState(false);
  const [mediaConsentAccepted, setMediaConsentAccepted] = useState(false);
  const [submittedByGuardian, setSubmittedByGuardian] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianTypedSignature, setGuardianTypedSignature] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  // Page state
  const [pageState, setPageState] = useState<PageState>('form');
  const [versions, setVersions] = useState<WaiverVersionInfo[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<WaiverSubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [attempted, setAttempted] = useState(false);

  const sigPadRef = useRef<SignaturePadHandle>(null);

  // Load versions on mount
  useEffect(() => {
    fetchCurrentWaiverVersions()
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, []);

  // Filter relevant versions for selected activities
  const relevantVersions = useMemo(() => {
    if (selectedActivities.size === 0) return [];
    return versions.filter((v) => {
      if (v.waiverType === 'core' || v.waiverType === 'ai_notice') return true;
      if (v.waiverType === 'activity_addendum' && v.activityType) {
        return selectedActivities.has(v.activityType as ActivityType);
      }
      return false;
    });
  }, [versions, selectedActivities]);

  // Check if any required version has missing text
  const hasMissingText = useMemo(
    () => relevantVersions.some((v) => !v.displayText),
    [relevantVersions],
  );

  // Validation
  const isFormValid = useMemo(() => {
    if (selectedActivities.size === 0) return false;
    if (versionsLoading || versions.length === 0) return false;
    if (relevantVersions.length === 0) return false;
    if (hasMissingText) return false;
    if (!fullName.trim()) return false;
    if (!dateOfBirth) return false;
    if (!email.trim() && !phone.trim()) return false;
    if (!liabilityAccepted) return false;
    if (!hasSignature) return false;
    if (submittedByGuardian && (!guardianName.trim() || !guardianTypedSignature.trim())) {
      return false;
    }
    return true;
  }, [
    selectedActivities, versionsLoading, versions, relevantVersions,
    hasMissingText, fullName, dateOfBirth, email, phone,
    liabilityAccepted, hasSignature, submittedByGuardian,
    guardianName, guardianTypedSignature,
  ]);

  const handleSignEnd = useCallback(() => setHasSignature(true), []);
  const handleSignClear = useCallback(() => setHasSignature(false), []);

  const toggleActivity = useCallback((activity: ActivityType) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activity)) next.delete(activity);
      else next.add(activity);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    setAttempted(true);
    if (!isFormValid || sigPadRef.current?.isEmpty()) return;

    setPageState('submitting');
    setSubmitError('');

    try {
      const result = await submitPublicWaiver({
        fullName: fullName.trim(),
        dateOfBirth,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        activityTypes: Array.from(selectedActivities),
        signatureData: sigPadRef.current?.toDataURL() || '',
        liabilityAccepted,
        aiConsentAccepted,
        mediaConsentAccepted,
        source: waiverSource,
        submittedByGuardian: submittedByGuardian || undefined,
        guardianName: submittedByGuardian ? guardianName.trim() : undefined,
        guardianTypedSignature: submittedByGuardian ? guardianTypedSignature.trim() : undefined,
      });

      if (result.success) {
        setSubmitResult(result);
        setPageState('success');
      } else {
        setSubmitError(result.error || 'Submission failed');
        setPageState('error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      const axiosError = err as { response?: { data?: { error?: string } } };
      setSubmitError(axiosError?.response?.data?.error || msg);
      setPageState('error');
    }
  };

  // ── Success View ───────────────────────────────────────────
  if (pageState === 'success' && submitResult) {
    return (
      <PageWrapper>
        <GlassCard>
          <SuccessCard>
            <CheckIcon aria-hidden>✓</CheckIcon>
            <Title>Waiver Submitted</Title>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
              Thank you! Your waiver has been submitted successfully.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
              Confirmation ID: <strong style={{ color: '#00ffff' }}>{submitResult.waiverRecordId}</strong>
            </p>
            <LinkButton href="/signup">Create an Account</LinkButton>
          </SuccessCard>
        </GlassCard>
      </PageWrapper>
    );
  }

  // ── Loading View ───────────────────────────────────────────
  if (versionsLoading) {
    return (
      <PageWrapper>
        <GlassCard>
          <Spinner>Loading waiver information...</Spinner>
        </GlassCard>
      </PageWrapper>
    );
  }

  // ── Form View ──────────────────────────────────────────────
  return (
    <PageWrapper>
      <GlassCard>
        <Title>Liability Waiver</Title>
        <Subtitle>Please complete and sign the waiver below.</Subtitle>

        {/* Section 1: Activity Selection */}
        <SectionTitle>1. Select Activities</SectionTitle>
        <CheckboxGrid>
          {ACTIVITY_OPTIONS.map((opt) => (
            <CheckboxLabel key={opt.value} $checked={selectedActivities.has(opt.value)}>
              <input
                type="checkbox"
                checked={selectedActivities.has(opt.value)}
                onChange={() => toggleActivity(opt.value)}
              />
              {opt.label}
            </CheckboxLabel>
          ))}
        </CheckboxGrid>

        {/* Section 2: Waiver Text Display */}
        {selectedActivities.size > 0 && (
          <>
            <SectionTitle>2. Read the Waiver</SectionTitle>
            {hasMissingText && (
              <WarningBanner>
                ⚠ Waiver text unavailable for some required sections — please contact staff.
              </WarningBanner>
            )}
            <WaiverTextContainer>
              {relevantVersions.map((v) => (
                <div key={v.id}>
                  <WaiverVersionTitle>{v.title}</WaiverVersionTitle>
                  {v.displayText ? (
                    containsHtmlTags(v.displayText) ? (
                      <div dangerouslySetInnerHTML={{ __html: v.displayText }} />
                    ) : (
                      <PreText>{v.displayText}</PreText>
                    )
                  ) : (
                    <p style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                      Text not available
                    </p>
                  )}
                </div>
              ))}
            </WaiverTextContainer>
          </>
        )}

        {/* Section 3: Identity */}
        <SectionTitle>3. Your Information</SectionTitle>
        <InputGroup>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            $error={attempted && !fullName.trim()}
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            $error={attempted && !dateOfBirth}
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            $error={attempted && !email.trim() && !phone.trim()}
          />
        </InputGroup>
        <InputGroup>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            $error={attempted && !email.trim() && !phone.trim()}
          />
        </InputGroup>
        {attempted && !email.trim() && !phone.trim() && (
          <ErrorText>At least one of email or phone is required.</ErrorText>
        )}

        {/* Section 4: Guardian */}
        <SectionTitle>4. Guardian (if applicable)</SectionTitle>
        <ToggleRow>
          <input
            type="checkbox"
            checked={submittedByGuardian}
            onChange={(e) => setSubmittedByGuardian(e.target.checked)}
          />
          This waiver is being signed by a parent or legal guardian
        </ToggleRow>
        {submittedByGuardian && (
          <>
            <InputGroup>
              <Label htmlFor="guardianName">Guardian Name *</Label>
              <Input
                id="guardianName"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian's full name"
                $error={attempted && submittedByGuardian && !guardianName.trim()}
              />
            </InputGroup>
            <InputGroup>
              <Label htmlFor="guardianSig">Guardian Typed Signature *</Label>
              <Input
                id="guardianSig"
                value={guardianTypedSignature}
                onChange={(e) => setGuardianTypedSignature(e.target.value)}
                placeholder="Type full name as signature"
                $error={attempted && submittedByGuardian && !guardianTypedSignature.trim()}
              />
            </InputGroup>
          </>
        )}

        {/* Section 5: Consent */}
        <SectionTitle>5. Consent</SectionTitle>
        <ConsentRow $required>
          <input
            type="checkbox"
            checked={liabilityAccepted}
            onChange={(e) => setLiabilityAccepted(e.target.checked)}
          />
          <span>
            <strong>I accept the liability waiver</strong> and acknowledge the risks described above. *
          </span>
        </ConsentRow>
        <ConsentRow>
          <input
            type="checkbox"
            checked={aiConsentAccepted}
            onChange={(e) => setAiConsentAccepted(e.target.checked)}
          />
          I consent to AI-powered features and personalized workout recommendations.
        </ConsentRow>
        <ConsentRow>
          <input
            type="checkbox"
            checked={mediaConsentAccepted}
            onChange={(e) => setMediaConsentAccepted(e.target.checked)}
          />
          I consent to photos/videos being taken during sessions for promotional purposes.
        </ConsentRow>

        {/* Section 6: Signature */}
        <SectionTitle>6. Signature</SectionTitle>
        <SignaturePad ref={sigPadRef} onEnd={handleSignEnd} onClear={handleSignClear} />
        {attempted && !hasSignature && (
          <ErrorText>Please sign above before submitting.</ErrorText>
        )}

        {/* Section 7: Submit */}
        {pageState === 'error' && submitError && (
          <ErrorText style={{ marginTop: '1rem' }}>{submitError}</ErrorText>
        )}

        <SubmitButton
          type="button"
          $disabled={!isFormValid || pageState === 'submitting'}
          disabled={!isFormValid || pageState === 'submitting'}
          onClick={handleSubmit}
        >
          {pageState === 'submitting' ? 'Submitting...' : 'Submit Waiver'}
        </SubmitButton>
      </GlassCard>
    </PageWrapper>
  );
}
