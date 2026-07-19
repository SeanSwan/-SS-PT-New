/**
 * nasmApiService.submitWorkoutForm — Phase 16.2 round 13 regression guard
 * ==========================================================================
 * Locks the AxiosResponse unwrap behavior that Codex smoke found broken:
 *
 *   `this.api.post()` returns `AxiosResponse<T>` — the backend payload
 *   lives under `.data`, not on the top-level response object. The
 *   round 13 fix unwraps `response.data` once, then maps the server
 *   shape `{ success, form, message }` to the frontend
 *   `ApiResponse<T>` shape `{ success, data, message }`.
 *
 * Before the fix:
 *   - Backend returned 201 with `{ success: true, form: {...} }`
 *   - Service returned `{ success: undefined, data: undefined }`
 *   - WorkoutLogger interpreted that as failure → threw
 *     "Failed to submit workout form" → pushed already-persisted
 *     workout into `ss-workout-queue-91`.
 *
 * This file is a focused unit test — it mocks `apiService` and verifies
 * the unwrap is correct on the happy path, the error path, and a
 * 4xx-with-success-false path.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the axios-backed default apiService BEFORE importing the SUT.
vi.mock('./api.service', () => {
  const post = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const del = vi.fn();
  return {
    default: { post, get, put, delete: del },
    __mocks: { post, get, put, del },
  };
});

import apiService from './api.service';
import { dailyWorkoutFormService } from './nasmApiService';

const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
const SERVICE_SOURCE = readFileSync(resolve(__dirname, './nasmApiService.ts'), 'utf8');

const basePayload = {
  clientId: 91,
  date: '2026-04-17',
  exercises: [
    {
      exerciseName: 'Push-ups',
      sets: [{ setNumber: 1, weight: 0, reps: 10 }],
    },
  ],
  sessionNotes: '',
};

describe('dailyWorkoutFormService.submitWorkoutForm — AxiosResponse unwrap (round 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('unwraps AxiosResponse.data.form into ApiResponse.data on 201 success', async () => {
    // Simulate the exact shape of axios.post on a 201 from /api/workout-forms.
    postMock.mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {},
      data: {
        success: true,
        form: {
          id: 'form-uuid-1',
          clientId: 91,
          trainerId: 5,
          billing: {
            status: 'deducted',
            shouldDeduct: true,
            sessionDeducted: true,
            creditsDeducted: 2,
            creditsRequired: 2,
            remainingSessions: 4,
          },
        },
        message: 'Workout logged successfully and session deducted',
      },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    // Happy-path contract: the frontend ApiResponse<T> shape must be
    // populated from the axios body, not from the top-level AxiosResponse.
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: 'form-uuid-1',
      clientId: 91,
      trainerId: 5,
      billing: {
        status: 'deducted',
        shouldDeduct: true,
        sessionDeducted: true,
        creditsDeducted: 2,
        creditsRequired: 2,
        remainingSessions: 4,
      },
    });
    expect(result.message).toBe('Workout logged successfully and session deducted');
  });

  it('does NOT accidentally read success / form from the AxiosResponse envelope', async () => {
    // If someone later regresses to reading `response.success` directly,
    // this stub has `success: 'envelope-level-success'` on the envelope
    // and `success: true` inside `.data`. The unwrapped result MUST be
    // `true`, not `'envelope-level-success'`.
    postMock.mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {},
      // Envelope-level decoys: if the old bug returns, the service would
      // pick these up instead of the real payload.
      success: 'envelope-level-success',
      form: { id: 'envelope-level-form', clientId: 999 },
      message: 'envelope-level-message',
      data: {
        success: true,
        form: { id: 'real-form', clientId: 91 },
        message: 'real message',
      },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'real-form', clientId: 91 });
    expect(result.message).toBe('real message');
  });

  it('propagates rejection (network failure) by rethrowing — does NOT swallow into ApiResponse', async () => {
    // Contract: callers rely on try/catch to distinguish network / 5xx
    // failures from a 2xx response with `success: false`. The service
    // must continue to re-throw the underlying error.
    const err = new Error('Network Error');
    postMock.mockRejectedValue(err);

    await expect(dailyWorkoutFormService.submitWorkoutForm(basePayload)).rejects.toBe(err);
  });

  it('passes success=false through from the server payload (4xx-with-body)', async () => {
    // Some validation endpoints return 200/4xx with `{ success: false,
    // message }`. The caller distinguishes this from a thrown error.
    // Verify the unwrap still works — success must be false and data
    // must be undefined (no form on the payload).
    postMock.mockResolvedValue({
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {},
      data: {
        success: false,
        message: 'Client has no available sessions remaining',
      },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.message).toBe('Client has no available sessions remaining');
  });

  it('threads the server top-level `handoff` sibling onto ApiResponse.data (Slice-2 Chunk C)', async () => {
    // The backend returns handoff as a sibling of `form`; the mapper must re-attach it onto the form so
    // lastSaveResponse.handoff carries the payload into the logger.
    const handoff = {
      headline: 'pr',
      proof: null,
      nba: null,
      share: { eligible: false, reason: 'not-owner' },
    };
    postMock.mockResolvedValue({
      status: 201,
      data: { success: true, form: { id: 'form-h', clientId: 91 }, message: 'ok', handoff },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'form-h', clientId: 91, handoff });
  });

  it('threads handoff:null when the server sends it (feature flag off)', async () => {
    postMock.mockResolvedValue({
      status: 201,
      data: { success: true, form: { id: 'form-null-h', clientId: 91 }, message: 'ok', handoff: null },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(result.data).toEqual({ id: 'form-null-h', clientId: 91, handoff: null });
  });

  it('normalizes Axios 409 duplicate-form responses into success=false instead of throwing', async () => {
    postMock.mockRejectedValue({
      response: {
        status: 409,
        data: {
          success: false,
          message: 'A workout form already exists for this client on this date',
          form: {
            id: 'existing-form-1',
            clientId: 91,
            trainerId: 5,
            date: '2026-04-17',
          },
        },
      },
    });

    const result = await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(result.success).toBe(false);
    expect(result.data).toEqual({
      id: 'existing-form-1',
      clientId: 91,
      trainerId: 5,
      date: '2026-04-17',
    });
    expect(result.message).toBe('A workout form already exists for this client on this date');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('sends the full payload (clientId, date, exercises) to POST /api/workout-forms', async () => {
    // Sanity lock on the request side — the URL and body shape must
    // match what the backend route expects.
    postMock.mockResolvedValue({
      status: 201,
      data: { success: true, form: { id: 'x' }, message: 'ok' },
    });

    await dailyWorkoutFormService.submitWorkoutForm(basePayload);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/api/workout-forms', basePayload);
  });

  it('forwards AbortSignal to POST /api/workout-forms so callers can cancel slow saves', async () => {
    const controller = new AbortController();
    postMock.mockResolvedValue({
      status: 201,
      data: { success: true, form: { id: 'abort-aware-form' }, message: 'ok' },
    });

    await dailyWorkoutFormService.submitWorkoutForm(basePayload, { signal: controller.signal });

    expect(postMock).toHaveBeenCalledWith('/api/workout-forms', basePayload, {
      signal: controller.signal,
    });
  });

  it('declares planned-assignment metadata in the workout-form submit contract', () => {
    expect(SERVICE_SOURCE).toContain('export interface PlannedWorkoutAssignmentMetadata');
    expect(SERVICE_SOURCE).toMatch(/plannedAssignment\?:\s*PlannedWorkoutAssignmentMetadata/);
    expect(SERVICE_SOURCE).toContain('source: \'workout_plan\'');
    expect(SERVICE_SOURCE).toContain('trainer_session');
    expect(SERVICE_SOURCE).toContain('shouldDeductSession: boolean');
  });
});
