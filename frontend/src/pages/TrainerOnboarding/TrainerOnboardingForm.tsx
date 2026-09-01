/**
 * TrainerOnboardingForm — the four sectioned form cards (identity, coaching, credentials, agreement).
 * ============================================================================
 * Presentational child of TrainerOnboardingPage. Keeps the page an orchestrator (gates,
 * hero, submit state) under the 300-line cap. All state/handlers are owned by the page and
 * passed in; this component renders fields + the e-sign.
 *
 * @module pages/TrainerOnboarding/TrainerOnboardingForm
 */
import React from 'react';
import SignaturePad, { type SignaturePadHandle } from '../../components/SignatureCapture/SignaturePad';
import type { TrainerContract } from '../../services/trainerOnboardingService';
import * as S from './TrainerOnboardingStyles';

export interface TrainerFormValues {
  fullName: string; email: string; phone: string; businessName: string;
  specialties: string; bio: string; yearsExperience: string;
  primaryCertification: string; certificationNumber: string; certificationExpiry: string; cprAedExpiry: string;
  insuranceCarrier: string; insurancePolicyNumber: string; insuranceExpiry: string;
}

type FieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

interface Props {
  form: TrainerFormValues;
  set: (k: keyof TrainerFormValues) => FieldChange;
  attempted: boolean;
  contract: TrainerContract | null;
  consents: Record<string, boolean>;
  setConsents: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  certFile: File | null;
  setCertFile: (f: File | null) => void;
  insFile: File | null;
  setInsFile: (f: File | null) => void;
  hasSignature: boolean;
  setHasSignature: (v: boolean) => void;
  sigRef: React.RefObject<SignaturePadHandle>;
  renderContract: (body?: string) => string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TrainerOnboardingForm: React.FC<Props> = ({
  form, set, attempted, contract, consents, setConsents,
  certFile, setCertFile, insFile, setInsFile, hasSignature, setHasSignature, sigRef, renderContract,
}) => (
  <>
    {/* 1 — Identity */}
    <S.SectionCard>
      <S.SectionTitle><S.StepIndex>01</S.StepIndex> About you</S.SectionTitle>
      <S.Grid2>
        <S.InputGroup>
          <S.Label htmlFor="fullName">Full name *</S.Label>
          <S.Input id="fullName" value={form.fullName} onChange={set('fullName')} $error={attempted && !form.fullName.trim()} />
          {attempted && !form.fullName.trim() && <S.ErrorText>Your name is required.</S.ErrorText>}
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="email">Email *</S.Label>
          <S.Input id="email" type="email" value={form.email} onChange={set('email')} $error={attempted && !EMAIL_RE.test(form.email.trim())} />
          {attempted && !EMAIL_RE.test(form.email.trim()) && <S.ErrorText>A valid email is required.</S.ErrorText>}
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="phone">Phone</S.Label>
          <S.Input id="phone" value={form.phone} onChange={set('phone')} />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="businessName">Business name (optional)</S.Label>
          <S.Input id="businessName" value={form.businessName} onChange={set('businessName')} />
        </S.InputGroup>
      </S.Grid2>
    </S.SectionCard>

    {/* 2 — Professional */}
    <S.SectionCard>
      <S.SectionTitle><S.StepIndex>02</S.StepIndex> Your coaching</S.SectionTitle>
      <S.Grid2>
        <S.InputGroup>
          <S.Label htmlFor="specialties">Specialties</S.Label>
          <S.Input id="specialties" value={form.specialties} onChange={set('specialties')} placeholder="Strength, golf performance, weight loss…" />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="yearsExperience">Years of experience</S.Label>
          <S.Input id="yearsExperience" type="number" min={0} max={80} value={form.yearsExperience} onChange={set('yearsExperience')} />
        </S.InputGroup>
      </S.Grid2>
      <S.InputGroup style={{ marginTop: '1rem' }}>
        <S.Label htmlFor="bio">Short bio (clients will see this)</S.Label>
        <S.TextArea id="bio" value={form.bio} onChange={set('bio') as FieldChange} />
      </S.InputGroup>
    </S.SectionCard>

    {/* 3 — Credentials + Insurance */}
    <S.SectionCard>
      <S.SectionTitle><S.StepIndex>03</S.StepIndex> Credentials &amp; insurance</S.SectionTitle>
      <S.SectionHint>This protects you and your clients. You carry your own liability insurance and name SwanStudios as an additional insured — we verify it before you go live.</S.SectionHint>
      <S.Grid2>
        <S.InputGroup>
          <S.Label htmlFor="primaryCertification">Primary certification</S.Label>
          <S.Input id="primaryCertification" value={form.primaryCertification} onChange={set('primaryCertification')} placeholder="NASM, ACE, NSCA…" />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="certificationNumber">Certification number</S.Label>
          <S.Input id="certificationNumber" value={form.certificationNumber} onChange={set('certificationNumber')} />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="certificationExpiry">Certification expiry</S.Label>
          <S.Input id="certificationExpiry" type="date" value={form.certificationExpiry} onChange={set('certificationExpiry')} />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="cprAedExpiry">CPR/AED expiry</S.Label>
          <S.Input id="cprAedExpiry" type="date" value={form.cprAedExpiry} onChange={set('cprAedExpiry')} />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="insuranceCarrier">Insurance carrier</S.Label>
          <S.Input id="insuranceCarrier" value={form.insuranceCarrier} onChange={set('insuranceCarrier')} />
        </S.InputGroup>
        <S.InputGroup>
          <S.Label htmlFor="insuranceExpiry">Insurance expiry</S.Label>
          <S.Input id="insuranceExpiry" type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} />
        </S.InputGroup>
      </S.Grid2>
      <S.FileRow style={{ marginTop: '1rem' }}>
        <S.FileButton>
          📄 {certFile ? 'Change certificate' : 'Upload certification'}
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
        </S.FileButton>
        {certFile && <S.FileName>{certFile.name}</S.FileName>}
      </S.FileRow>
      <S.FileRow style={{ marginTop: '0.75rem' }}>
        <S.FileButton>
          🛡️ {insFile ? 'Change COI' : 'Upload insurance (COI)'}
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setInsFile(e.target.files?.[0] || null)} />
        </S.FileButton>
        {insFile && <S.FileName>{insFile.name}</S.FileName>}
      </S.FileRow>
    </S.SectionCard>

    {/* 4 — Agreement + e-sign */}
    <S.SectionCard>
      <S.SectionTitle><S.StepIndex>04</S.StepIndex> Trainer agreement</S.SectionTitle>
      {contract?.isDraft && (
        <S.DraftBanner>⚠️ This is a draft agreement pending final legal review — you'll sign the finalized version before it's binding.</S.DraftBanner>
      )}
      <S.ContractBox dangerouslySetInnerHTML={{ __html: renderContract(contract?.body) }} />
      {(contract?.consents ?? []).map((c) => (
        <S.ConsentRow key={c.key} $required={c.required}>
          <input
            type="checkbox"
            checked={consents[c.key] === true}
            onChange={(e) => setConsents((p) => ({ ...p, [c.key]: e.target.checked }))}
          />
          <span>{c.label}{c.required && ' *'}</span>
        </S.ConsentRow>
      ))}
      <div style={{ marginTop: '1rem' }}>
        <S.Label>Draw your signature *</S.Label>
        <div style={{ marginTop: '0.5rem' }}>
          <SignaturePad ref={sigRef} onEnd={() => setHasSignature(true)} onClear={() => setHasSignature(false)} />
        </div>
        {attempted && !hasSignature && <S.ErrorText>Please sign to continue.</S.ErrorText>}
      </div>
    </S.SectionCard>
  </>
);

export default TrainerOnboardingForm;
