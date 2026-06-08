/**
 * EnhancedWorkoutLogger.identity.ts
 * Purpose: resolve the selected logger client from URL and persisted context.
 * Rule: explicit URL clientId wins; malformed URL clientId is never rescued by
 * stale active-client state, because that can log the wrong client.
 */

import { parseLoggerClientId } from './EnhancedWorkoutLogger.logic';

interface ResolveLoggerClientIdInput {
  activeClientId: number | string | null | undefined;
  urlClientId: string | null;
}

export const resolveLoggerClientId = ({
  activeClientId,
  urlClientId,
}: ResolveLoggerClientIdInput): number | null => {
  const routeClientId = parseLoggerClientId(urlClientId);
  if (routeClientId) return routeClientId;
  if (urlClientId !== null) return null;

  return parseLoggerClientId(activeClientId);
};
