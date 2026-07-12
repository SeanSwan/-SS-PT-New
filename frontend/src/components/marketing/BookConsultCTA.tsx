/**
 * ┌─── COMPONENT: BookConsultCTA ────────────────────────────────────────────┐
 * │ PURPOSE: Public "Book a Free Consult" button + modal form. Submits to    │
 * │          the live POST /api/consult-request endpoint, which records the  │
 * │          prospect as a `scheduled` Lead and alerts the owner to confirm. │
 * │                                                                          │
 * │ API:     Uses resolveContactApiBase() — the SAME public-POST pattern as  │
 * │          the contact form: same-origin in prod/staging (no CORS needed), │
 * │          local backend port in dev. Works locally AND in production.     │
 * │                                                                          │
 * │ BACKEND CONTRACT (backend/routes/consultRequestRoutes.mjs):              │
 * │   { name?, email* , phone?, preferredTime?, notes?, website? }           │
 * │   - `website` is the HONEYPOT (bots fill it → silently accepted, no-op)  │
 * │   - 201 = recorded  · 400 = invalid/over-length  · 500 = server          │
 * │   - Server caps: name<=100, preferredTime<=120, notes<=2000, phone<=30   │
 * │                                                                          │
 * │ RULES:   dark-first (3) · var(--token,#fallback) (6) · 44px targets (2)  │
 * │          Dual-Button Glow (blue bg → purple glow) · reduced-motion (25)  │
 * │ USAGE:   <BookConsultCTA />            (default label)                   │
 * │          <BookConsultCTA label="Book my free consult" />                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { resolveContactApiBase } from '../../pages/contactpage/contactApiBase';
import {
  TriggerButton, Overlay, Modal, CloseButton, Title, Subtitle,
  Form, Field, Input, Textarea, Honeypot, SubmitButton, Alert,
} from './BookConsultCTA.styles';

// Mirrors the server's validator so we fail fast client-side (server still authoritative).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Mirrors the server's caps — keeps a legit prospect from a surprise 400.
const LIMITS = { name: 100, preferredTime: 120, notes: 2000, phone: 30 } as const;

export interface BookConsultCTAProps {
  /** Button label. */
  label?: string;
  /** Optional class for layout placement by the parent. */
  className?: string;
}

const BookConsultCTA: React.FC<BookConsultCTAProps> = ({ label = 'Book a Free Consult', className }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — humans leave this empty
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const firstFieldRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError('');
  }, []);

  // While open: lock body scroll, trap Tab inside the dialog, close on Escape,
  // and return focus to the trigger on close (a11y). The modal itself renders
  // through a portal, so ancestor transforms/overflow can never clip it.
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const root = modalRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input:not([tabindex="-1"]), textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    firstFieldRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, close]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (name.trim().length > LIMITS.name || notes.trim().length > LIMITS.notes
      || preferredTime.trim().length > LIMITS.preferredTime || phone.trim().length > LIMITS.phone) {
      setError('One or more fields are too long. Please shorten them.');
      return;
    }

    setSubmitting(true);
    try {
      // Same-origin in prod/staging; local backend in dev — no CORS either way.
      const API_BASE_URL = resolveContactApiBase(window.location.hostname);
      await axios.post(`${API_BASE_URL}/api/consult-request`, {
        name: name.trim() || undefined,
        email: cleanEmail,
        phone: phone.trim() || undefined,
        preferredTime: preferredTime.trim() || undefined,
        notes: notes.trim() || undefined,
        website, // honeypot passthrough
      });

      setSuccess(true);
      setName(''); setEmail(''); setPhone(''); setPreferredTime(''); setNotes('');
    } catch (err: unknown) {
      const e2 = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = e2.response?.status;
      if (status === 400) setError(e2.response?.data?.message || 'Please check your details and try again.');
      else if (status && status >= 500) setError('Server error. Please try again in a moment.');
      else if (!e2.response) setError('Network error. Please check your connection and try again.');
      else setError(e2.response?.data?.message || 'Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TriggerButton type="button" className={className} onClick={() => { setOpen(true); setSuccess(false); }}>
        {label}
      </TriggerButton>

      {open && createPortal(
        <Overlay
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <Modal ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="book-consult-title">
            <CloseButton type="button" aria-label="Close" onClick={close}>×</CloseButton>

            {success ? (
              <>
                <Title id="book-consult-title">Request received</Title>
                <Alert $type="success" role="status">
                  Thanks! Sean will reach out to confirm your free consult.
                </Alert>
                <SubmitButton type="button" onClick={close} style={{ marginTop: 18 }}>Done</SubmitButton>
              </>
            ) : (
              <>
                <Title id="book-consult-title">Book a free consult</Title>
                <Subtitle>
                  Tell me what you want to work on and I&apos;ll reach out to confirm a time.
                  26+ years coaching strength, movement, and flexibility.
                </Subtitle>

                <Form onSubmit={handleSubmit} noValidate>
                  <Field>
                    Name
                    <Input
                      ref={firstFieldRef}
                      type="text"
                      value={name}
                      maxLength={LIMITS.name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </Field>

                  <Field>
                    <span>Email <span aria-hidden="true">*</span></span>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-required="true"
                    />
                  </Field>

                  <Field>
                    Phone (optional)
                    <Input
                      type="tel"
                      value={phone}
                      maxLength={LIMITS.phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 555-5555"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field>
                    Preferred time (optional)
                    <Input
                      type="text"
                      value={preferredTime}
                      maxLength={LIMITS.preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      placeholder="e.g. weekday mornings"
                    />
                  </Field>

                  <Field>
                    What do you want to work on? (optional)
                    <Textarea
                      value={notes}
                      maxLength={LIMITS.notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Goals, injuries, sport, schedule…"
                    />
                  </Field>

                  {/* Honeypot: hidden from humans; bots that fill it are silently no-op'd server-side. */}
                  <Honeypot
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />

                  {error && <Alert $type="error" role="alert">{error}</Alert>}

                  <SubmitButton type="submit" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Request my free consult'}
                  </SubmitButton>
                </Form>
              </>
            )}
          </Modal>
        </Overlay>,
        document.body
      )}
    </>
  );
};

export default BookConsultCTA;
