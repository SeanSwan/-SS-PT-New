/**
 * FILE: coachClientNames.tsx
 * PURPOSE: The display half of the Privacy Proxy contract (PRIVACY-PROXY.md,
 * "Display Mapping"): Swan Coach and every model behind it only ever see
 * "Client #<id>"; the trainer sees the client's name.
 *
 * - The server replaces typed names with "Client #<id>" before any provider call
 *   (accessibleClientIdentityPrivacy.mjs) and keeps replies ID-only.
 * - This module swaps those tokens back to names ON SCREEN ONLY, using the roster
 *   the signed-in trainer/admin may already see (GlobalClientContext, RBAC'd).
 * - It never rewrites stored text: anything that can leave the browser again
 *   (read-aloud, the workout-logger hand-off, retries) keeps the ID-only body.
 * An ID outside the roster is never guessed; it stays "Client #<id>".
 */
import React, { createContext, useContext, useMemo } from 'react';

export type ClientNameLookup = ReadonlyMap<number, string>;

const EMPTY: ClientNameLookup = new Map();
const CoachClientNamesContext = createContext<ClientNameLookup>(EMPTY);

/** "Client #84", "[Client #84]", "User #84" — digits bounded so "#840" never matches "#84". */
const TOKEN = /\[?\b(?:Client|User) #(\d{1,9})(?!\d)\]?/g;

export function clientNameLookup(clients: ReadonlyArray<{ id: number; label: string }>): ClientNameLookup {
  const map = new Map<number, string>();
  for (const client of clients) {
    const label = String(client.label || '').trim();
    // The roster falls back to "Client #<id>" when a name is missing — not a name.
    if (Number.isSafeInteger(client.id) && client.id > 0 && label && !/^Client #\d+$/.test(label)) map.set(client.id, label);
  }
  return map;
}

export function nameClientTokens(text: string, names: ClientNameLookup): string {
  if (!text || names.size === 0) return text;
  return text.replace(TOKEN, (token, id: string) => names.get(Number(id)) ?? token);
}

export function CoachClientNamesProvider({ clients, children }: {
  clients: ReadonlyArray<{ id: number; label: string }>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => clientNameLookup(clients), [clients]);
  return <CoachClientNamesContext.Provider value={value}>{children}</CoachClientNamesContext.Provider>;
}

export function useCoachClientNames(): ClientNameLookup {
  return useContext(CoachClientNamesContext);
}
