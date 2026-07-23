/**
 * TrainerOnboardingPage — self-serve trainer application + contract e-sign.
 * ============================================================================
 * One-page sectioned form: identity → professional → credentials/insurance upload →
 * agreement e-sign → submit. Fail-closed: submitting lands in 'pending_review'; the
 * trainer is NOT active until an admin verifies insurance + certs. Reuses SignaturePad,
 * GlowButton, and the waiver-page form conventions. Stripe payout wiring is a future slice.
 *
 * @module pages/TrainerOnboarding/TrainerOnboardingPage
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { type SignaturePadHandle } from '../../components/SignatureCapture/SignaturePad';
import GlowButton from '../../components/ui/buttons/GlowButton';
import logoImg from '../../assets/Logo.png';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTrainerContract,
  fetchMyApplicationStatus,
  uploadTrainerCredential,
  submitTrainerApplication,
  type TrainerContract,
  type TrainerApplicationSummary,
} from '../../services/trainerOnboardingService';
import TrainerOnboardingForm, { type TrainerFormValues } from './TrainerOnboardingForm';
import * as S from './TrainerOnboardingStyles';

const SESSION_RATE = 175;
const PLATFORM_FEE = 0.15;
const STRIPE_EST = 0.03;
const takeHome = Math.round(SESSION_RATE * (1 - PLATFORM_FEE - STRIPE_EST));

/**
 * Render the contract body for display. The body is a trusted server-side constant
 * (config/trainerContract.mjs), but we HTML-escape first as defense-in-depth so no
 * markup can ever be injected even if the source changes — then apply only **bold**
 * and newline formatting. This keeps dangerouslySetInnerHTML safe by construction.
 */
