/**
 * ┌─── SHARED COMPONENT: TeachMeToggle ───────────────────────┐
 * │ PURPOSE: Educational toggle panel for any section          │
 * │ Shows/hides contextual training content with AI Coach link │
 * │ Props: { sectionId, title, content, onAskAI? }            │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { HelpCircle, X, MessageCircle, ChevronDown } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface TeachMeToggleProps {
  sectionId: string;
  title: string;
  content: string | React.ReactNode;
  onAskAI?: () => void;
  defaultOpen?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const slideIn = keyframes`
  from { opacity: 0; max-height: 0; transform: translateY(-8px); }
  to { opacity: 1; max-height: 600px; transform: translateY(0); }
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, rgba(224, 236, 244, 0.5))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: var(--accent-secondary, #8B5CF6);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const Panel = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'block' : 'none'};
  margin-top: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 4%, var(--bg-surface, #1A1A24));
  animation: ${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PanelTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-secondary, #8B5CF6);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { color: var(--text-primary, #E0ECF4); }
`;

const PanelContent = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  white-space: pre-wrap;

  strong { color: var(--text-primary, #E0ECF4); font-weight: 600; }
  ul, ol { padding-left: 18px; margin: 8px 0; }
  li { margin: 4px 0; }
  code {
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(96, 192, 240, 0.08);
    color: var(--accent-primary, #60C0F0);
  }
`;

const AskAIBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s ease;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent); }
`;

const FirstTimeBadge = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(139, 92, 246, 0.2);
  color: var(--accent-secondary, #8B5CF6);
  animation: ${keyframes`0%,100%{opacity:1}50%{opacity:0.5}`} 2s ease-in-out 3;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const SEEN_KEY = 'ss-teachme-seen';

const TeachMeToggle: React.FC<TeachMeToggleProps> = ({
  sectionId,
  title,
  content,
  onAskAI,
  defaultOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Check if this section has been seen before
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
      if (!seen[sectionId]) {
        setIsFirstTime(true);
        if (defaultOpen !== false) setOpen(true);
        seen[sectionId] = Date.now();
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      }
    } catch { /* ignore */ }
  }, [sectionId, defaultOpen]);

  const toggle = useCallback(() => setOpen(p => !p), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <ToggleBtn onClick={toggle} $active={open} aria-expanded={open} aria-label={`Teach Me: ${title}`}>
        <HelpCircle size={14} />
        Teach Me
        {isFirstTime && !open && <FirstTimeBadge>New</FirstTimeBadge>}
      </ToggleBtn>

      <Panel $open={open}>
        <PanelHeader>
          <PanelTitle>
            <HelpCircle size={16} />
            {title}
          </PanelTitle>
          <CloseBtn onClick={close} aria-label="Close teach me panel">
            <X size={14} />
          </CloseBtn>
        </PanelHeader>

        <PanelContent>
          {typeof content === 'string' ? (
            <div>{content}</div>
          ) : (
            content
          )}
        </PanelContent>

        {onAskAI && (
          <AskAIBtn onClick={onAskAI}>
            <MessageCircle size={14} />
            Ask Swan Coach for help
          </AskAIBtn>
        )}
      </Panel>
    </>
  );
};

export default memo(TeachMeToggle);
