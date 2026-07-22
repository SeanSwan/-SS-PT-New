/**
 * Gallery vNext — enhancement-credit money hook. BIND-ONLY: same endpoints, same request bodies, same
 * semantics as the shipped GalleryPage (GalleryPage.tsx:1243-1309, 1555-1651). Nothing about the money path
 * is redesigned here — only relocated so the vNext can use it without editing the V-prev page.
 *
 * Kimi Q4 (binding): credits are an AFTER-the-gate concept. This hook no-ops without a galleryToken, and the
 * CreditPill/upgrade UI must not render pre-gate — there is no anonymous credit state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCredits as fetchCreditsApi, purchaseCredits, requestEnhancement } from './gallery.api';
import {
  DEFAULT_CREDITS,
  hasCredits as hasCreditsOf,
  type CreditPackage,
  type EnhancementCredits,
} from './gallery.types';

/** `credits_required` is the backend's explicit signal; the caller opens the upgrade modal on it. */
export type EnhancementOutcome = 'ok' | 'credits_required' | 'error';

/**
 * Checkout returns are FULL-PAGE redirects (Stripe → back), so the return params arrive with the page load.
 * ENTRY_SEARCH is captured in galleryEntrySearch.ts at parked-chunk evaluation, before StrictMode's
 * throwaway first mount can strip the URL and eat the checkout-return toast.
 */
import { ENTRY_SEARCH } from './galleryEntrySearch';

const RETURN_KEYS = ['credits', 'donation', 'print'] as const;

export interface GalleryCredits {
  credits: EnhancementCredits;
  hasCredits: boolean;
  purchaseLoading: CreditPackage | null;
  refresh(): Promise<void>;
  purchase(pkg: CreditPackage): Promise<void>;
  enhance(photoIds: number[]): Promise<EnhancementOutcome>;
}

export function useGalleryCredits(
  galleryToken: string | null,
  showToast: (next?: string) => void,
): GalleryCredits {
  const [credits, setCredits] = useState<EnhancementCredits>(DEFAULT_CREDITS);
  const [purchaseLoading, setPurchaseLoading] = useState<CreditPackage | null>(null);

  const refresh = useCallback(async () => {
    if (!galleryToken) return;
    try {
      const data = await fetchCreditsApi(galleryToken);
      if (data.success && data.credits) setCredits(data.credits);
    } catch {
      /* credits fetch failed — keep the last known balance */
    }
  }, [galleryToken]);

  useEffect(() => {
    if (galleryToken) void refresh();
  }, [galleryToken, refresh]);

  /** Redirects to the hosted checkout on success — same as the shipped page. */
  const purchase = useCallback(
    async (pkg: CreditPackage) => {
      if (!galleryToken) return;
      setPurchaseLoading(pkg);
      try {
        const data = await purchaseCredits(galleryToken, pkg);
        if (data.success && data.checkoutUrl) window.location.href = data.checkoutUrl;
      } catch {
        /* best effort — the pill re-enables in finally */
      } finally {
        setPurchaseLoading(null);
      }
    },
    [galleryToken],
  );

  const enhance = useCallback(
    async (photoIds: number[]): Promise<EnhancementOutcome> => {
      if (!galleryToken || photoIds.length === 0) return 'error';
      // Client-side guard mirrors the page: no credits → upgrade path without burning a request.
      if (!hasCreditsOf(credits)) return 'credits_required';
      try {
        const data = await requestEnhancement(galleryToken, photoIds);
        if (data.error === 'credits_required') return 'credits_required';
        if (data.success) {
          await refresh();
          return 'ok';
        }
        return 'error';
      } catch {
        return 'error';
      }
    },
    [galleryToken, credits, refresh],
  );

  // Checkout return — mirrors GalleryPage.tsx:1276-1309 verbatim (same params, copy, and URL cleanup).
  // Reads the LIVE search when it still carries return keys, else the module-captured ENTRY_SEARCH (so a
  // remount after the URL strip still delivers the toast). Ref-guarded once per mount.
  const handledReturn = useRef(false);
  useEffect(() => {
    if (handledReturn.current) return;
    const live = new URLSearchParams(window.location.search);
    const params = RETURN_KEYS.some((k) => live.has(k)) ? live : new URLSearchParams(ENTRY_SEARCH);
    const creditStatus = params.get('credits');
    const donationStatus = params.get('donation');
    const printStatus = params.get('print');
    if (!creditStatus && !donationStatus && !printStatus) return;
    handledReturn.current = true;

    if (creditStatus === 'success') {
      showToast('Enhancement credits are ready. Select your photos when you are ready.');
      if (galleryToken) void refresh();
    } else if (creditStatus === 'cancelled') {
      showToast('Credit checkout cancelled. Your gallery is still open.');
    }

    if (donationStatus === 'success') {
      showToast('Thank you for supporting SwanStudios.');
    } else if (donationStatus === 'cancelled') {
      showToast('Donation checkout cancelled. Your gallery is still open.');
    }

    if (printStatus === 'success') {
      showToast('Print order placed! You will get an email confirmation and shipping updates.');
    } else if (printStatus === 'cancelled') {
      showToast('Print checkout cancelled. Your gallery is still open.');
    }

    const url = new URL(window.location.href);
    ['credits', 'donation', 'package', 'print', 'orderId'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }, [galleryToken, refresh, showToast]);

  return {
    credits,
    hasCredits: hasCreditsOf(credits),
    purchaseLoading,
    refresh,
    purchase,
    enhance,
  };
}
