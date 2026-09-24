/**
 * FILE: useCompactWidth.ts
 * PURPOSE: True while an element is narrower than `below` px — measured on the
 * element itself, not the viewport. The workspace header lives inside a column
 * whose width depends on which panels the lens docks, so a viewport breakpoint
 * cannot know when its labels stop fitting (1100px with the sidebar docked left
 * the header 760px wide and clipped "More coach tools"). Without ResizeObserver
 * it stays false and the viewport breakpoints remain the fallback.
 */
import { type RefObject, useLayoutEffect, useState } from 'react';

export function useCompactWidth(ref: RefObject<HTMLElement>, below: number): boolean {
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setCompact(element.getBoundingClientRect().width < below);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, below]);
  return compact;
}
