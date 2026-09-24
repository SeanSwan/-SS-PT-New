/**
 * FILE: CoachWorkspace.strip.styles.ts
 * PURPOSE: The one-line Today strip above the conversation. Chips are 44px
 * targets; past sessions dim; the now-line glows in the action colour. Hidden on
 * phones, where the chat owns the screen. Colours are var(--ws-*) only.
 */
import styled from 'styled-components';

export const StripRoot = styled.nav`
  flex: none; display: flex; align-items: center; gap: 10px; margin: 10px auto 0; width: calc(100% - 2 * clamp(12px, 3vw, 28px));
  max-width: 820px; padding: 4px 6px 4px 12px; border-radius: 14px;
  border: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-text) 3%, transparent);

  .ws-strip-label {
    flex: none; display: inline-flex; align-items: center; gap: 6px;
    font: 600 10.5px var(--ws-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ws-muted);
  }
  .ws-strip-label svg { color: var(--ws-accent); }
  ol {
    flex: 1 1 auto; min-width: 0; list-style: none; margin: 0; padding: 0; display: flex; align-items: center; gap: 6px; overflow: hidden;
    mask-image: linear-gradient(to right, var(--ws-text) 86%, transparent); /* a cut chip fades instead of clipping */
  }
  li { flex: none; }
  li button {
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--ws-line); background: var(--ws-panel); color: var(--ws-text-soft); font-size: 12.5px; white-space: nowrap;
  }
  li button code { font: 500 12px var(--ws-mono); color: var(--ws-muted); }
  li[data-past='true'] button { opacity: 0.6; }
  li[data-next='true'] button {
    border-color: var(--ws-accent); background: var(--ws-accent-soft); color: var(--ws-text); font-weight: 650;
    box-shadow: 0 0 14px color-mix(in srgb, var(--ws-accent) 30%, transparent);
  }
  li[data-next='true'] button code { color: var(--ws-text); }
  .ws-strip-now {
    width: 2px; height: 30px; border-radius: 2px; background: var(--ws-action);
    box-shadow: 0 0 10px color-mix(in srgb, var(--ws-action) 60%, transparent);
  }
  .ws-strip-open {
    flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 10px; cursor: pointer;
    border: 0; border-radius: 999px; background: transparent; color: var(--ws-accent); font-size: 12.5px; font-weight: 600;
  }
  /* Phones: the conversation owns the screen; Today is one tap away in the view switch. */
  @media (max-width: 767.98px) { display: none; }
`;
