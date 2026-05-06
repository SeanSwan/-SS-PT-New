const ROUTE_KEYS = new Set(['queueRoute', 'targetRoute', 'reviewRoute']);

export function isCommandRouteKey(key: string): boolean {
  return ROUTE_KEYS.has(key);
}
