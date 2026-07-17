/**
 * Coach composer/notebook storage isolation regressions.
 *
 * The two modes share one textarea but must never share storage buckets or
 * overwrite one another during account, client, or thread transitions.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { coachDraftKey, useCoachComposerDraft } from './useCoachComposerDraft';
import {
  buildWorkoutDraftFromNotesPrompt,
  coachNotebookDraftKey,
  useCoachClientNotebook,
} from './useCoachClientNotebook';

vi.mock('../../../../../services/api.service', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

type ControllerProps = {
  actorId: number;
  clientId: number;
  threadId: number | null;
};

function useControllerLike({ actorId, clientId, threadId }: ControllerProps) {
  const [commandText, setCommandText] = useState('');
  const [, setSelectedStatus] = useState('');
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const notebook = useCoachClientNotebook({
    actorId,
    clientId,
    clientLabel: 'Client',
    commandText,
    commandTextRef,
    setCommandText,
    setSelectedStatus,
  });

  useCoachComposerDraft(threadId, commandText, setCommandText, {
    actorId,
    clientId,
    enabled: !notebook.dockControls.active,
  });

  return {
    commandText,
    notebook: notebook.dockControls,
    setCommandText,
  };
}

describe('Coach draft mode isolation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not expose a prior staff account notebook draft after an account switch', () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useControllerLike(props),
      { initialProps: { actorId: 7, clientId: 84, threadId: null } },
    );

    act(() => result.current.notebook.onToggle());
    act(() => result.current.setCommandText('private trainer-seven note'));

    expect(window.sessionStorage.getItem(coachNotebookDraftKey(7, 84)))
      .toBe('private trainer-seven note');

    act(() => rerender({ actorId: 8, clientId: 84, threadId: null }));

    expect(result.current.notebook.active).toBe(false);
    expect(result.current.commandText).toBe('');
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(8, 84))).toBeNull();

    act(() => result.current.notebook.onToggle());
    expect(result.current.commandText).toBe('');
  });

  it('keeps notebook text stable across thread changes and restores chat afterward', () => {
    window.sessionStorage.setItem(
      coachDraftKey(102, { actorId: 7, clientId: 84 }),
      'thread 102 chat draft',
    );

    const { result, rerender } = renderHook(
      (props: ControllerProps) => useControllerLike(props),
      { initialProps: { actorId: 7, clientId: 84, threadId: 101 } },
    );

    act(() => result.current.notebook.onToggle());
    act(() => result.current.setCommandText('client notebook observation'));

    expect(window.sessionStorage.getItem(coachNotebookDraftKey(7, 84)))
      .toBe('client notebook observation');

    act(() => rerender({ actorId: 7, clientId: 84, threadId: 102 }));

    expect(result.current.notebook.active).toBe(true);
    expect(result.current.commandText).toBe('client notebook observation');
    expect(window.sessionStorage.getItem(coachNotebookDraftKey(7, 84)))
      .toBe('client notebook observation');

    act(() => result.current.notebook.onToggle());

    expect(result.current.notebook.active).toBe(false);
    expect(result.current.commandText).toBe('thread 102 chat draft');
  });

  it('stages workout-from-notes into chat without overwriting either stored draft', () => {
    const chatKey = coachDraftKey(101, { actorId: 7, clientId: 84 });
    const notebookKey = coachNotebookDraftKey(7, 84);
    window.sessionStorage.setItem(chatKey, 'existing chat draft');

    const { result } = renderHook(
      (props: ControllerProps) => useControllerLike(props),
      { initialProps: { actorId: 7, clientId: 84, threadId: 101 } },
    );

    act(() => result.current.notebook.onToggle());
    act(() => result.current.setCommandText('saved notebook observation'));
    expect(window.sessionStorage.getItem(notebookKey)).toBe('saved notebook observation');

    act(() => result.current.notebook.onDraftWorkouts());
    const stagedPrompt = buildWorkoutDraftFromNotesPrompt();

    expect(result.current.notebook.active).toBe(false);
    expect(result.current.commandText).toBe(stagedPrompt);
    expect(window.sessionStorage.getItem(notebookKey)).toBe('saved notebook observation');

    act(() => vi.advanceTimersByTime(500));
    expect(window.sessionStorage.getItem(chatKey)).toBe(stagedPrompt);
  });
});
