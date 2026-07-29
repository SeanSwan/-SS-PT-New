/**
 * @file ForgotPasswordModal.jsx
 * @description Canonical public password-reset request surface.
 *
 * Blueprint:
 * - Route: `/forgot-password` from `routes/main-routes.tsx`.
 * - Data flow: `useAuth().forgotPassword` -> `POST /api/auth/forgot-password`.
 * - Safety: preserves enumeration-resistant generic success messaging.
 * - Accessibility: labeled fields, live status, Escape dismissal, and 44px controls.
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { VIDEO } from '../config/videoAssets';
import {
  CloseButton,
  Eyebrow,
  FieldLabel,
  InputField,
  ModalContent,
  ModalOverlay,
  ResetForm,
  StatusMessage,
  SubmitButton,
  Title,
  Intro,
  VideoBackground,
} from './ForgotPasswordModal.styles';

const ForgotPasswordModal = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => navigate(-1);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setMessage('If an account with that email exists, a password reset link has been sent.');
      }
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <VideoBackground autoPlay loop muted playsInline aria-hidden="true" tabIndex={-1}>
        {/* /assets/movie.mp4 never existed (404'd on every load — 2026-07-28
            launch audit); waves is the same R2-backed source /login serves. */}
        <source src={VIDEO.waves} type="video/mp4" />
      </VideoBackground>

      <ModalContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: 'easeOut' }}
      >
        <CloseButton type="button" onClick={handleClose} aria-label="Close password reset">
          &times;
        </CloseButton>
        <Eyebrow>Secure account recovery</Eyebrow>
        <Title id="forgot-password-title">Reset your password</Title>
        <Intro>
          Enter the email linked to your SwanStudios account. For your privacy, the response is
          identical whether or not an account exists.
        </Intro>

        {error && (
          <StatusMessage $tone="error" role="alert">
            {error}
          </StatusMessage>
        )}
        {message && (
          <StatusMessage $tone="success" role="status" aria-live="polite">
            {message}
          </StatusMessage>
        )}

        <ResetForm onSubmit={handleSubmit}>
          <FieldLabel htmlFor="forgot-password-email">Email address</FieldLabel>
          <InputField
            id="forgot-password-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            required
          />
          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending secure link...' : 'Send reset link'}
          </SubmitButton>
        </ResetForm>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ForgotPasswordModal;
