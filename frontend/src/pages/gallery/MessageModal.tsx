/**
 * MessageModal.tsx
 * ================
 * Modal for gallery visitors to send notes/messages to the admin.
 * Design: Gemini 3.1 Pro directive — Crystalline Swan glassmorphism.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Types ─────────────────────────────────────────────────────────────────
export interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  galleryToken: string;
  eventSlug: string;
}

// ── Animations ────────────────────────────────────────────────────────────
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ── Styled Components ─────────────────────────────────────────────────────
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 26, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: #0a0a1a;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 24px;
  padding: 32px 28px;
  color: rgba(255, 255, 255, 0.9);
  animation: ${fadeInUp} 0.35s ease-out;

  @media (max-width: 767px) {
    padding: 24px 20px;
    border-radius: 16px;
  }

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(96, 192, 240, 0.15);
    border-radius: 3px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const ModalTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #60C0F0;
  margin: 0 0 4px;
`;

const ModalSubtitle = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 24px;
  line-height: 1.5;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #A0AABF;
  margin-bottom: 6px;
`;

const Input = styled.input<{ $disabled?: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  background: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${p => p.$disabled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  color: ${p => p.$disabled ? 'rgba(255, 255, 255, 0.35)' : '#fff'};
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: rgba(96, 192, 240, 0.4);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
  background: linear-gradient(135deg, #60C0F0 0%, #50A0F0 100%);
  border: none;
  border-radius: 12px;
  color: #002060;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  cursor: ${p => p.$loading ? 'wait' : 'pointer'};
  opacity: ${p => p.$loading ? 0.7 : 1};
  transition: opacity 0.2s, transform 0.15s;
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 32, 96, 0.3);
  border-top-color: #002060;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const FeedbackMessage = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-top: 12px;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;

  ${p =>
    p.$type === 'success'
      ? `
    background: rgba(96, 192, 240, 0.08);
    border: 1px solid rgba(96, 192, 240, 0.2);
    color: #60C0F0;
  `
      : `
    background: rgba(255, 107, 107, 0.08);
    border: 1px solid rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
  `}
`;

const FeedbackIcon = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const RequiredStar = styled.span`
  color: #ff6b6b;
  margin-left: 2px;
`;

// ── Component ─────────────────────────────────────────────────────────────
const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  email,
  galleryToken,
  eventSlug,
}) => {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus the message textarea on open
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      // Slight delay so the animation can start first
      const t = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ESC key closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  const handleTabTrap = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !contentRef.current) return;

      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleTabTrap);
    return () => window.removeEventListener('keydown', handleTabTrap);
  }, [isOpen, handleTabTrap]);

  // Auto-close on success
  useEffect(() => {
    if (feedback?.type === 'success') {
      const t = setTimeout(() => {
        onClose();
        // Reset form for next open
        setFirstName('');
        setPhone('');
        setMessage('');
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [feedback, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!message.trim()) {
      setFeedback({ type: 'error', text: 'Please write a message before sending.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({
          email,
          firstName: firstName.trim() || undefined,
          phone: phone.trim() || undefined,
          message: message.trim(),
          eventSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          text: data.message || data.error || 'Failed to send message. Please try again.',
        });
        return;
      }

      setFeedback({ type: 'success', text: 'Your note has been sent! Thank you.' });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent ref={contentRef} role="dialog" aria-modal="true" aria-label="Send a note">
        <CloseButton onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </CloseButton>

        <ModalTitle>Send a Note</ModalTitle>
        <ModalSubtitle>
          Have a question, request, or just want to say thanks? We'd love to hear from you.
        </ModalSubtitle>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              disabled
              $disabled
              tabIndex={-1}
            />
          </FormGroup>

          <FieldRow>
            <FormGroup>
              <Label>First Name</Label>
              <Input
                type="text"
                placeholder="Optional"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </FormGroup>
            <FormGroup>
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="Optional"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </FormGroup>
          </FieldRow>

          <FormGroup>
            <Label>
              Message<RequiredStar>*</RequiredStar>
            </Label>
            <TextArea
              ref={messageInputRef}
              placeholder="Write your message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
            />
          </FormGroup>

          {feedback && (
            <FeedbackMessage $type={feedback.type}>
              <FeedbackIcon>
                {feedback.type === 'success' ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </FeedbackIcon>
              {feedback.text}
            </FeedbackMessage>
          )}

          <SubmitButton
            type="submit"
            $loading={loading}
            disabled={loading || feedback?.type === 'success'}
          >
            {loading ? (
              <>
                <Spinner />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Note
              </>
            )}
          </SubmitButton>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default MessageModal;
