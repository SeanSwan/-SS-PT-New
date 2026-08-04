/**
 * FILE: useCartDeepLink.ts
 * PURPOSE: Consume the checkout-cancel recovery deep link on the store surfaces.
 *
 * /checkout/cancel sends a buyer who backed out of Stripe to
 * `/store?openCart=true` ("Return to cart") or `?openCart=true&retryCheckout=true`
 * ("Try again"). Both store surfaces must honour it: StoreV3 is canonical, and
 * StoreV2 is genuinely reachable as the lazy-import fallback when the primary
 * chunk fails to load — a buyer who lands there after abandoning a payment
 * deserves the same recovery, not a silently closed cart.
 *
 * Shared rather than copy-pasted because the auth-timing rule below is subtle
 * enough that two copies would drift.
 *
 * Reads window.location instead of useSearchParams on purpose: both store
 * components are rendered bare (no Router) by their own test suites, and a
 * router hook throws outside a Router.
 */
import { useEffect, useRef } from 'react';

export const useCartDeepLink = (
  isAuthenticated: boolean,
  openCart: () => void,
): void => {
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    if (typeof window === 'undefined') return;

    // Wait for auth before consuming. AuthContext starts loading=true and
    // isAuthenticated=false, so acting on the first render would consume the
    // link while the returning buyer still looks like a guest, and the cart
    // would never open. Leaving the params in place lets this effect re-run once
    // auth resolves; for a genuine guest they simply stay in the URL, which is
    // harmless (the cart dock is hidden for them anyway).
    if (!isAuthenticated) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('openCart') !== 'true') return;

    consumed.current = true;
    openCart();

    params.delete('openCart');
    params.delete('retryCheckout');
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, [isAuthenticated, openCart]);
};

export default useCartDeepLink;
