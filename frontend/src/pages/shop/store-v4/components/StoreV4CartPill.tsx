/**
 * Store V4 — CartPill (KIMI-STORE-CORRECTED F6/F7a). A persistent link to the cart. F6: z-index binds
 * to `var(--store-z-sticky)` (a shipped lens slot), never a magic number that lands under a bottom nav.
 * F7a: the `aria-live` region is mounted PERSISTENTLY (visually hidden at count 0) and only its content
 * toggles — a live region that appears already-populated isn't reliably announced. Bump is 1.08 (D7:
 * a jeweler doesn't jump; 1.22 reads Duolingo).
 */
import styled from 'styled-components';

const Pill = styled.a<{ $visible: boolean }>`
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: var(--store-z-sticky, 40);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: var(--store-target, 48px);
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid var(--store-chrome-edge);
  background: var(--store-surface-1);
  color: var(--store-ink);
  font: 700 14px / 1 var(--store-font-display, inherit);
  text-decoration: none;
  box-shadow: var(--store-elev-2);
  transition: transform 160ms var(--store-ease-standard), opacity 160ms var(--store-ease-standard);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transform: ${({ $visible }) => ($visible ? 'scale(1.08)' : 'scale(1)')};
  &:hover {
    filter: brightness(1.06);
  }
`;
const Count = styled.span`
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--store-ice) 24%, transparent);
  font-size: 12px;
`;
const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export function StoreV4CartPill({ count, href = '/checkout' }: { count: number; href?: string }) {
  const visible = count > 0;
  return (
    <>
      {/* persistent live region — announced when the count changes (F7a) */}
      <SrOnly aria-live="polite" data-testid="store-cart-live">
        {visible ? `${count} item${count === 1 ? '' : 's'} in cart` : ''}
      </SrOnly>
      <Pill href={href} $visible={visible} aria-hidden={!visible} data-testid="store-cart-pill">
        View cart <Count>{count}</Count>
      </Pill>
    </>
  );
}
