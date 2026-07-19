/**
 * Contact V-next — ContactForm (Kimi (d): "The Crystallize Submit" — the success state IS the signature,
 * because it's the only emotional peak a contact page has). On a valid submit the fields collapse as light
 * toward center, a crystal shard refracts ice→wing, ONE gold seam sweeps (the page's single gold), and it
 * resolves into confirmation + the booking CTA — consuming the SHIPPED lens Crystallize. Reduced-motion →
 * a 150ms crossfade to the static glyph. BIND-ONLY: the POST is the SAME `/api/contact` V3 uses (via
 * resolveContactApiBase) — the contact pipeline is untouched. Fields/validation frozen from V3.
 */
import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { resolveContactApiBase } from '../contactApiBase';
import { useCrystallizeTransition, CrystallizeOverlay } from './lensBindings';

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 560px;
`;
const Form = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(20px, 4vw, 32px);
  border-radius: var(--contact-r-panel, 20px);
  background: var(--contact-glass);
  border: 1px solid var(--contact-ice-14);
  box-shadow: var(--contact-elev-2);
`;
const Field = styled.input`
  min-height: var(--contact-target, 48px);
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--contact-ice-14);
  background: var(--contact-surface);
  color: var(--contact-ink);
  font-size: 15px;
  transition: border-color 200ms var(--contact-ease-standard);
  &:focus {
    border-color: var(--contact-ice);
  }
  &::placeholder {
    color: var(--contact-ink-2);
  }
`;
const Area = styled(Field).attrs({ as: 'textarea' })`
  min-height: 130px;
  padding: 12px 14px;
  resize: vertical;
  font-family: inherit;
`;
const Submit = styled.button<{ $ignited: boolean }>`
  min-height: 52px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--contact-ice) 40%, transparent);
  background: color-mix(in oklab, var(--contact-ice) 22%, var(--contact-surface) 78%);
  color: var(--contact-ink);
  font: 800 16px / 1 var(--contact-font-display, inherit);
  cursor: pointer;
  box-shadow: ${({ $ignited }) => ($ignited ? '0 0 0 1px var(--contact-glow), 0 0 30px -8px var(--contact-glow)' : 'none')};
  transition: box-shadow 300ms var(--contact-ease-crystallize), filter 160ms var(--contact-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;
const ErrorText = styled.p`
  margin: 0;
  color: var(--contact-ink);
  font-size: 14px;
`;
const Confirm = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: clamp(28px, 6vw, 48px);
  border-radius: var(--contact-r-panel, 20px);
  background: var(--contact-glass);
  border: 1px solid var(--contact-ice-14);
`;
const Shard = styled(motion.div)`
  width: 76px;
  height: 76px;
  clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
  background: linear-gradient(135deg, var(--contact-ice), var(--contact-wing) 60%, var(--contact-gold) 100%);
  box-shadow: 0 0 40px -8px var(--contact-glow);
`;
const ConfirmTitle = styled.h3`
  margin: 0;
  font: 800 22px / 1.2 var(--contact-font-display, inherit);
  color: var(--contact-ink);
`;
const ConfirmBody = styled.p`
  margin: 0;
  color: var(--contact-ink-2);
`;
const BookCta = styled(Link)`
  min-height: var(--contact-target, 44px);
  display: inline-flex;
  align-items: center;
  padding: 0 22px;
  border-radius: 999px;
  border: 1px solid var(--contact-chrome);
  background: transparent;
  color: var(--contact-ink);
  font: 700 15px / 1 var(--contact-font-display, inherit);
  text-decoration: none;
  &:hover {
    background: var(--contact-ice-14);
  }
`;

type Phase = 'form' | 'done';

// Seed email/subject from a deep link (e.g. PrismCapture's `/contact?intent=book&email=…`) so the field is
// prefilled — parity with ContactV3.prefillFromUrl (the flag-off default). URLSearchParams, no react-router dep.
function prefillFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const email = (p.get('email') || '').slice(0, 255);
    const intent = p.get('intent');
    const subject = intent === 'trainer' ? 'Trainer inquiry' : intent === 'book' ? 'Free consultation request' : '';
    return { email, subject };
  } catch {
    return { email: '', subject: '' };
  }
}

export function ContactForm() {
  const prefersReduced = useReducedMotion();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => prefillFromUrl().email);
  const [subject, setSubject] = useState(() => prefillFromUrl().subject);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [ignited, setIgnited] = useState(false);
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'contact.submit' });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!name.trim() || !email.trim() || !message.trim()) {
        setError('Please fill in your name, email, and message.');
        return;
      }
      setSubmitting(true);
      try {
        const base = resolveContactApiBase(window.location.hostname);
        await axios.post(`${base}/api/contact`, {
          name,
          email,
          message: message + (subject ? `\n\nSubject: ${subject}` : ''),
        });
        setIgnited(true);
        // confirm-first: the Crystallize Submit plays only after the send succeeds
        crystallizeTo(() => setPhase('done'), { settleAnnouncement: 'Message sent' });
      } catch (err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, subject, message, crystallizeTo],
  );

  if (phase === 'done') {
    return (
      <Wrap>
        <Confirm
          data-testid="contact-confirm"
          role="status"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReduced ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Shard
            initial={prefersReduced ? false : { rotate: 45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: prefersReduced ? 0.15 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          />
          <ConfirmTitle>Message sent</ConfirmTitle>
          <ConfirmBody>Thanks — we’ll be in touch shortly. Want to keep the momentum going?</ConfirmBody>
          <BookCta to="/store">Book a session</BookCta>
        </Confirm>
        <CrystallizeOverlay {...overlayProps} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Form onSubmit={onSubmit} data-testid="contact-form" noValidate>
        <Field type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" autoComplete="name" />
        <Field type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" autoComplete="email" />
        <Field type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" aria-label="Subject" />
        <Area value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" aria-label="Message" />
        {error && <ErrorText role="alert">{error}</ErrorText>}
        <Submit type="submit" $ignited={ignited} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send message'}
        </Submit>
      </Form>
      <CrystallizeOverlay {...overlayProps} />
    </Wrap>
  );
}
