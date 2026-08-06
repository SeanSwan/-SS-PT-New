/**
 * PublicWaiverPage V3 — SwanStudios public waiver (/waiver)
 * ==========================================================
 * BLUEPRINT
 * Purpose : Capture a signed liability waiver + consents from anyone — QR walk-up,
 *           header link, or a logged-in client sent here by the waiver gate.
 * Route   : `/waiver` (routes/main-routes.tsx), `?source=qr`, `?returnUrl=/…`
 * Data    : GET /api/public/waivers/versions/current · POST /api/public/waivers/submit
 * Logic   : ./waiver/usePublicWaiverForm  ·  Copy: ./waiver/waiverCopy
 * Rebuilt : SWA-140 (2026-08-04) after a three-model review found the page was
 *           unusable by keyboard, silently dead-ended when documents failed to
 *           load, let minors sign for themselves, and threw away the returnUrl
 *           the gate had just written.
 *
 * Composition only — state and validation live in the hook, strings in the copy
 * module, styles in ./waiver/PublicWaiverPage.styles.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import SignaturePad, { type SignaturePadHandle } from '../components/SignatureCapture/SignaturePad';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/Logo.png';

import { WAIVER_COPY } from './waiver/waiverCopy';
import { usePublicWaiverForm, safeReturnUrl } from './waiver/usePublicWaiverForm';
import WaiverDocumentReader from './waiver/WaiverDocumentReader';
import WaiverReceipt from './waiver/WaiverReceipt';
import type { ActivityType, WaiverSource } from '../services/publicWaiverService';
import {
  PageWrapper, Header, Logo, PageTitle, PageSubtitle, Container, Card, Step, StepHeading,
  StepHelp, ActivityGrid, ActivityCard, ActivityLabel, ActivityDetail, FieldGrid, Field,
  Label, Input, FieldHelp, ConsentCard, ConsentText, ConsentNote, Restatement, Notice,
  SubmitBar, SubmitButton, RetryButton, HelpFooter,
} from './waiver/PublicWaiverPage.styles';

const ACTIVITY_ORDER: ActivityType[] = ['HOME_GYM_PT', 'PARK_TRAINING', 'SWIMMING_LESSONS'];

export default function PublicWaiverPageV3() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const source: WaiverSource = searchParams.get('source') === 'qr' ? 'qr' : 'header_waiver';
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));

  const sigPadRef = useRef<SignaturePadHandle>(null);

  const form = usePublicWaiverForm({
    source,
    returnUrl,
    isSignatureEmpty: () => sigPadRef.current?.isEmpty() ?? true,
    getSignatureData: () => sigPadRef.current?.toDataURL() ?? '',
  });

  const role = String(user?.role || '').toLowerCase();
  const isClient = role === 'client' || role === 'user';

  const requiredIds = useMemo(
    () => new Set(form.requiredVersions.map((v) => v.id)),
    [form.requiredVersions],
  );

  const showProblem = useCallback(
    (key: string) => form.attempted && form.validation.problems.includes(key),
    [form.attempted, form.validation.problems],
  );

  /**
   * After signing, send the user where they were actually going. The gate
   * writes `?returnUrl=` and the old page ignored it, so a client redirected
   * out of their progress view landed on a hardcoded dashboard route instead.
   */
  const handleContinue = useCallback(async () => {
    if (isClient) {
      try { await refreshUser(); } catch { /* the receipt stays valid regardless */ }
      navigate(returnUrl || '/user-dashboard', { replace: true });
      return;
    }
    navigate(returnUrl || '/', { replace: true });
  }, [isClient, refreshUser, navigate, returnUrl]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await form.submit();
  }, [form]);

  // ── Success ───────────────────────────────────────────────────
  if (form.submitState === 'success' && form.submitResult) {
    return (
      <PageWrapper>
        <Header>
          <Logo src={logoImg} alt="SwanStudios" />
        </Header>
        <Container>
          <Card>
            <WaiverReceipt
              result={form.submitResult}
              firstName={form.fields.fullName.trim().split(/\s+/)[0]}
              isLoggedInClient={isClient}
              onContinue={handleContinue}
            />
          </Card>
        </Container>
      </PageWrapper>
    );
  }

  const heading = form.isReconsent ? WAIVER_COPY.page.reconsentTitle : WAIVER_COPY.page.title;
  const subheading = form.isReconsent ? WAIVER_COPY.page.reconsentSubtitle : WAIVER_COPY.page.subtitle;

  return (
    <PageWrapper>
      <Header>
        <Logo src={logoImg} alt="SwanStudios" />
        <PageTitle>{heading}</PageTitle>
        <PageSubtitle>{subheading}</PageSubtitle>
      </Header>

      <Container>
        <Card>
          {/* The documents could not be loaded. This used to render nothing at
              all — the form appeared normal and submit stayed disabled forever. */}
          {form.loadState === 'error' && (
            <Notice $tone="danger" role="alert">
              <strong>{WAIVER_COPY.errors.versionsTitle}</strong>
              {WAIVER_COPY.errors.versionsBody}
              <div>
                <RetryButton type="button" onClick={() => void form.reloadVersions()}>
                  {WAIVER_COPY.errors.retry}
                </RetryButton>
              </div>
            </Notice>
          )}

          {form.loadState === 'empty' && (
            <Notice $tone="danger" role="alert">
              <strong>{WAIVER_COPY.errors.emptyVersionsTitle}</strong>
              {WAIVER_COPY.errors.emptyVersionsBody}
            </Notice>
          )}

          {form.loadState === 'loading' && (
            <Notice $tone="info" aria-live="polite">{WAIVER_COPY.loading.documents}</Notice>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Step 1: where we'll train ── */}
            <Step>
              <StepHeading>{WAIVER_COPY.steps.activities.heading}</StepHeading>
              <StepHelp>{WAIVER_COPY.steps.activities.help}</StepHelp>
              <ActivityGrid>
                {ACTIVITY_ORDER.map((activity) => {
                  const copy = WAIVER_COPY.activities[activity];
                  const selected = form.selectedActivities.has(activity);
                  return (
                    <ActivityCard key={activity} $selected={selected}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => form.toggleActivity(activity)}
                      />
                      <span>
                        <ActivityLabel>{copy.label}</ActivityLabel>
                        <ActivityDetail>{copy.detail}</ActivityDetail>
                      </span>
                    </ActivityCard>
                  );
                })}
              </ActivityGrid>
              {showProblem('activities') && (
                <FieldHelp role="alert">{WAIVER_COPY.errors.activitiesRequired}</FieldHelp>
              )}
            </Step>

            {/* ── Step 2: read the documents ── */}
            {form.relevantVersions.length > 0 && (
              <Step>
                <StepHeading>{WAIVER_COPY.steps.documents.heading}</StepHeading>
                <StepHelp>{WAIVER_COPY.steps.documents.help}</StepHelp>
                {form.hasMissingText && (
                  <Notice $tone="warn" role="alert">
                    <strong>{WAIVER_COPY.errors.versionsTitle}</strong>
                    {WAIVER_COPY.errors.versionsBody}
                  </Notice>
                )}
                <WaiverDocumentReader
                  versions={form.relevantVersions}
                  attestedIds={form.attestedVersionIds}
                  onAttest={form.attestVersion}
                  requiredIds={requiredIds}
                />
                {showProblem('attestation') && (
                  <FieldHelp role="alert">{WAIVER_COPY.errors.documentsUnread}</FieldHelp>
                )}
              </Step>
            )}

            {/* ── Step 3: about you ── */}
            <Step>
              <StepHeading>{WAIVER_COPY.steps.about.heading}</StepHeading>
              <StepHelp>{WAIVER_COPY.steps.about.help}</StepHelp>
              <FieldGrid>
                <Field>
                  <Label htmlFor="waiver-name">
                    {form.isMinor
                      ? WAIVER_COPY.fields.participantName.label
                      : WAIVER_COPY.fields.fullName.label}
                  </Label>
                  <Input
                    id="waiver-name"
                    value={form.fields.fullName}
                    onChange={(e) => form.setField('fullName', e.target.value)}
                    placeholder={WAIVER_COPY.fields.fullName.placeholder}
                    $invalid={showProblem('fullName')}
                    aria-invalid={showProblem('fullName')}
                    aria-required="true"
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <Label htmlFor="waiver-dob">{WAIVER_COPY.fields.dateOfBirth.label}</Label>
                  <Input
                    id="waiver-dob"
                    type="date"
                    value={form.fields.dateOfBirth}
                    onChange={(e) => form.setField('dateOfBirth', e.target.value)}
                    $invalid={showProblem('dateOfBirth')}
                    aria-invalid={showProblem('dateOfBirth')}
                    aria-required="true"
                  />
                  <FieldHelp>{WAIVER_COPY.fields.dateOfBirth.help}</FieldHelp>
                </Field>

                <Field>
                  <Label htmlFor="waiver-email">{WAIVER_COPY.fields.email.label}</Label>
                  <Input
                    id="waiver-email"
                    type="email"
                    value={form.fields.email}
                    onChange={(e) => form.setField('email', e.target.value)}
                    placeholder={WAIVER_COPY.fields.email.placeholder}
                    $invalid={showProblem('contact')}
                    aria-invalid={showProblem('contact')}
                    autoComplete="email"
                  />
                </Field>

                <Field>
                  <Label htmlFor="waiver-phone">{WAIVER_COPY.fields.phone.label}</Label>
                  <Input
                    id="waiver-phone"
                    type="tel"
                    value={form.fields.phone}
                    onChange={(e) => form.setField('phone', e.target.value)}
                    placeholder={WAIVER_COPY.fields.phone.placeholder}
                    $invalid={showProblem('contact')}
                    aria-invalid={showProblem('contact')}
                    autoComplete="tel"
                  />
                </Field>
              </FieldGrid>
              <FieldHelp>{WAIVER_COPY.fields.contactHelp}</FieldHelp>
              {showProblem('contact') && (
                <FieldHelp role="alert">{WAIVER_COPY.errors.contactRequired}</FieldHelp>
              )}
            </Step>

            {/* ── Step 4: guardian — opened by date of birth, never self-declared ── */}
            {form.isMinor && (
              <Step>
                <StepHeading>{WAIVER_COPY.steps.guardian.heading}</StepHeading>
                <StepHelp>{WAIVER_COPY.steps.guardian.help}</StepHelp>
                <Notice $tone="warn">{WAIVER_COPY.guardian.autoNotice}</Notice>

                <FieldGrid>
                  <Field>
                    <Label htmlFor="waiver-guardian">{WAIVER_COPY.fields.guardianName.label}</Label>
                    <Input
                      id="waiver-guardian"
                      value={form.fields.guardianName}
                      onChange={(e) => form.setField('guardianName', e.target.value)}
                      placeholder={WAIVER_COPY.fields.guardianName.placeholder}
                      $invalid={showProblem('guardian')}
                      aria-invalid={showProblem('guardian')}
                      aria-required="true"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="waiver-emergency-name">
                      {WAIVER_COPY.fields.emergencyContactName.label}
                    </Label>
                    <Input
                      id="waiver-emergency-name"
                      value={form.fields.emergencyContactName}
                      onChange={(e) => form.setField('emergencyContactName', e.target.value)}
                      placeholder={WAIVER_COPY.fields.emergencyContactName.placeholder}
                      $invalid={showProblem('emergency')}
                      aria-invalid={showProblem('emergency')}
                      aria-required="true"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="waiver-emergency-phone">
                      {WAIVER_COPY.fields.emergencyContactPhone.label}
                    </Label>
                    <Input
                      id="waiver-emergency-phone"
                      type="tel"
                      value={form.fields.emergencyContactPhone}
                      onChange={(e) => form.setField('emergencyContactPhone', e.target.value)}
                      placeholder={WAIVER_COPY.fields.emergencyContactPhone.placeholder}
                      $invalid={showProblem('emergency')}
                      aria-invalid={showProblem('emergency')}
                      aria-required="true"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="waiver-assent">{WAIVER_COPY.fields.minorAssent.label}</Label>
                    <Input
                      id="waiver-assent"
                      value={form.fields.minorAssentName}
                      onChange={(e) => form.setField('minorAssentName', e.target.value)}
                      placeholder={WAIVER_COPY.fields.minorAssent.placeholder}
                    />
                  </Field>
                </FieldGrid>

                <ConsentCard $required>
                  <input
                    type="checkbox"
                    id="waiver-guardian-attest"
                    checked={form.guardianAttested}
                    onChange={(e) => form.setGuardianAttested(e.target.checked)}
                    aria-required="true"
                  />
                  <Label as="label" htmlFor="waiver-guardian-attest">
                    <ConsentText>{WAIVER_COPY.guardian.attestation}</ConsentText>
                  </Label>
                </ConsentCard>

                {showProblem('guardian') && (
                  <FieldHelp role="alert">{WAIVER_COPY.errors.guardianRequired}</FieldHelp>
                )}
                {showProblem('emergency') && (
                  <FieldHelp role="alert">{WAIVER_COPY.errors.emergencyRequired}</FieldHelp>
                )}
              </Step>
            )}

            {/* ── Step 5: consents, each its own card ── */}
            <Step>
              <StepHeading>{WAIVER_COPY.steps.consent.heading}</StepHeading>
              <StepHelp>{WAIVER_COPY.steps.consent.help}</StepHelp>

              <ConsentCard $required>
                <input
                  type="checkbox"
                  id="consent-liability"
                  checked={form.liabilityAccepted}
                  onChange={(e) => form.setLiabilityAccepted(e.target.checked)}
                  aria-required="true"
                  aria-invalid={showProblem('liability')}
                />
                <label htmlFor="consent-liability">
                  <ConsentText>{WAIVER_COPY.consents.liability.label}</ConsentText>
                  <ConsentNote>{WAIVER_COPY.consents.liability.note}</ConsentNote>
                </label>
              </ConsentCard>

              <ConsentCard>
                <input
                  type="checkbox"
                  id="consent-swan-coach"
                  checked={form.swanCoachAccepted}
                  onChange={(e) => form.setSwanCoachAccepted(e.target.checked)}
                />
                <label htmlFor="consent-swan-coach">
                  <ConsentText>{WAIVER_COPY.consents.swanCoach.label}</ConsentText>
                  <ConsentNote>{WAIVER_COPY.consents.swanCoach.note}</ConsentNote>
                </label>
              </ConsentCard>

              <ConsentCard>
                <input
                  type="checkbox"
                  id="consent-media"
                  checked={form.mediaAccepted}
                  onChange={(e) => form.setMediaAccepted(e.target.checked)}
                />
                <label htmlFor="consent-media">
                  <ConsentText>{WAIVER_COPY.consents.media.label}</ConsentText>
                  <ConsentNote>{WAIVER_COPY.consents.media.note}</ConsentNote>
                </label>
              </ConsentCard>

              {showProblem('liability') && (
                <FieldHelp role="alert">{WAIVER_COPY.errors.liabilityRequired}</FieldHelp>
              )}
            </Step>

            {/* ── Step 6: sign ── */}
            <Step>
              <StepHeading>{WAIVER_COPY.steps.signature.heading}</StepHeading>
              <StepHelp>{WAIVER_COPY.steps.signature.help}</StepHelp>

              {/* Conspicuousness: the operative terms restated in plain words,
                  immediately above the signature rather than 400px up the page. */}
              <Restatement>
                <h3>{WAIVER_COPY.restatement.heading}</h3>
                <ul>
                  {WAIVER_COPY.restatement.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </Restatement>

              {form.isMinor && <FieldHelp>{WAIVER_COPY.guardian.signatureLabel}</FieldHelp>}

              <SignaturePad
                ref={sigPadRef}
                onEnd={() => form.setHasSignature(true)}
                onClear={() => form.setHasSignature(false)}
              />

              {showProblem('signature') && (
                <FieldHelp role="alert">{WAIVER_COPY.errors.signatureRequired}</FieldHelp>
              )}
            </Step>

            {/* ── Submit ── */}
            <SubmitBar>
              {form.submitError && (
                <Notice $tone="danger" role="alert" style={{ width: '100%' }}>
                  <strong>{form.submitError.title}</strong>
                  {form.submitError.detail}
                </Notice>
              )}

              <SubmitButton
                type="submit"
                disabled={form.submitState === 'submitting' || form.loadState !== 'ready'}
              >
                {form.submitState === 'submitting'
                  ? WAIVER_COPY.submit.busy
                  : WAIVER_COPY.submit.idle}
              </SubmitButton>

              {form.requiredVersions.length > 0 && (
                <FieldHelp>{WAIVER_COPY.submit.documentCount(form.relevantVersions.length)}</FieldHelp>
              )}
            </SubmitBar>
          </form>

          <HelpFooter>
            <strong>{WAIVER_COPY.help.heading}</strong>
            {WAIVER_COPY.help.body}
          </HelpFooter>
        </Card>
      </Container>
    </PageWrapper>
  );
}
