import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerRoutePlanLoad } from './useWorkoutPlannerRoutePlanLoad';

const matchingPlan = {
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  name: 'Revision-Aware Strength Arc',
};

const baseProps = () => ({
  loadPlanIntoBuilder: vi.fn(async () => undefined),
  requestedPlanId: matchingPlan.id,
  routeClientId: 42,
  routeMode: 'edit',
  savedPlans: [] as Array<{ id: string; name: string }>,
  savedPlansClientId: null as number | null,
  selectedClientId: 42,
  setStatusMsg: vi.fn(),
});

describe('useWorkoutPlannerRoutePlanLoad', () => {
  it('waits for the selected client list, then loads the exact route plan once', async () => {
    const props = baseProps();
    const { rerender } = renderHook(
      (input: ReturnType<typeof baseProps>) => useWorkoutPlannerRoutePlanLoad(input),
      { initialProps: props },
    );

    expect(props.loadPlanIntoBuilder).not.toHaveBeenCalled();

    rerender({ ...props, savedPlans: [matchingPlan], savedPlansClientId: 42 });
    await waitFor(() => {
      expect(props.loadPlanIntoBuilder).toHaveBeenCalledWith(
        matchingPlan.id,
        matchingPlan.name,
      );
    });

    rerender({ ...props, savedPlans: [{ ...matchingPlan }], savedPlansClientId: 42 });
    expect(props.loadPlanIntoBuilder).toHaveBeenCalledTimes(1);
  });

  it('ignores a previous client list until the route client list replaces it', async () => {
    const props = baseProps();
    const { rerender } = renderHook(
      (input: ReturnType<typeof baseProps>) => useWorkoutPlannerRoutePlanLoad(input),
      {
        initialProps: {
          ...props,
          savedPlans: [matchingPlan],
          savedPlansClientId: 7,
        },
      },
    );

    expect(props.loadPlanIntoBuilder).not.toHaveBeenCalled();

    rerender({ ...props, savedPlans: [matchingPlan], savedPlansClientId: 42 });
    await waitFor(() => expect(props.loadPlanIntoBuilder).toHaveBeenCalledTimes(1));
  });
  it('rejects malformed, non-edit, and cross-client route requests', () => {
    const malformed = baseProps();
    renderHook(() => useWorkoutPlannerRoutePlanLoad({
      ...malformed,
      requestedPlanId: '../plan',
      savedPlans: [matchingPlan],
      savedPlansClientId: 42,
    }));
    expect(malformed.loadPlanIntoBuilder).not.toHaveBeenCalled();

    const wrongMode = baseProps();
    renderHook(() => useWorkoutPlannerRoutePlanLoad({
      ...wrongMode,
      routeMode: 'view',
      savedPlans: [matchingPlan],
      savedPlansClientId: 42,
    }));
    expect(wrongMode.loadPlanIntoBuilder).not.toHaveBeenCalled();

    const wrongClient = baseProps();
    renderHook(() => useWorkoutPlannerRoutePlanLoad({
      ...wrongClient,
      selectedClientId: 7,
      savedPlans: [matchingPlan],
      savedPlansClientId: 42,
    }));
    expect(wrongClient.loadPlanIntoBuilder).not.toHaveBeenCalled();
  });

  it('surfaces a stale route after another plan proves list hydration', async () => {
    const props = baseProps();
    renderHook(() => useWorkoutPlannerRoutePlanLoad({
      ...props,
      savedPlans: [{ id: 'another-plan', name: 'Another Plan' }],
      savedPlansClientId: 42,
    }));

    await waitFor(() => {
      expect(props.setStatusMsg).toHaveBeenCalledWith({
        type: 'error',
        text: 'The requested saved plan is no longer available for this client.',
      });
    });
    expect(props.loadPlanIntoBuilder).not.toHaveBeenCalled();
  });
});
