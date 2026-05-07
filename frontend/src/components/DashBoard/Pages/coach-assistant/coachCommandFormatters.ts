/**
 * coachCommandFormatters.ts
 * =========================
 * Shared display formatters for Swan Coach command cards.
 */

export function renderCommandParamValue(key: string, value: unknown): string {
  if (key === 'exercises' && Array.isArray(value)) {
    if (value.length === 0) return '(none)';
    return value.map((ex: Record<string, unknown>) => {
      const name = String(ex.name ?? ex.exerciseName ?? 'Exercise');
      const parts: string[] = [name];
      if (ex.weight != null) parts.push(`${ex.weight}lb`);
      if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets}x${ex.reps}`);
      else if (ex.sets != null) parts.push(`${ex.sets} sets`);
      else if (ex.reps != null) parts.push(`${ex.reps} reps`);
      return parts.join(' ');
    }).join(' - ');
  }
  if (typeof value === 'object' && value !== null) {
    const str = JSON.stringify(value);
    return str.length > 80 ? `${str.slice(0, 77)}...` : str;
  }
  return String(value);
}
