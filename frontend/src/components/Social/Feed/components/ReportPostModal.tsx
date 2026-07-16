/**
 * ┌─── SUB-COMPONENT: ReportPostModal ─────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Modal dialog for reporting a post with reason +    │
 * │          optional description. Submits via onSubmit callback.│
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │  Report Post                                     [X]  │  │
 * │ │  Why are you reporting this post?                      │  │
 * │ │  ( ) Inappropriate content                             │  │
 * │ │  ( ) Harassment / Bullying                             │  │
 * │ │  ( ) Spam                                              │  │
 * │ │  ( ) Misinformation                                    │  │
 * │ │  ( ) Hate speech                                       │  │
 * │ │  ( ) Other                                             │  │
 * │ │  Additional details (optional):                        │  │
 * │ │  [___________________________________]                 │  │
 * │ │            [Cancel]  [Submit Report]                   │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: { onClose, onSubmit }                                │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Radio] -> selects reason                                   │
 * │ [Submit] -> onSubmit(reason, description) -> closes modal   │
 * │ [Cancel/X/Overlay] -> onClose()                             │
 * │ GAMIFICATION: None                                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Flag } from 'lucide-react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ReportPostModalProps {
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => Promise<boolean>;
}

const REPORT_REASONS = [
  { value: 'inappropriate-content', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment / Bullying' },
  { value: 'spam', label: 'Spam' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'hate-speech', label: 'Hate speech' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other' },
] as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const Modal = styled.div`
  width: 100%;
  max-width: 440px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(255,255,255,0.08));
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  outline: none;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft, rgba(255,255,255,0.08));
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary, rgba(255,255,255,0.6));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.06); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const Body = styled.div`
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
`;

const Prompt = styled.p`
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(255,255,255,0.7));
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RadioLabel = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
  background: ${props => props.$selected ? 'rgba(96,192,240,0.08)' : 'transparent'};
  border: 1px solid ${props => props.$selected ? 'rgba(96,192,240,0.3)' : 'transparent'};
  transition: background 0.15s ease, border-color 0.15s ease;
  min-height: 44px;
  &:hover { background: rgba(255,255,255,0.04); }
`;

const Radio = styled.input.attrs({ type: 'radio' })`
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0;
  cursor: pointer;
  transition: border-color 0.15s ease;
  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: transparent;
    transition: background 0.15s ease;
  }

  &:checked {
    border-color: var(--accent-primary, #60C0F0);

    &::after {
      background: var(--accent-primary, #60C0F0);
    }
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(255,255,255,0.1));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 3px rgba(96,192,240,0.15);
  }
  &::placeholder { color: var(--text-muted, rgba(255,255,255,0.4)); }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-soft, rgba(255,255,255,0.08));
`;

const CancelBtn = styled.button`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(255,255,255,0.15));
  background: transparent;
  color: var(--text-secondary, rgba(255,255,255,0.7));
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.04); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const SubmitBtn = styled.button`
  min-height: 44px;
  padding: 8px 24px;
  border-radius: 10px;
  border: none;
  background: #C92A54;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s ease;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ReportPostModal: React.FC<ReportPostModalProps> = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape to close
  useEffect(() => {
    modalRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const ok = await onSubmit(reason, description || undefined);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <Overlay onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Modal
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report post"
        tabIndex={-1}
      >
        <Header>
          <Title><Flag size={18} /> Report Post</Title>
          <CloseBtn onClick={onClose} aria-label="Close"><X size={18} /></CloseBtn>
        </Header>

        <Body>
          <Prompt>Why are you reporting this post?</Prompt>
          <RadioGroup>
            {REPORT_REASONS.map((r) => (
              <RadioLabel
                key={r.value}
                $selected={reason === r.value}
                htmlFor={`report-reason-${r.value}`}
              >
                <Radio
                  id={`report-reason-${r.value}`}
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                />
                {r.label}
              </RadioLabel>
            ))}
          </RadioGroup>

          <TextArea
            placeholder="Additional details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </Body>

        <Footer>
          <CancelBtn onClick={onClose}>Cancel</CancelBtn>
          <SubmitBtn
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </SubmitBtn>
        </Footer>
      </Modal>
    </Overlay>
  );
};

export default ReportPostModal;
