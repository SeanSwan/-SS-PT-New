/** Pure normalization for the server-owned Swan Coach command registry. */
export type CoachCommandCatalogEntry = {
  type: string;
  description: string;
  group: string;
  examples?: string[];
  executionLane?: string;
  canExecute?: boolean;
  manualOnly?: boolean;
  manualOnlyReason?: string | null;
  navigates?: boolean;
};

type CatalogRow = { type?: unknown; description?: unknown; category?: unknown; examples?: unknown };

export function normalizeCoachCatalogCommands(payload: unknown): CoachCommandCatalogEntry[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as CatalogRow;
    const type = typeof row.type === 'string' ? row.type.trim() : '';
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const example = Array.isArray(row.examples)
      ? row.examples.find((item): item is string => typeof item === 'string' && item.trim().length > 0)?.trim() || ''
      : '';
    const group = typeof row.category === 'string' && row.category.trim() ? row.category.trim() : 'General';
    if (!type || (!description && !example)) return [];
    const examples = Array.isArray(row.examples)
      ? row.examples.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
      : undefined;
    return [{
      type,
      description: description || example,
      group,
      ...(examples?.length ? { examples } : {}),
      ...(typeof (row as Record<string, unknown>).executionLane === 'string' ? { executionLane: (row as Record<string, unknown>).executionLane as string } : {}),
      ...(typeof (row as Record<string, unknown>).canExecute === 'boolean' ? { canExecute: (row as Record<string, unknown>).canExecute as boolean } : {}),
      ...(typeof (row as Record<string, unknown>).manualOnly === 'boolean' ? { manualOnly: (row as Record<string, unknown>).manualOnly as boolean } : {}),
      ...(typeof (row as Record<string, unknown>).manualOnlyReason === 'string' || (row as Record<string, unknown>).manualOnlyReason === null
        ? { manualOnlyReason: (row as Record<string, unknown>).manualOnlyReason as string | null }
        : {}),
    }];
  });
}
