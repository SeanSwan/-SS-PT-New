/**
 * Contract: the SessionContext fetch cycle stays broken.
 *
 * Incident (verified live 2026-09-02): fetchSessionAnalytics listed `sessions`
 * in its useCallback deps while the login-load effect depended on
 * fetchSessionAnalytics and called fetchSessions → setSessions → new callback
 * identity → effect re-ran → forever. SessionProvider wraps the whole app
 * (App.tsx), so EVERY authenticated visitor fired /api/sessions +
 * /api/sessions/analytics ~2x/sec for the life of the tab (350+ pairs observed
 * in one page view). The fix reads local sessions through sessionsRef in the
 * analytics fallback and drops `sessions` from the dep array.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/context/SessionContext.tsx'), 'utf8');

describe('SessionContext polling-loop contract', () => {
  it('fetchSessionAnalytics does not depend on `sessions` (the loop driver)', () => {
    expect(source).not.toMatch(/\}, \[isAuthenticated, user, sessions\]\);/);
  });

  it('the local-analytics fallback reads through sessionsRef, not the reactive state', () => {
    expect(source).toContain('sessionsRef.current');
    expect(source).toMatch(/const sessionsRef = useRef<WorkoutSession\[\]>/);
  });

  it('the ONLY dep array containing `sessions` is the benign ref-sync effect', () => {
    const depArrays = source.match(/\}, \[[^\]]*\]\);/g) ?? [];
    const offenders = depArrays.filter((d) => /[\[,]\s*sessions\s*[,\]]/.test(d));
    // `useEffect(() => { sessionsRef.current = sessions; }, [sessions])` MUST
    // depend on sessions (it fetches nothing); anything else is the loop reborn.
    expect(offenders).toEqual(['}, [sessions]);']);
    expect(source).toContain('useEffect(() => { sessionsRef.current = sessions; }, [sessions]);');
  });
});
