/** APG-style roving tabindex and arrow-key navigation for Studio tabs. */
import { useCallback, type KeyboardEvent } from 'react';

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

export const useRovingTablist = <T extends string>(
  ids: readonly T[],
  active: T,
  onChange: (id: T) => void,
) => {
  const onTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = index;
      if (NEXT_KEYS.has(event.key)) next = (index + 1) % ids.length;
      else if (PREVIOUS_KEYS.has(event.key)) {
        next = (index - 1 + ids.length) % ids.length;
      } else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = ids.length - 1;
      else return;

      event.preventDefault();
      const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        '[role="tab"]',
      );
      onChange(ids[next]);
      tabs?.[next]?.focus();
    },
    [ids, onChange],
  );

  return {
    tabProps: (id: T, index: number) => ({
      tabIndex: active === id ? 0 : -1,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        onTabKeyDown(event, index),
    }),
  };
};
