/**
 * PublicWaiverPage.V2 — Theme-Aware Cinematic Waiver
 * ===================================================
 * Same form logic and validation as V1, but fully theme-aware
 * with cinematic hero, ScrollReveal, and GlowButton.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import SignaturePad, { type SignaturePadHandle } from '../components/SignatureCapture/SignaturePad';
import {
  fetchCurrentWaiverVersions,
  submitPublicWaiver,
  type ActivityType,
  type WaiverSource,
  type WaiverVersionInfo,
  type WaiverSubmitResponse,
} from '../services/publicWaiverService';
import ParallaxHero from '../components/ui-kit/cinematic/ParallaxHero';
import ScrollReveal from '../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../components/ui-kit/cinematic/TypewriterText';
import SectionDivider from '../components/ui-kit/cinematic/SectionDivider';
import GlowButton from '../components/ui/buttons/GlowButton';
import logoImg from '../assets/Logo.png';

// ── Activity display names ───────────────────────────────────
const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'HOME_GYM_PT', label: 'Home Gym PT' },
  { value: 'PARK_TRAINING', label: 'Park Training' },
  { value: 'SWIMMING_LESSONS', label: 'Swimming Lessons' },
];

// ── Styled Components — All Theme-Aware ──────────────────────

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.body};
`;

const HeroLogo = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 20px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}40`
      : 'transparent'});
`;

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin-bottom: 0.5rem;
`;

const HeroSubtitle = styled.p`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: ${({ theme }) => theme.text.secondary};
  max-width: 500px;
  text-align: center;
`;

const FormContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;

  @media (max-width: 430px) {
    padding: 1.5rem 1rem 3rem;
  }
`;

const GlassCard = styled.div`
  background: ${({ theme }) =>
    theme.effects.glassmorphism
      ? `${theme.background.surface}`
      : theme.background.elevated};
  backdrop-filter: ${({ theme }) =>
    theme.effects.glassmorphism ? 'blur(16px)' : 'none'};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 20px;
  padding: 2.5rem;

  @media (max-width: 430px) {
    padding: 1.5rem 1rem;
    border-radius: 14px;
  }
`;

const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.15rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  margin: 2rem 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => `${theme.colors.primary}20`};
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
  border: 1px solid ${({ theme, $checked }) =>
    $checked ? theme.colors.primary : `${theme.text.muted}30`};
  border-radius: 10px;
  background: ${({ theme, $checked }) =>
    $checked ? `${theme.colors.primary}10` : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.body};

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text.muted};
`;

const Input = styled.input<{ $error?: boolean }>`
  padding: 0.75rem;
  min-height: 44px;
  background: ${({ theme }) => theme.background.elevated};
  border: 1px solid ${({ theme, $error }) =>
    $error ? '#f44336' : `${theme.text.muted}25`};
  border-radius: 10px;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.colors.primary}20`};
  }
`;

const WaiverTextContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => `${theme.colors.primary}20`};
  border-radius: 12px;
  padding: 1rem;
  background: ${({ theme }) => theme.background.elevated};
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.text.body};
  line-height: 1.6;
  font-family: ${({ theme }) => theme.fonts.ui};

  h1, h2, h3, h4 {
    color: ${({ theme }) => theme.colors.primary};
    margin-top: 1rem;
  }
  p { margin: 0.5rem 0; }
  ul, ol { padding-left: 1.5rem; }
`;

const WaiverVersionTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.primary};
  margin: 1rem 0 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid ${({ theme }) => `${theme.colors.primary}15`};
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
  border-radius: 10px;
  color: #f59e0b;
  margin-bottom: 1rem;
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const ConsentRow = styled.label<{ $required?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.5rem 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: ${({ $required }) => ($required ? 600 : 400)};
  color: ${({ theme }) => theme.text.body};

  input {
    width: 20px;
    height: 20px;
    accent-color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
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
  background: ${({ theme }) => `${theme.colors.primary}15`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const SuccessTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: 1.75rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 0.5rem;
`;

const ErrorText = styled.p`
  color: #f44336;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const LinkButton = styled.a`
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.75rem 2rem;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-family: ${({ theme }) => theme.fonts.ui};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => `${theme.colors.primary}10`};
  }
`;

const Spinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.muted};
`;

const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.text.body};

  input {
    width: 20px;
    height: 20px;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SignatureWrapper = styled.div`
  border: 1px solid ${({ theme }) => `${theme.colors.primary}25`};
  border-radius: 12px;
  overflow: hidden;
  background: ${({ theme }) => theme.background.elevated};
`;

// ── Helpers ──────────────────────────────────────────────────

function containsHtmlTags(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// ── Component ────────────────────────────────────────────────

type PageState = 'form' | 'submitting' | 'success' | 'error';

export default function PublicWaiverPageV2() {
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

  useEffect(() => {
    fetchCurrentWaiverVersions()
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, []);

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

  const hasMissingText = useMemo(
    () => relevantVersions.some((v) => !v.displayText),
    [relevantVersions],
  );

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
        <ParallaxHero videoSrc="/swan.mp4" overlayOpacity={0.7} minHeight="40vh">
          <HeroLogo src={logoImg} alt="SwanStudios Logo" />
        </ParallaxHero>
        <FormContainer>
          <GlassCard>
            <SuccessCard>
              <CheckIcon aria-hidden>&#10003;</CheckIcon>
              <SuccessTitle>Waiver Submitted</SuccessTitle>
              <p style={{ marginBottom: '0.5rem' }}>
                Thank you! Your waiver has been submitted successfully.
              </p>
              <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Confirmation ID: <strong>{submitResult.waiverRecordId}</strong>
              </p>
              <LinkButton href="/signup">Create an Account</LinkButton>
            </SuccessCard>
          </GlassCard>
        </FormContainer>
      </PageWrapper>
    );
  }

  // ── Loading View ───────────────────────────────────────────
  if (versionsLoading) {
    return (
      <PageWrapper>
        <ParallaxHero videoSrc="/swan.mp4" overlayOpacity={0.7} minHeight="40vh">
          <HeroLogo src={logoImg} alt="SwanStudios Logo" />
        </ParallaxHero>
        <FormContainer>
          <GlassCard>
            <Spinner>Loading waiver information...</Spinner>
          </GlassCard>
        </FormContainer>
      </PageWrapper>
    );
  }

  // ── Form View ──────────────────────────────────────────────
  return (
    <PageWrapper>
      {/* Hero */}
      <ParallaxHero videoSrc="/swan.mp4" overlayOpacity={0.65} minHeight="50vh">
        <HeroLogo src={logoImg} alt="SwanStudios Logo" />
        <HeroTitle>
          <TypewriterText text="Activity Waiver & Release" as="span" speed={50} />
        </HeroTitle>
        <HeroSubtitle>
          Please complete and sign the waiver below before your session.
        </HeroSubtitle>
      </ParallaxHero>

      <SectionDivider />

      <FormContainer>
        <ScrollReveal>
          <GlassCard>
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
                    Waiver text unavailable for some required sections — please contact staff.
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
            <SignatureWrapper>
              <SignaturePad ref={sigPadRef} onEnd={handleSignEnd} onClear={handleSignClear} />
            </SignatureWrapper>
            {attempted && !hasSignature && (
              <ErrorText>Please sign above before submitting.</ErrorText>
            )}

            {/* Section 7: Submit */}
            {pageState === 'error' && submitError && (
              <ErrorText style={{ marginTop: '1rem' }}>{submitError}</ErrorText>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <GlowButton
                text={pageState === 'submitting' ? 'Submitting...' : 'Submit Waiver'}
                variant="primary"
                size="large"
                fullWidth
                disabled={!isFormValid || pageState === 'submitting'}
                isLoading={pageState === 'submitting'}
                onClick={handleSubmit}
              />
            </div>
          </GlassCard>
        </ScrollReveal>
      </FormContainer>
    </PageWrapper>
  );
}
