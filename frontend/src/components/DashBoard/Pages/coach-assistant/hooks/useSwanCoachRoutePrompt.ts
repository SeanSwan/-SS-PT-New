import { useEffect, useRef } from 'react';

interface UseSwanCoachRoutePromptArgs {
  searchParams: URLSearchParams;
  routeState?: unknown;
  injectInputText: (text: string) => void;
}

function getRouteStatePrompt(routeState: unknown): string {
  if (!routeState || typeof routeState !== 'object') return '';

  const prompt = (routeState as { teachPrompt?: unknown }).teachPrompt;
  return typeof prompt === 'string' ? prompt.trim() : '';
}

export function useSwanCoachRoutePrompt({
  searchParams,
  routeState,
  injectInputText,
}: UseSwanCoachRoutePromptArgs) {
  const lastPromptRef = useRef('');

  useEffect(() => {
    const prompt = getRouteStatePrompt(routeState) || searchParams.get('teachPrompt')?.trim();
    if (!prompt || prompt === lastPromptRef.current) return;

    lastPromptRef.current = prompt;
    injectInputText(prompt);
  }, [injectInputText, routeState, searchParams]);
}

export default useSwanCoachRoutePrompt;
