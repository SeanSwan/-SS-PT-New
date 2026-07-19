/**
 * Store V4 — useStorePackages (KIMI-STORE-CORRECTED F4). The money-READ binding. Fetches the SAME
 * `/api/storefront` V3 uses (same api client, same path), consumes the server's `pricesVisible` verbatim
 * (F4c — NOT a client-recomputed predicate), derives `priceCents` by integer string math (F4a — never
 * parseFloat×100), uses the server `pricePerSession` when present (F4b), and surfaces `activeSpecials`
 * (F4d — never silently drops a selling surface). Flagship = the single highest priceCents (deterministic).
 * Read-only: this hook never writes; the cart write is useCartBinding.
 */
import { useEffect, useState } from 'react';
import api from '../../../../services/api.service';
import type {
  StoreData, StoreLoadState, StorePackage, StoreSpecial, StorefrontItemRaw,
} from '../storeV4.types';

/** DECIMAL-string ("8400.00") → integer cents, no float dust (F4a). */
function toCents(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).trim();
  const neg = s.startsWith('-');
  const [dollars, frac = ''] = s.replace('-', '').split('.');
  const cents = parseInt(dollars || '0', 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return Number.isFinite(cents) ? (neg ? -cents : cents) : 0;
}

// Whole-dollar amounts render clean ("$8,400"); cents-bearing amounts keep the cents (money surface —
// never silently round a real price). Current SwanStudios packages are whole-dollar, so this is defensive.
const fmtMoney = (cents: number): string => {
  const dollars = Math.trunc(cents / 100);
  const rem = Math.abs(cents % 100);
  const base = dollars.toLocaleString('en-US');
  return rem === 0 ? `$${base}` : `$${base}.${String(rem).padStart(2, '0')}`;
};

function normalize(raw: StorefrontItemRaw): Omit<StorePackage, 'isFlagship'> {
  // mirror V3's price precedence (displayPrice ?? totalCost ?? price) so V4 shows the SAME number (F4b/F8)
  const priceCents = toCents(raw.displayPrice ?? raw.totalCost ?? raw.price);
  const perSessionCents = toCents(raw.pricePerSession);
  const sessions = typeof raw.sessions === 'number' ? raw.sessions : null;
  return {
    id: String(raw.id),
    packageType: String(raw.packageType ?? 'package'),
    name: String(raw.name ?? 'Training package'),
    description: String(raw.description ?? ''),
    priceCents,
    priceLabel: fmtMoney(priceCents),
    // server value verbatim when present; derive only when absent (F4b)
    perSessionLabel: perSessionCents > 0
      ? `${fmtMoney(perSessionCents)}/session`
      : sessions && sessions > 0 ? `${fmtMoney(Math.round(priceCents / sessions))}/session` : null,
    sessions,
    months: typeof raw.months === 'number' ? raw.months : null,
    sessionsPerWeek: typeof raw.sessionsPerWeek === 'number' ? raw.sessionsPerWeek : null,
  };
}

function normalizeSpecial(raw: Record<string, unknown>): StoreSpecial {
  const cents = toCents(raw.displayPrice ?? raw.totalCost ?? raw.price);
  return {
    id: String(raw.id ?? raw.name ?? 'special'),
    name: String(raw.name ?? 'Limited offer'),
    description: String(raw.description ?? ''),
    priceLabel: cents > 0 ? fmtMoney(cents) : null,
  };
}

export function useStorePackages(): StoreLoadState {
  const [state, setState] = useState<StoreLoadState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await api.get('/api/storefront');
        const body = response?.data ?? {};
        const pricesVisible = body?.pricesVisible === true;
        const rawItems: StorefrontItemRaw[] = Array.isArray(body)
          ? body
          : body.items || body.packages || body.data?.packages || body.data || [];
        const rawSpecials: Record<string, unknown>[] =
          body.data?.activeSpecials || body.activeSpecials || [];

        const normalized = (Array.isArray(rawItems) ? rawItems : []).map(normalize);
        const maxCents = normalized.reduce((m, p) => Math.max(m, p.priceCents), 0);
        // flagship only when prices are visible and a positive max exists (avoid flagging a $0 hidden set)
        const flagshipId = pricesVisible && maxCents > 0
          ? normalized.find((p) => p.priceCents === maxCents)?.id ?? null
          : null;
        const packages: StorePackage[] = normalized.map((p) => ({ ...p, isFlagship: p.id === flagshipId }));

        const data: StoreData = {
          pricesVisible,
          packages,
          activeSpecials: (Array.isArray(rawSpecials) ? rawSpecials : []).map(normalizeSpecial),
          flagshipId,
        };
        if (alive) setState({ status: 'ready', data });
      } catch {
        if (alive) setState({ status: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
