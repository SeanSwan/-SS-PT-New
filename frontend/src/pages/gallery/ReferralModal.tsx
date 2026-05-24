/**
 * ReferralModal.tsx
 * =================
 * Gallery referral capture modal backed by POST /api/gallery/referral.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Send, UserPlus, X } from 'lucide-react';
import {
  Card,
  CloseButton,
  Feedback,
  Field,
  IconBadge,
  Input,
  Label,
  Overlay,
  Required,
  Spinner,
  SubmitButton,
  Subtitle,
  Title,
} from './ReferralModal.styles';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  galleryToken: string;
  eventSlug: string;
  onReferralSubmitted?: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  email,
  galleryToken,
  eventSlug,
  onReferralSubmitted,
}) => {
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [referralEmail, setReferralEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setReferralName('');
    setReferralPhone('');
    setReferralEmail('');
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => nameRef.current?.focus(), 100);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (feedback?.type !== 'success') return;
    const t = setTimeout(() => {
      onClose();
      resetForm();
    }, 2200);
    return () => clearTimeout(t);
  }, [feedback, onClose, resetForm]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!referralName.trim() || !referralPhone.trim()) {
      setFeedback({ type: 'error', text: 'Referral name and phone are required.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({
          referralName: referralName.trim(),
          referralPhone: referralPhone.trim(),
          referralEmail: referralEmail.trim() || undefined,
          referredBy: email,
          eventSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Could not send the referral.' });
        return;
      }
      setFeedback({ type: 'success', text: data.message || 'Referral sent. We added 5 enhancement credits.' });
      onReferralSubmitted?.();
    } catch {
      setFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <Card role="dialog" aria-modal="true" aria-label="Refer a friend">
        <CloseButton type="button" onClick={onClose} aria-label="Close referral form">
          <X size={18} />
        </CloseButton>
        <IconBadge aria-hidden="true"><UserPlus size={24} /></IconBadge>
        <Title>Refer a Friend</Title>
        <Subtitle>
          Send Sean the best contact for someone who wants stronger training, fewer barriers, and a clear next step.
        </Subtitle>
        <form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="gallery-referral-name">Name <Required>*</Required></Label>
            <Input id="gallery-referral-name" ref={nameRef} value={referralName} onChange={e => setReferralName(e.target.value)} placeholder="First and last name" />
          </Field>
          <Field>
            <Label htmlFor="gallery-referral-phone">Phone <Required>*</Required></Label>
            <Input id="gallery-referral-phone" type="tel" value={referralPhone} onChange={e => setReferralPhone(e.target.value)} placeholder="Best phone number" />
          </Field>
          <Field>
            <Label htmlFor="gallery-referral-email">Email</Label>
            <Input id="gallery-referral-email" type="email" value={referralEmail} onChange={e => setReferralEmail(e.target.value)} placeholder="Optional" />
          </Field>
          {feedback && (
            <Feedback $type={feedback.type}>
              {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.text}</span>
            </Feedback>
          )}
          <SubmitButton type="submit" $loading={loading} disabled={loading || feedback?.type === 'success'}>
            {loading ? <><Spinner /> Sending...</> : <><Send size={16} /> Send Referral</>}
          </SubmitButton>
        </form>
      </Card>
    </Overlay>
  );
};

export default ReferralModal;
