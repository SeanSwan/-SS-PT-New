/**
 * Gallery vNext — access gate card. Kimi's fix for the fake-form risk: a REAL `<form onSubmit>` with
 * `type="email"`, `inputmode`, `autocomplete`, the per-event password as `current-password`, and
 * `aria-invalid` + `aria-describedby` error wiring — never a `div onClick` (which breaks Enter-submit,
 * password managers, and autofill on a conversion surface).
 *
 * IA: the gate is the SETUP for the Crystallize reveal, not a wall. Copy frames the email as an unlock,
 * not a tax. Per Kimi Q4, NO credit/VIP/referral/donation UI may render here — this is pre-gate.
 * All controls are >=48px tall; the card is 288px at 320vw and 400px max from 768 up.
 */
import { useId, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import type { GateSubmitInput } from './gallery.types';

const Card = styled.div`
  width: 100%;
  max-width: 288px;
  padding: 20px;
  border-radius: var(--gallery-r-panel, 16px);
  background: var(--gallery-surface-1);
  border: 1px solid var(--gallery-chrome-edge);
  box-shadow: var(--gallery-elev-2);
  color: var(--gallery-ink);

  @media (min-width: 768px) {
    max-width: 400px;
    padding: 28px;
  }
`;

const Title = styled.h2`
  margin: 0 0 6px;
  font-family: var(--gallery-font-display);
  font-size: 1.35rem;
  line-height: 1.2;
`;

const Sub = styled.p`
  margin: 0 0 18px;
  color: var(--gallery-ink-2);
  font-size: 0.95rem;
  line-height: 1.45;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gallery-ink-2);
`;

const Input = styled.input`
  min-height: 48px;
  padding: 0 12px;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid var(--gallery-line);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  font-size: 1rem;

  &[aria-invalid='true'] {
    border-color: var(--gallery-ice);
  }
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  color: var(--gallery-ink-2);
  font-size: 0.9rem;
  cursor: pointer;
`;

const Submit = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 6px;
  border: 0;
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  /* Dual-Button Glow: blue surface -> wing-purple glow (LAW 7). The ONLY primary on this surface. */
  box-shadow: 0 0 0 1px var(--gallery-chrome-edge), 0 8px 28px var(--gallery-wing-22);
  transition: transform 160ms var(--gallery-ease-standard), box-shadow 160ms var(--gallery-ease-standard);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

const ErrorText = styled.p`
  margin: 10px 0 0;
  color: var(--gallery-ink);
  background: var(--gallery-frost);
  border-left: 2px solid var(--gallery-ice);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.9rem;
`;

const BackRow = styled.button`
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  border: 0;
  background: none;
  color: var(--gallery-ink-2);
  font-size: 0.9rem;
  cursor: pointer;
  &:hover { color: var(--gallery-ink); }
`;

export interface GateCardProps {
  eventName?: string | null;
  loading: boolean;
  error: string;
  onSubmit(input: GateSubmitInput): void;
  /** "Back to events" escape hatch (parity with the shipped gate) */
  onBack?(): void;
}

export function GateCard({ eventName, loading, error, onSubmit, onBack }: GateCardProps) {
  const uid = useId();
  const errorId = `${uid}-gate-error`;
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [parentalConsent, setParentalConsent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    onSubmit({ email, password, firstName, newsletterOptIn, parentalConsent });
  };

  return (
    <Card className="gallery-gate-card">
      <Title>{eventName ? `Unlock ${eventName}` : 'Unlock the gallery'}</Title>
      <Sub>Add your email and the photos crystallize into view. Your download link arrives by email.</Sub>

      <form onSubmit={handleSubmit} noValidate>
        <Field>
          <Label htmlFor={`${uid}-first`}>First name</Label>
          <Input
            id={`${uid}-first`}
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor={`${uid}-email`}>Email</Label>
          <Input
            id={`${uid}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </Field>

        <Field>
          <Label htmlFor={`${uid}-password`}>Event password</Label>
          <Input
            id={`${uid}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </Field>

        <CheckRow>
          <input
            type="checkbox"
            name="newsletterOptIn"
            checked={newsletterOptIn}
            onChange={(e) => setNewsletterOptIn(e.target.checked)}
          />
          Send me new galleries and training updates
        </CheckRow>

        <CheckRow>
          <input
            type="checkbox"
            name="parentalConsent"
            checked={parentalConsent}
            onChange={(e) => setParentalConsent(e.target.checked)}
          />
          I am the parent or guardian of a minor pictured here
        </CheckRow>

        <Submit type="submit" disabled={loading} data-testid="gallery-gate-submit">
          {loading ? 'Unlocking…' : 'View the gallery'}
        </Submit>

        {error && (
          <ErrorText id={errorId} role="alert">
            {error}
          </ErrorText>
        )}
      </form>

      {onBack && (
        <BackRow type="button" onClick={onBack}>
          Back to events
        </BackRow>
      )}
    </Card>
  );
}

export default GateCard;
