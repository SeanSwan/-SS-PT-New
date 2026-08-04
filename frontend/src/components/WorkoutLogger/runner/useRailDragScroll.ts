/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ useRailDragScroll — hold-and-drag + wheel for a horizontal  │
 * │ rail (Sean, 2026-07-31: desktop had no way to scroll the    │
 * │ exercise rail — scrollbar hidden, nothing to grab).         │
 * │ Mouse-only: touch already scrolls natively and momentum     │
 * │ must not be hijacked. M3-safe: every move is an instant     │
 * │ scrollLeft assignment. A 5px threshold keeps chip taps      │
 * │ working, and a press that never crosses it still clicks.    │
 * │ Wheel converts vertical spin to rail travel ONLY while the  │
 * │ rail can consume it — at the ends the page scrolls (no      │
 * │ desktop scroll-hijack). Attached non-passive via effect     │
 * │ because React root wheel listeners are passive.             │
 * └─────────────────────────────────────────────────────────────┘
 */
import { useEffect, useRef } from 'react';
import type React from 'react';

const DRAG_THRESHOLD_PX = 5;

interface DragState {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  dragging: boolean;
}

export interface RailDragScroll {
  railRef: React.RefObject<HTMLDivElement>;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  /** Capture-phase guard: a completed drag must not fire the chip under it. */
  onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * @param railMounted — the rail renders conditionally (a session can ARRIVE
 * after mount via plan load / draft restore); the wheel effect must re-run
 * when the rail appears or the listener never attaches.
 */
export function useRailDragScroll(railMounted: boolean): RailDragScroll {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>({ pointerId: -1, startX: 0, startScrollLeft: 0, dragging: false });
  const didDragRef = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: railRef.current?.scrollLeft ?? 0,
      dragging: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId || event.pointerType !== 'mouse') return;
    const delta = event.clientX - drag.startX;
    if (!drag.dragging && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    const rail = railRef.current;
    if (!rail) return;
    if (!drag.dragging) {
      drag.dragging = true;
      didDragRef.current = true;
      rail.setPointerCapture?.(event.pointerId); // jsdom has no capture — optional
    }
    rail.scrollLeft = drag.startScrollLeft - delta; // instant (M3)
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    if (drag.dragging) railRef.current?.releasePointerCapture?.(event.pointerId);
    drag.pointerId = -1;
    drag.dragging = false;
    // didDragRef survives until the click this pointerup spawns, then clears.
  };

  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!didDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!railMounted || !rail) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || event.deltaX !== 0) return; // trackpads already travel X
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, rail.scrollLeft + event.deltaY));
      if (next === rail.scrollLeft) return; // rail exhausted — let the page have it
      event.preventDefault();
      rail.scrollLeft = next; // instant (M3)
    };
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, [railMounted]);

  return { railRef, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}
