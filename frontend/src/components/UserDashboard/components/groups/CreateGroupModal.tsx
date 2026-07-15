/**
 * ============================================================================
 * FILE: CreateGroupModal.tsx
 * PURPOSE: Portal modal for creating a community group (name, emoji,
 *          description, category, privacy).
 * HOW IT FITS: Opened from GroupsHub; calls useGroups().createGroup.
 * KEY DECISIONS: Portaled to document.body at z-index 10000 (buried-dialog
 *          bug class — never render dialogs inside transformed card shells).
 * ============================================================================
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styled from 'styled-components';
import { GROUP_CATEGORIES, type CreateGroupInput } from '../../../../hooks/social/useGroups';
import {
  CategoryChip,
  CategoryChipRow,
  GroupSearchInput,
  PrimaryGroupButton,
  QuietGroupButton,
} from './GroupsShared.styles';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #030712) 78%, transparent);
  backdrop-filter: blur(6px);
`;

const Dialog = styled.div`
  width: min(520px, 100%);
  max-height: min(88vh, 720px);
  overflow-y: auto;
  display: grid;
  gap: 0.9rem;
  padding: clamp(1rem, 3vw, 1.4rem);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--surface-primary, #003080) 55%, transparent),
      color-mix(in srgb, var(--bg-elevated, #1A1A24) 96%, transparent)
    );
  box-shadow: 0 26px 60px color-mix(in srgb, var(--bg-base, #030712) 65%, transparent);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;

  h2 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary, #E0ECF4);
  }
`;

const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const FieldLabel = styled.label`
  display: grid;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

const DescriptionInput = styled.textarea`
  min-height: 96px;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.92rem;
  font-family: inherit;
  resize: vertical;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const FooterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: flex-end;
`;

const EMOJI_CHOICES = ['💪', '🏋️', '🏃', '🧘‍♀️', '🥗', '🔥', '🏆', '🦢', '⛰️', '🎨', '⚽', '🚴'];

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (input: CreateGroupInput) => Promise<unknown>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState<string>('💪');
  const [category, setCategory] = useState<string>('fitness');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = name.trim().length >= 3 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const created = await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        category,
        privacy,
      });
      if (created) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <Backdrop role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Dialog role="dialog" aria-modal="true" aria-label="Create a group">
        <DialogHeader>
          <h2>Create a group</h2>
          <CloseButton type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </CloseButton>
        </DialogHeader>

        <FieldLabel>
          Group name
          <GroupSearchInput
            ref={nameRef}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Morning Bootcamp Crew"
          />
        </FieldLabel>

        <FieldLabel>
          What is this group about?
          <DescriptionInput
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who it's for, what you share, and the vibe."
          />
        </FieldLabel>

        <FieldLabel as="div">
          Icon
          <CategoryChipRow role="radiogroup" aria-label="Group icon">
            {EMOJI_CHOICES.map((choice) => (
              <CategoryChip
                key={choice}
                type="button"
                role="radio"
                aria-checked={emoji === choice}
                $active={emoji === choice}
                onClick={() => setEmoji(choice)}
              >
                {choice}
              </CategoryChip>
            ))}
          </CategoryChipRow>
        </FieldLabel>

        <FieldLabel as="div">
          Category
          <CategoryChipRow role="radiogroup" aria-label="Group category">
            {GROUP_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                type="button"
                role="radio"
                aria-checked={category === cat}
                $active={category === cat}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </CategoryChip>
            ))}
          </CategoryChipRow>
        </FieldLabel>

        <FieldLabel as="div">
          Privacy
          <CategoryChipRow role="radiogroup" aria-label="Group privacy">
            <CategoryChip
              type="button"
              role="radio"
              aria-checked={privacy === 'public'}
              $active={privacy === 'public'}
              onClick={() => setPrivacy('public')}
            >
              Public — anyone can join
            </CategoryChip>
            <CategoryChip
              type="button"
              role="radio"
              aria-checked={privacy === 'private'}
              $active={privacy === 'private'}
              onClick={() => setPrivacy('private')}
            >
              Private — approval required
            </CategoryChip>
          </CategoryChipRow>
        </FieldLabel>

        <FooterRow>
          <QuietGroupButton type="button" onClick={onClose}>Cancel</QuietGroupButton>
          <PrimaryGroupButton type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? 'Creating…' : 'Create group'}
          </PrimaryGroupButton>
        </FooterRow>
      </Dialog>
    </Backdrop>,
    document.body,
  );
};

export default CreateGroupModal;
