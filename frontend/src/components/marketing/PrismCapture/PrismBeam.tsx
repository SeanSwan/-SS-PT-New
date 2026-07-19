/**
 * PrismBeam — "one beam in": a single frosted email field + one primary submit, as a REAL `<form onSubmit>`
 * (never a div+onClick fake form) so Enter, autofill, and password managers work. Sapphire caustic focus,
 * 44px target, AA labelling (`aria-invalid` + `aria-describedby`). The ONE primary on this surface
 * (Dual-Button Glow: Ice-Wing field, submit carries the glow).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { PRISM_COPY } from './prismCopy';

const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  max-width: 520px;
`;

const Field = styled.label`
  flex: 1 1 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const Hint = styled.span`
  font-size: 12px;
  color: var(--prism-ink-2);
`;

const Input = styled.input`
  height: var(--prism-target);
  padding: 0 14px;
  border-radius: var(--prism-r-field);
  border: 1px solid var(--prism-ice-14);
  background: var(--prism-glass);
  color: var(--prism-ink);
  font-size: 16px; /* ≥16px so iOS Safari does not zoom the field on focus */
  transition: border-color 160ms var(--prism-ease), box-shadow 160ms var(--prism-ease);

  &::placeholder {
    color: var(--prism-ink-2);
  }
  &:focus-visible {
    border-color: var(--prism-ice);
    box-shadow: 0 0 0 3px var(--prism-ice-soft);
    outline: none;
  }
  &[aria-invalid='true'] {
    border-color: var(--prism-danger);
  }
`;

const Submit = styled.button`
  height: var(--prism-target);
  min-width: 132px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--prism-r-field);
  background: var(--prism-ice);
  color: var(--prism-on-ice);
  font: 600 15px/1 var(--prism-font-display);
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--prism-ice-14), 0 10px 30px -14px var(--prism-wing);
  transition: transform 140ms var(--prism-ease), box-shadow 200ms var(--prism-ease), opacity 140ms;

  &:hover:not(:disabled) {
    box-shadow: 0 0 0 1px var(--prism-ice), 0 14px 40px -12px var(--prism-wing);
  }
  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
`;

const Error = styled.p`
  flex-basis: 100%;
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--prism-danger);
`;

interface PrismBeamProps {
  submitting: boolean;
  invalid: boolean;
  /** Bumps on each submit attempt so a REPEATED identical invalid still re-focuses + re-announces. */
  attempt: number;
  onSubmit: (email: string) => void;
}

export function PrismBeam({ submitting, invalid, attempt, onSubmit }: PrismBeamProps) {
  const [email, setEmail] = useState('');
  const inputId = useId();
  const errId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // On a validation error, move focus back to the field so the user can correct it. Keyed on `attempt` too, so a
  // repeated identical invalid submit (invalid stays true, no prop change) still re-fires the focus move.
  useEffect(() => {
    if (invalid) inputRef.current?.focus();
  }, [invalid, attempt]);

  return (
    <Form
      noValidate
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        if (!submitting) onSubmit(email);
      }}
    >
      <Field htmlFor={inputId}>
        <Hint>{PRISM_COPY.emailLabel}</Hint>
        <Input
          ref={inputRef}
          id={inputId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder={PRISM_COPY.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errId : undefined}
          disabled={submitting}
          required
        />
      </Field>
      <Submit type="submit" disabled={submitting}>
        {submitting ? PRISM_COPY.submitting : PRISM_COPY.submit}
      </Submit>
      {invalid ? (
        // key={attempt} re-mounts the alert on every invalid submit so screen readers re-announce it even when
        // the message text is unchanged (a live region only announces on insertion/mutation).
        <Error key={attempt} id={errId} role="alert">
          {PRISM_COPY.errorInvalid}
        </Error>
      ) : null}
    </Form>
  );
}
