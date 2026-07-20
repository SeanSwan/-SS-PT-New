/**
 * Gallery vNext — checkout/return toast. Surfaces the same messages the shipped page shows when a visitor
 * returns from credit / donation / print checkout (GalleryPage.tsx:1276-1309). Announced politely for AT;
 * dismissible with a 44px control; transform/opacity only so reduced-motion collapses it cleanly.
 */
import styled from 'styled-components';

const Wrap = styled.div<{ $exiting: boolean }>`
  position: fixed;
  left: 50%;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  z-index: var(--gallery-z-toast, 60);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(92vw, 460px);
  padding: 12px 14px;
  border-radius: var(--gallery-r-card, 12px);
  background: var(--gallery-surface-1);
  border: 1px solid var(--gallery-chrome-edge);
  box-shadow: var(--gallery-elev-3);
  color: var(--gallery-ink);
  font-size: 0.92rem;
  transform: translate(-50%, ${(p) => (p.$exiting ? '8px' : '0')});
  opacity: ${(p) => (p.$exiting ? 0 : 1)};
  transition: opacity 400ms var(--gallery-ease-standard), transform 400ms var(--gallery-ease-standard);
`;

const Dismiss = styled.button`
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  margin: -10px -6px -10px 0;
  border: 0;
  background: none;
  color: var(--gallery-ink-2);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
`;

export interface CheckoutToastProps {
  message: string;
  visible: boolean;
  exiting: boolean;
  onDismiss(): void;
}

export function CheckoutToast({ message, visible, exiting, onDismiss }: CheckoutToastProps) {
  if (!visible) return null;
  return (
    <Wrap $exiting={exiting} role="status" aria-live="polite" data-testid="gallery-checkout-toast">
      <span>{message}</span>
      <Dismiss type="button" onClick={onDismiss} aria-label="Dismiss notification">
        ×
      </Dismiss>
    </Wrap>
  );
}

export default CheckoutToast;
