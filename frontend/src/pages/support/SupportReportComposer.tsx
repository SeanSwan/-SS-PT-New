/**
 * BLUEPRINT: SwanStudios Support Report Composer
 * PURPOSE: Capture a structured, reviewable support report from authenticated members.
 * OWNERSHIP: Public Swan Coach support workflow; never Sean-only Hermes operator tooling.
 * DATA FLOW: Local draft -> reporter API client -> POST /api/support/issues -> receipt.
 * PRIVACY: Collects issue context and coarse browser diagnostics; prompts users to omit secrets.
 * ACCESSIBILITY: Labeled fields, inline errors, first-error focus, and 44px controls.
 * RESPONSIVE: Single-column below 640px; no hover-only actions.
 * VOICE: On-device browser dictation writes into this same controlled draft.
 */
import React, { useRef, useState } from 'react';

import type {
  SupportIssue,
  SupportIssueClient,
} from '../../services/supportIssueService';
import {
  ErrorText, Field, FieldGrid, HelpText, InlineAlert, Input, Label,
  Panel, PanelHeading, PanelIntro, Select, SubmitButton, SubmitRow, TextArea,
} from './SupportReportRoom.styles';
import { supportIssueComposerSchema } from '@swan/schemas';
import SupportReportGuidance from './SupportReportGuidance';
import { initialSupportDraft, type GuidedField, type SupportDraft } from './supportReportDraft';
import SupportVoiceCapture from './SupportVoiceCapture';
import type { SupportErrorContext } from './supportErrorRoute';

type Props = {
  client: SupportIssueClient;
  onSubmitted: (issue: SupportIssue) => void;
  initialContext?: SupportErrorContext | null;
};
type Errors = Partial<Record<'title' | 'description' | 'steps', string>>;


function draftFor(context?: SupportErrorContext | null): SupportDraft {
  if (!context?.path) return initialSupportDraft;
  return {
    ...initialSupportDraft,
    title: `Problem on ${context.path}`.slice(0, 160),
    description: `An application error interrupted what I was doing on ${context.path}.`,
  };
}

function diagnostics(context?: SupportErrorContext | null): Record<string, unknown> {
  return {
    path: context?.path ?? (window.location.pathname || '/'),
    ...(context?.errorCode ? { errorCode: context.errorCode } : {}),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
  };
}
/**
 * Validate the draft against the SAME schema the API enforces.
 *
 * These four rules used to be hand-written here — `length < 4`, `length < 10`,
 * `> 12` steps, `> 500` chars per step — a second copy of rules that
 * routes/supportIssueRoutes.mjs already declared in zod. Two copies of one
 * contract, in two languages, kept in step by nothing but memory: raise the
 * server minimum and this form would go on accepting what the API had begun
 * rejecting, handing the user a 400 the UI never predicted (CLAUDE.md Rule 58,
 * drift class #6/#7). SWA-225 EX-5 makes @swan/schemas the single definition.
 *
 * The messages stay human and stay OURS — zod supplies the rule, not the
 * wording. A user should read "at least 4 characters", never "String must
 * contain at least 4 character(s)".
 */
function validate(draft: SupportDraft): Errors {
  const steps = draft.steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
  const result = supportIssueComposerSchema.safeParse({
    category: draft.category,
    severity: draft.severity,
    title: draft.title,
    description: draft.description,
    expectedBehavior: draft.expectedBehavior,
    impact: draft.impact,
    reproductionSteps: steps,
  });
  if (result.success) return {};

  const errors: Errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field === 'title' && !errors.title) {
      errors.title = 'Add a short title with at least 4 characters.';
    } else if (field === 'description' && !errors.description) {
      errors.description = 'Tell us what happened in at least 10 characters.';
    } else if (field === 'reproductionSteps' && !errors.steps) {
      // Two distinct rules land on this field: too many steps, or one step too
      // long. `path.length > 1` means the issue is on an ELEMENT, not the array.
      errors.steps = issue.path.length > 1
        ? 'Keep each step to 500 characters or fewer.'
        : 'Keep the report to 12 repeatable steps or fewer.';
    }
  }
  return errors;
}

