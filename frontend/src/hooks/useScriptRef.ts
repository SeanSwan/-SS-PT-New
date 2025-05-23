import { useEffect, useRef } from 'react';

/**
 * A hook that provides a reference that persists beyond component unmounting
 * Useful for checking if a component is still mounted before updating state
 */
export default function useScriptRef() {
  const scripted = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      scripted.current = false;
    };
  }, []);

  return scripted;
}