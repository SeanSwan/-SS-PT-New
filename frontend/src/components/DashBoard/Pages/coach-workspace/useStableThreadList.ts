/**
 * Blueprint: useStableThreadList
 * Parent: ThreadSidebar. Round-2 review #5: every thread pick, New chat and
 * client switch re-admits the staff selection, and useAIChat hides the list
 * until the new scope commits and re-lists — two round trips of "No
 * conversations yet" (false), with the row the operator just activated
 * unmounted so keyboard focus fell to <body>.
 *
 * The coach's thread list is NOT client-scoped (GET /api/ai-chat/conversations
 * takes no target), so the SAME actor's last list may stay on screen, marked
 * refreshing, while the scope settles. A different actor never sees it.
 */
import { useRef } from 'react';

export function useStableThreadList<T>(threads: T[], actorKey: string | null, searching: boolean): { threads: T[]; refreshing: boolean } {
  const last = useRef<{ key: string | null; threads: T[] }>({ key: null, threads: [] });
  if (threads.length && !searching) last.current = { key: actorKey, threads };
  if (last.current.key !== actorKey) last.current = { key: actorKey, threads: [] };
  const refreshing = !threads.length && !searching && last.current.threads.length > 0;
  return { threads: refreshing ? last.current.threads : threads, refreshing };
}
