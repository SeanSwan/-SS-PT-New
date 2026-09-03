/**
 * ============================================================================
 * FILE: SwanDialog.styles.ts
 * PURPOSE: Crystalline Swan chrome for the shared dialog primitive.
 *
 * Tokens with literal fallbacks (Rule 6), and the fallbacks are Active Palette
 * values so the dialog is correct even before a theme provider mounts — a
 * confirm dialog that renders unstyled is a confirm dialog nobody trusts.
 *
 * Z-INDEX: 2400, lifted verbatim from the hand-rolled ConfirmModal this
 * primitive replaces. Blueprint v3 said to read VaultDrawer (z-index: 100) and
 * use +1 — measured and WRONG: at 101 this dialog would render behind the very
 * surfaces it must sit above. The live value that works is the one kept.
 *
 * MOTION: opacity/transform only, and nothing at all under
 * prefers-reduced-motion. No layout-animating properties (Rule 25).
 * ============================================================================
 */
import styled, { css, keyframes } from 'styled-components';
import * as Dialog from '@radix-ui/react-dialog';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

/** `css` helper, not a plain string: these interpolate keyframes objects, and a
 *  plain template would stringify them into a broken class name (Rule 43). */
const overlayMotion = css`
  animation: ${fadeIn} 140ms ease-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const contentMotion = css`
  animation: ${riseIn} 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  z-index: 2400;
  /* swan-guard-allow-hex the exact scrim of the hand-rolled ConfirmModal this
     primitive replaces — preserved verbatim so consumer #1 is a pure behaviour
     migration with no visual change. Deliberately NOT a new var(): the token
     registry proved --overlay-scrim is itself used-but-never-defined elsewhere,
     and inventing a second undefined name would render its fallback forever
     while pretending to be themeable. */
  background: rgba(3, 7, 18, 0.66);
  backdrop-filter: blur(3px);
  ${overlayMotion}
`;

export const Content = styled(Dialog.Content)`
  position: fixed;
  z-index: 2401;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 2rem);
  max-width: 420px;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  background: var(--card-bg, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  ${contentMotion}

  &:focus { outline: none; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 2px;
  }

  /* Phone: a bottom sheet reaches the thumb; a centred box does not. */
  @media (max-width: 640px) {
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    transform: none;
    width: 100%;
    max-width: none;
    border-radius: 16px 16px 0 0;
    padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  }
`;

export const TitleRow = styled(Dialog.Title)<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $danger }) => ($danger ? 'var(--danger, #e5484d)' : 'var(--text-primary, #e0ecf4)')};
`;

export const Message = styled(Dialog.Description)`
  margin: 0 0 1.25rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--text-muted, #8fa3b8);
`;

export const Body = styled.div`
  margin: 0 0 1.25rem;
  color: var(--text-primary, #e0ecf4);
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;

  /* Stacked full-width on phones so both controls clear the 44px target and
     neither hides under the other. */
  @media (max-width: 640px) {
    flex-direction: column-reverse;
    > * { width: 100%; }
  }
`;
