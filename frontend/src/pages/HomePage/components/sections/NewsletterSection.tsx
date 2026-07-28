/**
 * NewsletterSection — homepage email capture (Tier 1.2).
 * Wires the live double-opt-in endpoint via useNewsletterSubscribe. Crystalline
 * Swan palette (token-with-fallback, rule 6), 44px targets, honeypot, reduced-
 * motion safe. Dark-first. Mounted in HomePage.V4 before the final CTA.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Send, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNewsletterSubscribe } from '../../../../hooks/useNewsletterSubscribe';

type AnimationTier = 'full' | 'balanced' | 'essential';
interface Props { tier?: AnimationTier }

const Section = styled.section`
  position: relative;
  padding: clamp(3rem, 8vw, 6rem) 1.5rem;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent), transparent 60%),
    var(--bg-elevated, #003080);
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
`;

const Inner = styled.div`
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
`;

const Heading = styled.h2`
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-weight: 800;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 0.75rem;
`;

const Sub = styled.p`
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: var(--text-secondary, #A8C0D8);
  line-height: 1.6;
  margin: 0 auto 2rem;
  max-width: 520px;
`;

const Form = styled.form`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Honeypot = styled.input`
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

const Field = styled.input`
  flex: 1 1 240px;
  min-width: 0;
  min-height: 48px;
  padding: 0.75rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.3));
  background: var(--surface-dark, rgba(10, 10, 15, 0.55));
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder { color: var(--text-tertiary, #7E97B0); }
  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.75rem 1.75rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--swan-sapphire, #002060));
  color: var(--text-on-accent, #0A0A0F);
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 33%, transparent);
  }
  &:disabled { opacity: 0.6; cursor: progress; }
  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const Note = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: 0.8rem;
  color: var(--text-tertiary, #7E97B0);
  margin: 1rem 0 0;
`;

const StatusMsg = styled.p<{ $error?: boolean }>`
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: 0.95rem;
  margin: 1rem 0 0;
  color: ${({ $error }) => ($error ? 'var(--error, #F87171)' : 'var(--accent-primary, #60C0F0)')};
`;

const Success = styled.div<{ $warning?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-body, 'Sora', sans-serif);
`;

const SuccessActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
`;

const CtaLink = styled.a`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--swan-sapphire, #002060));
  color: var(--text-on-accent, #0A0A0F);
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-weight: 700;
  text-decoration: none;
  transition: box-shadow 0.2s ease;
  &:hover { box-shadow: 0 8px 24px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 33%, transparent); }
`;

const ResendButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 0.9rem;
  background: none;
  border: none;
  color: var(--text-tertiary, #7E97B0);
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: progress; }
  &:hover:not(:disabled) { color: var(--accent-primary, #60C0F0); }
`;

const NewsletterSection: React.FC<Props> = ({ tier = 'full' }) => {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const { status, message, subscribe } = useNewsletterSubscribe('homepage');
  const isWarning = status === 'warning';
  const animate = tier !== 'essential';

  // Stay on the success screen across a resend (status briefly flips to 'loading').
  useEffect(() => { if (status === 'success' || status === 'warning') setSubmittedOnce(true); }, [status]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subscribe({ email, website });
  };

  return (
    <Section aria-labelledby="newsletter-heading">
      <Inner
        as={motion.div}
        initial={animate ? { opacity: 0, y: 20 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
      >
        <Heading id="newsletter-heading">Train smarter — straight to your inbox</Heading>
        {submittedOnce ? (
          <Success role={isWarning ? 'alert' : 'status'} $warning={isWarning}>
            {isWarning ? (
              <AlertTriangle size={40} aria-hidden color="var(--warning, #FBBF24)" />
            ) : (
              <CheckCircle2 size={40} aria-hidden color="var(--accent-primary, #60C0F0)" />
            )}
            <p style={{ margin: 0, fontSize: '1.05rem' }}>{message || 'Almost there — check your email to confirm your subscription.'}</p>
            <SuccessActions>
              <CtaLink href="/contact?intent=consultation&utm_source=newsletter&utm_campaign=welcome">Ask about a complimentary consultation</CtaLink>
              <ResendButton type="button" onClick={() => subscribe({ email })} disabled={status === 'loading'}>
                {status === 'loading' ? 'Resending…' : "Didn't get it? Resend"}
              </ResendButton>
            </SuccessActions>
          </Success>
        ) : (
          <>
            <Sub>
              Get coaching tips, programming insights, and member-only updates from SwanStudios.
              No spam — confirm once, unsubscribe anytime.
            </Sub>
            <Form onSubmit={onSubmit} noValidate>
              <Honeypot
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <Field
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                required
              />
              <SubmitButton type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Joining…' : 'Subscribe'}
                <Send size={16} aria-hidden />
              </SubmitButton>
            </Form>
            {status === 'error' && <StatusMsg $error role="alert">{message}</StatusMsg>}
            <Note><ShieldCheck size={14} aria-hidden /> Double opt-in. We never sell your email.</Note>
          </>
        )}
      </Inner>
    </Section>
  );
};

export default NewsletterSection;
