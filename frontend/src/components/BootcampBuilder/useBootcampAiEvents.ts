/**
 * HOOK: useBootcampAiEvents (CC-3b)
 * PURPOSE: The Bootcamp Builder's executor for Swan Coach frontend_dispatch tool calls —
 * listens for the additive AI_BOOTCAMP_* CustomEvents (dictation/chat → execution bridge),
 * RE-VALIDATES every payload against the builder's real option sets, applies via the page's
 * own setters, and acknowledges handled/unhandled so the dock renders truthful receipts
 * (unhandled → the honest inline "can't do that yet" message, never a silent no-op).
 * Mirrors useWorkoutPlannerAiEvents; no new transport (blueprint 06-bans §1).
 */
import { useEffect, useRef } from 'react';
import {
  AI_BOOTCAMP_SET_FORMAT,
  AI_BOOTCAMP_SET_STRUCTURE,
  AI_BOOTCAMP_SET_DURATION,
  AI_BOOTCAMP_PLACE_EXERCISE,
  AI_BOOTCAMP_LOAD_TEMPLATE,
  type AIWorkoutEventAck,
} from '../../utils/aiWorkoutEvents';
import {
  BOOTCAMP_STATION_COUNT_OPTIONS,
  BOOTCAMP_EXERCISES_PER_STATION_OPTIONS,
} from './BootcampBuilderConstants';

const MIN_DURATION_MIN = 10;
const MAX_DURATION_MIN = 120;
const OPT_PHASES = [1, 2, 3, 4, 5] as const;

export interface BootcampAiEventHandlers {
  setStationCount: (n: number) => void;
  setExercisesPerStation: (n: number) => void;
  /** Builder keeps duration as a string field — the hook converts validated minutes. */
  setTargetDuration: (minutes: string) => void;
  setClassStyle?: (style: string) => void;
  setOptPhase: (phase: number) => void;
  proposeExercise?: (proposal: { exerciseName: string; stationIndex?: number }) => void;
  /**
   * Current builder values — when provided, every applied receipt carries an Undo action
   * restoring the REAL previous state (Kimi law: execute live, aggregate undo; never a
   * fabricated previous). Omitted → receipts apply without Undo.
   */
  getCurrent?: () => { stationCount: number; exercisesPerStation: number; targetDuration: string; optPhase: number };
  /** Receipt sink — every applied change lands as a dock receipt line (with optional Undo action). */
  pushReceipt?: (r: { ok: boolean; text: string; action?: { label: string; eventName: string; payload?: Record<string, unknown> } }) => void;
}

type AckDetail = Record<string, unknown> & AIWorkoutEventAck;

