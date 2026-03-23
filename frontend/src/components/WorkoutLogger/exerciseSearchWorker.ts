/**
 * exerciseSearchWorker.ts
 * ─────────────────────────────────────────────────────────────
 * Web Worker for client-side fuzzy exercise search.
 *
 * WHAT THIS FILE DOES:
 *   Receives the full exercise list once (CACHE message), then
 *   performs instant fuzzy filtering on SEARCH messages without
 *   blocking the main thread.
 *
 * HOW IT FITS IN THE APP:
 *   useExerciseSearch hook → posts messages → this worker → postMessage results
 *   Falls back to main-thread search if Worker fails (CSP restrictions).
 *
 * MESSAGE PROTOCOL:
 *   Main → Worker: { type: 'CACHE', exercises: ExerciseSlim[] }
 *   Main → Worker: { type: 'SEARCH', query: string, category: string | null }
 *   Worker → Main: { type: 'RESULTS', exercises: ExerciseSlim[], query: string }
 */

export interface ExerciseSlim {
  id: string;
  name: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  primaryMuscles: string[];
  difficulty: number;
}

interface CacheMessage { type: 'CACHE'; exercises: ExerciseSlim[] }
interface SearchMessage { type: 'SEARCH'; query: string; category: string | null }
type WorkerMessage = CacheMessage | SearchMessage;

/** Inline worker code as a string — bundled into a Blob URL */
const WORKER_CODE = `
  let exercises = [];

  /** Simple fuzzy match: every character in query appears in order in target */
  function fuzzyScore(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();

    // Exact substring match gets highest score
    if (t.includes(q)) return 1000 - t.indexOf(q);

    // Word-start match (e.g. "bp" matches "Bench Press")
    const words = t.split(/[\\s\\-_/]+/);
    const initials = words.map(w => w[0] || '').join('');
    if (initials.includes(q)) return 500;

    // Fuzzy character walk
    let qi = 0;
    let score = 0;
    let prevMatch = -1;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += (prevMatch === ti - 1) ? 10 : 1; // consecutive chars worth more
        prevMatch = ti;
        qi++;
      }
    }
    return qi === q.length ? score : 0;
  }

  function search(query, category) {
    let pool = exercises;

    // Filter by category first (fast)
    // Normalize: chips send "Chest", DB stores "chest"; chips send "Full Body", DB stores "full_body"
    if (category && category !== 'All') {
      const norm = category.toLowerCase().replace(/\\s+/g, '_');
      pool = pool.filter(ex => {
        const dbCat = (ex.bodyPartCategory || '').toLowerCase().replace(/\\s+/g, '_');
        return dbCat === norm;
      });
    }

    // No query — return all in category (alphabetical)
    if (!query || query.trim().length < 1) {
      self.postMessage({ type: 'RESULTS', exercises: pool.slice(0, 50), query: query || '' });
      return;
    }

    const q = query.trim();

    // Score and filter
    const scored = [];
    for (let i = 0; i < pool.length; i++) {
      const ex = pool[i];
      // Search name, exerciseType, and primaryMuscles
      let best = fuzzyScore(q, ex.name);
      if (best === 0) best = fuzzyScore(q, ex.exerciseType) * 0.5;
      if (best === 0 && ex.primaryMuscles) {
        for (const m of ex.primaryMuscles) {
          const ms = fuzzyScore(q, m);
          if (ms > best) best = ms * 0.7;
        }
      }
      if (best > 0) scored.push({ ex, score: best });
    }

    scored.sort((a, b) => b.score - a.score);
    self.postMessage({ type: 'RESULTS', exercises: scored.slice(0, 30).map(s => s.ex), query: q });
  }

  self.onmessage = function(e) {
    const msg = e.data;
    if (msg.type === 'CACHE') {
      exercises = msg.exercises || [];
      return;
    }
    if (msg.type === 'SEARCH') {
      search(msg.query, msg.category);
    }
  };
`;

/**
 * Create and return a Web Worker for exercise search.
 * Returns null if Workers are unavailable (SSR, CSP, etc.)
 */
export function createExerciseSearchWorker(): Worker | null {
  try {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    // Clean up blob URL after worker starts
    worker.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
    return worker;
  } catch {
    return null;
  }
}

/**
 * Main-thread fallback: same fuzzy search logic for when Worker fails.
 */
export function searchExercisesSync(
  exercises: ExerciseSlim[],
  query: string,
  category: string | null,
): ExerciseSlim[] {
  let pool = exercises;
  if (category && category !== 'All') {
    const norm = category.toLowerCase().replace(/\s+/g, '_');
    pool = pool.filter(ex => {
      const dbCat = (ex.bodyPartCategory || '').toLowerCase().replace(/\s+/g, '_');
      return dbCat === norm;
    });
  }
  if (!query || query.trim().length < 1) {
    return pool.slice(0, 50);
  }

  const q = query.trim().toLowerCase();

  const scored: { ex: ExerciseSlim; score: number }[] = [];
  for (const ex of pool) {
    let best = 0;
    const name = ex.name.toLowerCase();

    // Exact substring
    if (name.includes(q)) {
      best = 1000 - name.indexOf(q);
    } else {
      // Word-start initials
      const initials = name.split(/[\s\-_/]+/).map(w => w[0] || '').join('');
      if (initials.includes(q)) {
        best = 500;
      } else {
        // Fuzzy walk
        let qi = 0;
        let score = 0;
        let prevMatch = -1;
        for (let ti = 0; ti < name.length && qi < q.length; ti++) {
          if (name[ti] === q[qi]) {
            score += (prevMatch === ti - 1) ? 10 : 1;
            prevMatch = ti;
            qi++;
          }
        }
        if (qi === q.length) best = score;
      }
    }

    // Also check exerciseType and muscles
    if (best === 0) {
      const et = ex.exerciseType.toLowerCase();
      if (et.includes(q)) best = 300;
    }
    if (best === 0 && ex.primaryMuscles) {
      for (const m of ex.primaryMuscles) {
        if (m.toLowerCase().includes(q)) { best = 200; break; }
      }
    }

    if (best > 0) scored.push({ ex, score: best });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 30).map(s => s.ex);
}
