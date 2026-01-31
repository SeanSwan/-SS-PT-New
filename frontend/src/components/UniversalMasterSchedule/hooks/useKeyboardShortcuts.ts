import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onCreateSession: () => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onCloseModal: () => void;
  isModalOpen: boolean;
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
  const isEditable = target.isContentEditable;
  return isInput || isEditable;
};

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    onCreateSession,
    onToday,
    onPrevious,
    onNext,
    onCloseModal,
    isModalOpen
  } = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key;
      const isTyping = isTypingTarget(event.target);

      if (key === 'Escape' && isModalOpen) {
        event.preventDefault();
        onCloseModal();
        return;
      }

      if (isModalOpen || isTyping) {
        return;
      }

      if (key === 'n' || key === 'N') {
        event.preventDefault();
        onCreateSession();
        return;
      }

      if (key === 't' || key === 'T') {
        event.preventDefault();
        onToday();
        return;
      }

      if (key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (key === 'ArrowRight') {
        event.preventDefault();
        onNext();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCreateSession, onToday, onPrevious, onNext, onCloseModal, isModalOpen]);
}
