/**
 * FILE: useCoachCommandCatalog.ts
 * PURPOSE: Read the role-scoped Coach registry once for discoverability surfaces.
 *
 * The registry remains the authority for executable commands. Consumers may
 * present these rows as suggestions, but they still submit through
 * `useCoachCommand` and the server validates the selected command again.
 */
import { useEffect, useState } from 'react';
import apiService from '../services/api.service';
import { normalizeCoachCatalogCommands, type CoachCommandCatalogEntry } from './coachCommandCatalog';
export { normalizeCoachCatalogCommands } from './coachCommandCatalog';

export function useCoachCommandCatalog(enabled = true) {
  const [commands, setCommands] = useState<CoachCommandCatalogEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    apiService.get('/api/ai-command/commands')
      .then((response) => {
        if (cancelled) return;
        const list = response.data?.commands;
        if (response.data?.success && Array.isArray(list)) setCommands(normalizeCoachCatalogCommands(list));
        else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { commands, loading, failed };
}
