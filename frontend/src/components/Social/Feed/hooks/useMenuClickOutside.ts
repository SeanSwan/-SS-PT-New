/**
 * HOOK: useMenuClickOutside
 * PURPOSE: Close a popover menu on outside mousedown (extracted from PostCard
 *          to keep the orchestrator under the 300-line ceiling — rule 4).
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useMenuClickOutside(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void
): void {
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, ref, onClose]);
}