const SupportReportComposer: React.FC<Props> = ({ client, onSubmitted, initialContext }) => {
  const [draft, setDraft] = useState<SupportDraft>(() => draftFor(initialContext));
  const [errors, setErrors] = useState<Errors>({});
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<GuidedField>('description');
  const [voiceUsed, setVoiceUsed] = useState(false);
  const clientRequestIdRef = useRef(crypto.randomUUID());
  const update = <K extends keyof SupportDraft>(key: K, value: SupportDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const focusField = (field: GuidedField) => {
    document.getElementById(`support-${field}`)?.focus();
  };
  const appendVoice = (field: GuidedField, text: string) => {
    const limits: Record<GuidedField, number> = {
      description: 8000, expectedBehavior: 4000, impact: 4000, steps: 6000,
    };
    setVoiceUsed(true);
    setDraft((current) => {
      const separator = current[field].trim() ? (field === 'steps' ? '\n' : ' ') : '';
      const stepLines = current.steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
      const nextValue = field === 'steps'
        ? (stepLines.length >= 12
          ? current.steps
          : [...stepLines, text.trim().slice(0, 500)].filter(Boolean).join('\n'))
        : `${current[field]}${separator}${text}`.slice(0, limits[field]);
      const nextTitle = field === 'description' && !current.title.trim()
        ? text.replace(/\s+/g, ' ').trim().slice(0, 100)
        : current.title;
      return { ...current, [field]: nextValue, title: nextTitle };
    });
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    setRequestError('');
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`support-${firstError}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const issue = await client.createIssue({
        clientRequestId: clientRequestIdRef.current,
        category: draft.category,
        severity: draft.severity,
        source: voiceUsed ? 'voice' : (initialContext?.source ?? 'text'),
        title: draft.title.trim(),
        description: draft.description.trim(),
        expectedBehavior: draft.expectedBehavior.trim(),
        impact: draft.impact.trim(),
        reproductionSteps: draft.steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
        diagnostics: diagnostics(initialContext),
      });
      clientRequestIdRef.current = crypto.randomUUID();
      setDraft(initialSupportDraft);
      onSubmitted(issue);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'The support request could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel aria-labelledby="report-composer-title">
      <PanelHeading id="report-composer-title">Tell Swan Coach what happened</PanelHeading>
      <PanelIntro>Type it in your own words. You can review every detail before anything is sent.</PanelIntro>
      {requestError && <InlineAlert role="alert">{requestError}</InlineAlert>}
      <form onSubmit={submit} noValidate>
        <SupportVoiceCapture
          target={voiceTarget}
          onTargetChange={setVoiceTarget}
          onAppend={appendVoice}
          disabled={submitting}
        />
        <SupportReportGuidance draft={draft} onFocusField={focusField} />
        <FieldGrid>
          <Field>
            <Label htmlFor="support-category">Issue type</Label>
            <Select id="support-category" value={draft.category} onChange={(e) => update('category', e.target.value as SupportDraft['category'])} disabled={submitting}>
              <option value="bug">Something is broken</option><option value="error">I saw an error</option>
              <option value="access">Access or sign-in</option><option value="billing">Billing or purchase</option>
              <option value="workout">Workout or progress</option><option value="account">Account or profile</option>
              <option value="performance">Slow or unresponsive</option><option value="usability">Hard to use</option>
              <option value="content">Incorrect content</option><option value="other">Something else</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="support-severity">How urgent?</Label>
            <Select id="support-severity" value={draft.severity} onChange={(e) => update('severity', e.target.value as SupportDraft['severity'])} disabled={submitting}>
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical — blocked</option>
            </Select>
          </Field>
        </FieldGrid>
        <Field>
          <Label htmlFor="support-title">Short title</Label>
          <Input id="support-title" value={draft.title} onChange={(e) => update('title', e.target.value)} maxLength={160} disabled={submitting} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'support-title-error' : 'support-title-help'} />
          {errors.title ? <ErrorText id="support-title-error">{errors.title}</ErrorText> : <HelpText id="support-title-help">A quick summary such as “Workout logger will not save.”</HelpText>}
        </Field>
        <Field>
          <Label htmlFor="support-description">What happened?</Label>
          <TextArea id="support-description" value={draft.description} onChange={(e) => update('description', e.target.value)} maxLength={8000} disabled={submitting} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'support-description-error' : 'support-description-help'} />
          {errors.description ? <ErrorText id="support-description-error">{errors.description}</ErrorText> : <HelpText id="support-description-help">Say what you were doing and what you saw. Do not include passwords or payment details.</HelpText>}
        </Field>
        <Field>
          <Label htmlFor="support-expected">What did you expect?</Label>
          <TextArea id="support-expected" value={draft.expectedBehavior} onChange={(e) => update('expectedBehavior', e.target.value)} maxLength={4000} disabled={submitting} />
        </Field>
        <Field>
          <Label htmlFor="support-impact">How did this affect you?</Label>
          <TextArea id="support-impact" value={draft.impact} onChange={(e) => update('impact', e.target.value)} maxLength={4000} disabled={submitting} />
        </Field>
        <Field>
          <Label htmlFor="support-steps">Steps to repeat it</Label>
          <TextArea id="support-steps" value={draft.steps} onChange={(e) => update('steps', e.target.value)} maxLength={6011} disabled={submitting} aria-invalid={Boolean(errors.steps)} aria-describedby={errors.steps ? 'support-steps-error' : 'support-steps-help'} />
          {errors.steps ? <ErrorText id="support-steps-error">{errors.steps}</ErrorText> : <HelpText id="support-steps-help">Put each step on its own line. Optional, but very helpful.</HelpText>}
        </Field>
        <SubmitRow>
          <HelpText>Your draft stays in this form if sending fails.</HelpText>
          <SubmitButton type="submit" disabled={submitting}>{submitting ? 'Sending report…' : 'Send report'}</SubmitButton>
        </SubmitRow>
      </form>
    </Panel>
  );
};

export default SupportReportComposer;
