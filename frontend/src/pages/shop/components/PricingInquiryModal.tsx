/**
 * PricingInquiryModal.tsx — Package Pricing Inquiry (Crystalline Swan)
 * ================================================================
 * The connector between the price-hidden storefront and the admin.
 *
 * Sean's rule: training package/session prices are hidden until an admin
 * grants a specific user the `store-prices` flag (priceVisibilityService).
 * Until then a prospect sees the tier but no price. This modal is the
 * "press a button to contact the administrator" step — it collects the
 * prospect's name/email + optional phone/note and POSTs to /api/contact,
 * which stores a Contact, raises an in-app admin notification, emails/SMS
 * Sean, AND drops the person into the CRM lead pipeline. Sean then sets a
 * per-client price via the admin "Client Deals" screen, which surfaces on
 * the client's store as YourSpecialCard.
 *
 * Reuses the existing public POST /api/contact contract (name/email/message
 * required; consultationType flows into the admin email subject). No new
 * endpoint, no auth requirement — prospects are not logged in.
 *
 * Accessibility: role="dialog" aria-modal, labelled title, Escape + backdrop
 * close, focus moved into the modal on open and restored on close, Tab is
 * trapped within the panel, 44px+ controls, reduced-motion honored.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import GlowButton from '../../../components/ui/GlowButton';
import api from '../../../services/api.service';
import { logger } from '@/utils/logger';
import type { StoreItem } from './storeCatalog.types';
import {
  Overlay,
  Panel,
  CloseButton,
  Kicker,
  Title,
  Lead,
  Field,
  Actions,
  ErrorBox,
  SuccessState,
  SuccessMark,
} from './PricingInquiryModal.styles';

interface PricingInquiryModalProps {
  package: StoreItem;
  prefillName?: string;
  prefillEmail?: string;
  onClose: () => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildTierSummary = (pkg: StoreItem): string => {
  if (pkg.packageType === 'monthly') {
    return `${pkg.months ?? 0} months · ${pkg.sessionsPerWeek ?? 0} sessions/week · ${pkg.totalSessions ?? 0} total sessions`;
  }
  const sessions = pkg.sessions ?? pkg.totalSessions ?? 0;
  return `${sessions} session${sessions === 1 ? '' : 's'}`;
};

const PricingInquiryModal: React.FC<PricingInquiryModalProps> = ({
  package: pkg,
  prefillName = '',
  prefillEmail = '',
  onClose,
}) => {
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const isSubmitting = status === 'submitting';
  const tierSummary = buildTierSummary(pkg);

  const requestClose = useCallback(() => {
    if (isSubmitting) return; // don't close mid-request
    onClose();
  }, [isSubmitting, onClose]);

  // Focus management: remember opener, focus first field, restore on unmount.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Escape to close + trap Tab within the panel.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [requestClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName) {
        setErrorMsg('Please enter your name.');
        return;
      }
      if (!EMAIL_RE.test(trimmedEmail)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      setStatus('submitting');
      setErrorMsg(null);

      const message =
        `Pricing inquiry for "${pkg.name}" (${tierSummary}).` +
        (phone.trim() ? `\nPhone: ${phone.trim()}` : '') +
        (note.trim() ? `\n\nNote: ${note.trim()}` : '') +
        `\n\n[package id: ${pkg.id}]`;

      try {
        await api.post('/api/contact', {
          name: trimmedName,
          email: trimmedEmail,
          message,
          consultationType: pkg.name,
          priority: 'high',
        });
        setStatus('success');
      } catch (err: any) {
        logger.warn('Pricing inquiry submit failed:', err);
        // Read BOTH shapes: validation errors use `message`, rate-limit (429)
        // uses `error`. Without this a throttled prospect sees a generic
        // failure instead of "try again in a few minutes" — and retries harder.
        const data = err?.response?.data;
        const apiMsg = data?.message || data?.error || err?.message;
        setErrorMsg(
          apiMsg || 'Something went wrong sending your request. Please try again.'
        );
        setStatus('error');
      }
    },
    [isSubmitting, name, email, phone, note, pkg, tierSummary]
  );

  return (
    <Overlay
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-inquiry-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <CloseButton
          type="button"
          aria-label="Close pricing inquiry"
          onClick={requestClose}
        >
          ×
        </CloseButton>

        {status === 'success' ? (
          <SuccessState>
            <SuccessMark aria-hidden="true">✓</SuccessMark>
            <Title id="pricing-inquiry-title">Request sent</Title>
            <Lead>
              Thanks, {name.trim() || 'there'}. SwanStudios has your interest in{' '}
              <strong>{pkg.name}</strong> and will reach out with your pricing.
            </Lead>
            <Actions>
              <GlowButton text="Done" theme="cosmic" size="medium" onClick={onClose} />
            </Actions>
          </SuccessState>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Kicker>Personalized pricing</Kicker>
            <Title id="pricing-inquiry-title">Ask about {pkg.name}</Title>
            <Lead>
              Pricing for this package is set with you personally. Share your details and
              SwanStudios will follow up with pricing for <strong>{tierSummary}</strong>.
            </Lead>

            {errorMsg && (
              <ErrorBox role="alert" aria-live="assertive">
                {errorMsg}
              </ErrorBox>
            )}

            <Field>
              <label htmlFor="inq-name">Name *</label>
              <input
                ref={firstFieldRef}
                id="inq-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                disabled={isSubmitting}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field>
              <label htmlFor="inq-email">Email *</label>
              <input
                id="inq-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={isSubmitting}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field>
              <label htmlFor="inq-phone">Phone (optional)</label>
              <input
                id="inq-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                disabled={isSubmitting}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>

            <Field>
              <label htmlFor="inq-note">Anything you&apos;d like us to know? (optional)</label>
              <textarea
                id="inq-note"
                name="note"
                rows={3}
                value={note}
                disabled={isSubmitting}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>

            <Actions>
              <GlowButton
                text={isSubmitting ? 'Sending…' : 'Send inquiry'}
                theme="cosmic"
                size="medium"
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                aria-label={`Send pricing inquiry for ${pkg.name}`}
              />
            </Actions>
          </form>
        )}
      </Panel>
    </Overlay>
  );
};

export default PricingInquiryModal;