export function useBootcampAiEvents(handlers: BootcampAiEventHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const ack = (e: Event, handled: boolean) => {
      ((e as CustomEvent<AckDetail>).detail)?.acknowledgeAIWorkoutEvent?.(handled);
    };

    const onSetStructure = (e: Event) => {
      const d = (e as CustomEvent<AckDetail>).detail || {};
      const h = handlersRef.current;
      const stations = d.stations == null ? null : Number(d.stations);
      const perStation = d.exercisesPerStation == null ? null : Number(d.exercisesPerStation);
      const stationsValid = stations == null || (BOOTCAMP_STATION_COUNT_OPTIONS as readonly number[]).includes(stations);
      const perValid = perStation == null || (BOOTCAMP_EXERCISES_PER_STATION_OPTIONS as readonly number[]).includes(perStation);
      if (!stationsValid || !perValid || (stations == null && perStation == null)) return ack(e, false);
      const prev = h.getCurrent?.();
      if (stations != null) h.setStationCount(stations);
      if (perStation != null) h.setExercisesPerStation(perStation);
      h.pushReceipt?.({
        ok: true,
        text: `Structure set${stations != null ? ` — ${stations} stations` : ''}${perStation != null ? ` × ${perStation} exercises` : ''}`,
        ...(prev ? { action: { label: 'Undo', eventName: AI_BOOTCAMP_SET_STRUCTURE, payload: { stations: prev.stationCount, exercisesPerStation: prev.exercisesPerStation } } } : {}),
      });
      return ack(e, true);
    };

    const onSetDuration = (e: Event) => {
      const d = (e as CustomEvent<AckDetail>).detail || {};
      const h = handlersRef.current;
      const minutes = Number(d.minutes);
      if (!Number.isFinite(minutes) || minutes < MIN_DURATION_MIN || minutes > MAX_DURATION_MIN) return ack(e, false);
      const prev = h.getCurrent?.();
      h.setTargetDuration(String(Math.round(minutes)));
      h.pushReceipt?.({
        ok: true,
        text: `Class length set — ${Math.round(minutes)} minutes`,
        ...(prev ? { action: { label: 'Undo', eventName: AI_BOOTCAMP_SET_DURATION, payload: { minutes: Number(prev.targetDuration) } } } : {}),
      });
      return ack(e, true);
    };

    const onSetFormat = (e: Event) => {
      const d = (e as CustomEvent<AckDetail>).detail || {};
      const h = handlersRef.current;
      const prevBefore = h.getCurrent?.(); // capture BEFORE any setter runs
      let applied = false;
      if (d.optPhase != null) {
        const phase = Number(d.optPhase);
        if (!(OPT_PHASES as readonly number[]).includes(phase)) return ack(e, false);
        h.setOptPhase(phase);
        applied = true;
      }
      if (typeof d.classStyle === 'string' && h.setClassStyle) {
        h.setClassStyle(d.classStyle);
        applied = true;
      }
      if (!applied) return ack(e, false);
      h.pushReceipt?.({
        ok: true,
        text: 'Format updated',
        ...(prevBefore && d.optPhase != null ? { action: { label: 'Undo', eventName: AI_BOOTCAMP_SET_FORMAT, payload: { optPhase: prevBefore.optPhase } } } : {}),
      });
      return ack(e, true);
    };

    /** Placement is proposal-only; the dock resolves an exact Rolodex match before a trainer applies it. */
    const onPlaceExercise = (e: Event) => {
      const d = (e as CustomEvent<AckDetail>).detail || {};
      const exerciseName = typeof d.exerciseName === 'string' ? d.exerciseName.trim() : '';
      const stationIndex = d.stationIndex == null ? undefined : Number(d.stationIndex);
      if (!exerciseName || exerciseName.length > 120 || (stationIndex != null && (!Number.isInteger(stationIndex) || stationIndex < 0 || stationIndex > 5))) return ack(e, false);
      const h = handlersRef.current;
      if (!h.proposeExercise) return ack(e, false);
      h.proposeExercise({ exerciseName, ...(stationIndex == null ? {} : { stationIndex }) });
      h.pushReceipt?.({ ok: true, text: `Exercise proposal awaits review — ${exerciseName}` });
      return ack(e, true);
    };

    const onLoadTemplate = (e: Event) => ack(e, false);

    window.addEventListener(AI_BOOTCAMP_SET_STRUCTURE, onSetStructure);
    window.addEventListener(AI_BOOTCAMP_SET_DURATION, onSetDuration);
    window.addEventListener(AI_BOOTCAMP_SET_FORMAT, onSetFormat);
    window.addEventListener(AI_BOOTCAMP_PLACE_EXERCISE, onPlaceExercise);
    window.addEventListener(AI_BOOTCAMP_LOAD_TEMPLATE, onLoadTemplate);
    return () => {
      window.removeEventListener(AI_BOOTCAMP_SET_STRUCTURE, onSetStructure);
      window.removeEventListener(AI_BOOTCAMP_SET_DURATION, onSetDuration);
      window.removeEventListener(AI_BOOTCAMP_SET_FORMAT, onSetFormat);
      window.removeEventListener(AI_BOOTCAMP_PLACE_EXERCISE, onPlaceExercise);
      window.removeEventListener(AI_BOOTCAMP_LOAD_TEMPLATE, onLoadTemplate);
    };
  }, []);
}
