/**
 * Store V4 — useCartBinding (KIMI-STORE-CORRECTED §6a BIND-ONLY). The money-WRITE binding: a thin
 * wrapper over the SHIPPED `useCart()` — it never reimplements cart logic, it calls `addToCart` with the
 * real payload V3 uses (`{ storefrontItemId, quantity }`). Returns a confirm-first `add()` that resolves
 * true ONLY after the cart write succeeds — so the flagship Crystallize fires on real success, not hope.
 */
import { useCallback, useState } from 'react';
import { useCart } from '../../../../context/CartContext';

export interface CartBinding {
  add: (packageId: string) => Promise<boolean>;
  busyId: string | null;
  count: number;
}

export function useCartBinding(): CartBinding {
  const { cart, addToCart } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  const add = useCallback(
    async (packageId: string): Promise<boolean> => {
      const storefrontItemId = Number(packageId);
      if (!Number.isFinite(storefrontItemId) || storefrontItemId <= 0) return false;
      setBusyId(packageId);
      try {
        await addToCart({ storefrontItemId, quantity: 1 });
        return true;
      } catch {
        return false; // caller surfaces the toast; no optimistic success
      } finally {
        setBusyId(null);
      }
    },
    [addToCart],
  );

  const count = cart?.itemCount ?? 0;
  return { add, busyId, count };
}
