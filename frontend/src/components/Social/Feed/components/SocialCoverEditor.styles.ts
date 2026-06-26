/**
 * ============================================================================
 * FILE: SocialCoverEditor.styles.ts
 * PURPOSE: Styled-components for the /social embedded cover editor (M6a).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-12
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Glass editor card that expands below the Feed Cover
 * Studio — live preview frame + the shared banner reposition panel content.
 * Low-motion C12 vocabulary, tokens-with-fallbacks, 44px controls.
 */

import styled from 'styled-components';

export const EditorCard = styled.section`
  margin-top: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-purple, #8B5CF6) 22%, transparent);
  border-radius: 16px;
  padding: 14px;
  background: var(--bg-elevated, rgba(0, 48, 128, 0.85));

  @supports (backdrop-filter: blur(16px)) {
    background: var(--bg-elevated, rgba(0, 48, 128, 0.62));
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
`;

export const EditorHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

export const EditorTitle = styled.h4`
  margin: 0;
  margin-right: auto;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
`;

export const EditorButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* Live preview of the composition, scaled down. position:relative is the
   anchor for the absolute banner media layers. */
export const PreviewFrame = styled.div<{ $draggable?: boolean }>`
  position: relative;
  height: clamp(140px, 24vw, 220px);
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: var(--bg-surface, #141419);
  cursor: ${({ $draggable }) => ($draggable ? 'grab' : 'default')};
  touch-action: ${({ $draggable }) => ($draggable ? 'none' : 'auto')};
  user-select: none;

  &:active {
    cursor: ${({ $draggable }) => ($draggable ? 'grabbing' : 'default')};
  }
`;

/* The shared reposition panel content was authored for a dashboard popover;
   give it a neutral, full-width well here. */
export const PanelWell = styled.div`
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  padding-top: 12px;
`;

/* M6a: the cover's "Edit cover" entry — lives in the cover's ActionRow (the
   stage itself is aria-hidden, so interactive controls stay out of it). */
export const EditCoverButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 10px 13px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--accent-gold, #C6A84B);
  cursor: pointer;
  font: 800 0.78rem/1 'Sora', sans-serif;
  transition: border-color 160ms ease, background 160ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 52%, transparent);
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
