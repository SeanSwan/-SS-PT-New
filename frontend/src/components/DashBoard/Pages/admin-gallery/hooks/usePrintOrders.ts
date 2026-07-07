/**
 * usePrintOrders — admin fulfillment data + actions (Slice 3d).
 * Loads print orders (optionally status-filtered), and runs retry / mark-shipped /
 * refund actions, reloading the list after each so the UI reflects the new state.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listPrintOrders,
  markPrintOrderShipped,
  refundPrintOrder,
  retryPrintFulfillment,
} from '../adminGalleryApi';
import type { PrintOrder, PrintOrderStatus } from '../types';

export type PrintOrderFilter = PrintOrderStatus | 'all';

export function usePrintOrders() {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrintOrderFilter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (f: PrintOrderFilter) => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await listPrintOrders(f));
    } catch {
      setError('Could not load print orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter); }, [filter, load]);

  const runAction = useCallback(
    async (id: number, fn: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> => {
      setBusyId(id);
      setError(null);
      const r = await fn();
      setBusyId(null);
      if (!r.ok) {
        setError(r.error || 'Action failed.');
        return false;
      }
      await load(filter);
      return true;
    },
    [filter, load],
  );

  return {
    orders,
    loading,
    error,
    filter,
    busyId,
    setFilter,
    reload: () => load(filter),
    retry: (id: number) => runAction(id, () => retryPrintFulfillment(id)),
    markShipped: (id: number, trackingNumber?: string) => runAction(id, () => markPrintOrderShipped(id, trackingNumber)),
    refund: (id: number) => runAction(id, () => refundPrintOrder(id)),
  };
}