function renderContract(body?: string): string {
  const escaped = (body || 'Loading agreement…')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

type FormState = TrainerFormValues;
const EMPTY: FormState = {
  fullName: '', email: '', phone: '', businessName: '', specialties: '', bio: '', yearsExperience: '',
  primaryCertification: '', certificationNumber: '', certificationExpiry: '', cprAedExpiry: '',
  insuranceCarrier: '', insurancePolicyNumber: '', insuranceExpiry: '',
};

const STATUS_COPY: Record<string, { icon: string; title: string; body: string }> = {
  pending_review: { icon: '⏳', title: "Application received", body: "We're verifying your insurance and certifications. You'll hear from us shortly — you can't take clients or payments until your account is activated." },
  approved: { icon: '✅', title: "You're approved", body: "Your trainer account is active. Head to your trainer dashboard to get started." },
  rejected: { icon: '✋', title: "Application not approved", body: "We couldn't approve this application. Check your email for details." },
  suspended: { icon: '⚠️', title: "Account suspended", body: "Your trainer account is currently suspended. Please contact us to restore it." },
};

const TrainerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const sigRef = useRef<SignaturePadHandle>(null);

  const [contract, setContract] = useState<TrainerContract | null>(null);
  const [existing, setExisting] = useState<TrainerApplicationSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [certFile, setCertFile] = useState<File | null>(null);
  const [insFile, setInsFile] = useState<File | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await fetchTrainerContract();
        if (alive) setContract(c);
        const s = await fetchMyApplicationStatus();
        if (alive && s) setExisting(s);
      } catch {
        if (alive) setError('Could not load the trainer agreement. Please refresh.');
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (user) setForm((f) => ({
      ...f,
      fullName: f.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: f.email || user.email || '',
    }));
  }, [user]);

  const set = useCallback((k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value })), []);

  const requiredConsentKeys = useMemo(
    () => (contract?.consents ?? []).filter((c) => c.required).map((c) => c.key),
    [contract],
  );

  const isValid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const consentsOk = requiredConsentKeys.every((k) => consents[k] === true);
    return form.fullName.trim().length > 0 && emailOk && consentsOk && hasSignature && !!contract;
  }, [form, consents, requiredConsentKeys, hasSignature, contract]);

  const handleSubmit = useCallback(async () => {
    setAttempted(true);
    setError(null);
    if (!isValid || !contract) return;
    setSubmitting(true);
    try {
      let certKey: string | undefined;
      let insKey: string | undefined;
      if (certFile) certKey = (await uploadTrainerCredential(certFile, 'certification')).key;
      if (insFile) insKey = (await uploadTrainerCredential(insFile, 'insurance')).key;

      const signatureData = sigRef.current?.toDataURL() || '';
      const yearsNum = parseInt(form.yearsExperience, 10);

      const res = await submitTrainerApplication({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        businessName: form.businessName.trim() || undefined,
        specialties: form.specialties.trim() || undefined,
        bio: form.bio.trim() || undefined,
        yearsExperience: Number.isFinite(yearsNum) ? yearsNum : undefined,
        primaryCertification: form.primaryCertification.trim() || undefined,
        certificationNumber: form.certificationNumber.trim() || undefined,
        certificationExpiry: form.certificationExpiry || undefined,
        cprAedExpiry: form.cprAedExpiry || undefined,
        certificationFileKey: certKey,
        insuranceCarrier: form.insuranceCarrier.trim() || undefined,
        insurancePolicyNumber: form.insurancePolicyNumber.trim() || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        insuranceFileKey: insKey,
        contractVersion: contract.version,
        signatureData,
        consentFlags: consents,
      });
      if (res.success) setDone(res.application?.status || 'pending_review');
      else setError(res.message || 'Submission failed.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, contract, certFile, insFile, form, consents]);

  // ── Gate: must be logged in ──
  if (!isAuthenticated) {
    return (
      <S.PageWrapper>
        <S.StatusCard>
          <S.StatusIcon>🔒</S.StatusIcon>
          <S.HeroTitle style={{ fontSize: '1.6rem' }}>Sign in to apply</S.HeroTitle>
          <S.HeroSubtitle>Create your SwanStudios account or log in, then come back to become a trainer.</S.HeroSubtitle>
          <div style={{ marginTop: '1.5rem' }}>
            <GlowButton text="Log in / Sign up" variant="primary" size="large" onClick={() => navigate('/signup')} />
          </div>
        </S.StatusCard>
      </S.PageWrapper>
    );
  }

  // ── Gate: block re-submission only for non-reapply statuses (must match the backend's
  // NON_REAPPLY_STATUSES). A 'rejected' applicant is intentionally NOT blocked — they can
  // fix the issues and reapply, so the form renders for them. `done` shows the fresh success card.
  const BLOCKING_STATUSES = ['pending_review', 'approved', 'suspended'];
  const activeStatus = done || (existing && BLOCKING_STATUSES.includes(existing.status) ? existing.status : null);
  if (activeStatus) {
    const c = STATUS_COPY[activeStatus] || STATUS_COPY.pending_review;
    return (
      <S.PageWrapper>
        <Helmet><title>Trainer Application — SwanStudios</title></Helmet>
        <S.StatusCard>
          <S.StatusIcon>{c.icon}</S.StatusIcon>
          <S.HeroTitle style={{ fontSize: '1.7rem' }}>{c.title}</S.HeroTitle>
          <S.HeroSubtitle>{c.body}</S.HeroSubtitle>
          {activeStatus === 'approved' && (
            <div style={{ marginTop: '1.5rem' }}>
              <GlowButton text="Go to Trainer Dashboard" variant="primary" size="large" onClick={() => navigate('/dashboard/trainer/overview')} />
            </div>
          )}
        </S.StatusCard>
      </S.PageWrapper>
    );
  }

  return (
    <S.PageWrapper>
      <Helmet>
        <title>Become a SwanStudios Trainer — Keep 82%, Bring Your Clients</title>
        <meta name="description" content="Join SwanStudios as an independent trainer. Keep 82% of what you bill, bring your own clients, and get the full coaching software stack. Fair, transparent, no hidden fees." />
      </Helmet>

      <S.HeroBand>
        <S.HeroLogo src={logoImg} alt="SwanStudios" />
        <S.HeroTitle>Train on your terms. Keep your book.</S.HeroTitle>
        <S.HeroSubtitle>
          Bring your clients onto SwanStudios and get the whole coaching stack — scheduling, workout logging, progress charts, and payments. You stay independent; we keep it real and we don't get stingy with your money.
        </S.HeroSubtitle>
        <S.EarningsCard>
          <S.EarningsKeep>You keep 82%</S.EarningsKeep>
          <S.EarningsNote>On a ${SESSION_RATE} session you take home ~${takeHome}. Just a 15% platform fee — no hidden costs.</S.EarningsNote>
        </S.EarningsCard>
      </S.HeroBand>

      <S.FormContainer>
        <TrainerOnboardingForm
          form={form}
          set={set}
          attempted={attempted}
          contract={contract}
          consents={consents}
          setConsents={setConsents}
          certFile={certFile}
          setCertFile={setCertFile}
          insFile={insFile}
          setInsFile={setInsFile}
          hasSignature={hasSignature}
          setHasSignature={setHasSignature}
          sigRef={sigRef}
          renderContract={renderContract}
        />

        {error && <S.ErrorText style={{ textAlign: 'center' }}>{error}</S.ErrorText>}

        <S.SubmitRow>
          <GlowButton
            text={submitting ? 'Submitting…' : 'Submit application'}
            variant="primary"
            size="large"
            isLoading={submitting}
            disabled={submitting || (attempted && !isValid)}
            onClick={handleSubmit}
          />
        </S.SubmitRow>
      </S.FormContainer>
    </S.PageWrapper>
  );
};

export default TrainerOnboardingPage;
