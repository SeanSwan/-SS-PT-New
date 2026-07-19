/**
 * Store V4 — types (KIMI-STORE-CORRECTED §2.3 + F4). Shaped to the REAL `/api/storefront` payload
 * (`{ pricesVisible, items, data:{ packages, activeSpecials } }`) and the StorefrontItem model
 * (price is DECIMAL-as-string). `priceCents` is derived by integer string math (F4a — never
 * parseFloat×100); `perSessionLabel` uses the server's `pricePerSession` verbatim when present (F4b).
 */

/** Raw storefront item as the server sends it (price/pricePerSession arrive as DECIMAL strings). */
export interface StorefrontItemRaw {
  id: number | string;
  packageType?: string | null;
  name: string;
  description?: string | null;
  price?: string | number | null;
  displayPrice?: string | number | null;
  totalCost?: string | number | null;
  pricePerSession?: string | number | null;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
}

/** Normalized package the V4 components render (all display strings formatted client-side from raw). */
export interface StorePackage {
  id: string; // raw id as string, for the cart binding
  packageType: string;
  name: string;
  description: string;
  priceCents: number; // integer, derived from the DECIMAL string (F4a)
  priceLabel: string; // e.g. "$8,400" — omitted/masked when !pricesVisible
  perSessionLabel: string | null; // from server pricePerSession, else derived only when absent
  sessions: number | null;
  months: number | null;
  sessionsPerWeek: number | null;
  isFlagship: boolean; // deterministic: the single highest priceCents
}

/** An active special/deal from `data.activeSpecials` — surfaced, never silently dropped (F4d). */
export interface StoreSpecial {
  id: string;
  name: string;
  description: string;
  priceLabel: string | null;
}

export interface StoreData {
  pricesVisible: boolean; // consumed from the server payload — NOT a client-recomputed predicate (F4c)
  packages: StorePackage[];
  activeSpecials: StoreSpecial[];
  flagshipId: string | null; // the pedestal package (highest price); null when prices hidden/empty
}

export type StoreLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: StoreData };
