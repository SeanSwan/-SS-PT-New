/**
 * FooterNewsletter — compact site-wide email capture (Tier 1.2).
 * Same double-opt-in path as the homepage section (shared useNewsletterSubscribe),
 * source='footer'. Token-with-fallback colors (rule 6), 44px targets, honeypot.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNewsletterSubscribe } from '../../hooks/useNewsletterSubscribe';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Title = styled.h4`
  font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const Row = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Honeypot = styled.input`
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

const Input = styled.input`
  /* M.2 sweep fix (2026-07-07): in the narrow footer column the input used to
     collapse to ~25px beside the button. flex-basis + wrap keeps it usable and
     drops the button to its own line on tight widths instead of squeezing. */
  flex: 1 1 180px;
  min-width: 0;
  min-height: 44px;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.3));
  background: var(--surface-dark, rgba(10, 10, 15, 0.5));
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  outline: none;

  &::placeholder { color: var(--text-tertiary, #7E97B0); }
  &:focus { border-color: var(--accent-primary, #60C0F0); }
`;

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.85rem;
  border: none;
  border-radius: 10px;
  background: var(--accent-primary, #60C0F0);
  color: var(--text-on-accent, #0A0A0F);
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover:not(:disabled) { box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 33%, transparent); }
  &:disabled { opacity: 0.6; cursor: progress; }
`;

const Msg = styled.p<{ $error?: boolean; $warning?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  margin: 0;
  color: ${({ $error, $warning }) => {
    if ($error) return 'var(--error, #F87171)';
    if ($warning) return 'var(--warning, #FBBF24)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;

const FooterNewsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const { status, message, subscribe } = useNewsletterSubscribe('footer');
  const isWarning = status === 'warning';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subscribe({ email, website });
  };

  return (
    <Wrap>
      <Title>Stay in the loop</Title>
      {status === 'success' || isWarning ? (
        <Msg role={isWarning ? 'alert' : 'status'} $warning={isWarning}>
          {isWarning ? <AlertTriangle size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
          {message}
        </Msg>
      ) : (
        <>
          <Row onSubmit={onSubmit} noValidate>
            <Honeypot
              type="text"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
              required
            />
            <Btn type="submit" disabled={status === 'loading'} aria-label="Subscribe to newsletter">
              <Send size={16} aria-hidden />
            </Btn>
          </Row>
          {status === 'error' && <Msg $error role="alert">{message}</Msg>}
        </>
      )}
    </Wrap>
  );
};

export default FooterNewsletter;
