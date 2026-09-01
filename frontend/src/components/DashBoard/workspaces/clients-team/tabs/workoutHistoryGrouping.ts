export interface CircuitWorkoutLog {
  exerciseName: string;
  circuitName?: string | null;
  circuitOrder?: number | null;
  exerciseRole?: string | null;
}

export interface CircuitExerciseGroup<T> {
  name: string;
  role: string | null;
  sets: T[];
}

export interface CircuitGroup<T> {
  name: string;
  order: number;
  exercises: CircuitExerciseGroup<T>[];
}

export function groupWorkoutLogsByCircuit<T extends CircuitWorkoutLog>(logs: T[]): CircuitGroup<T>[] {
  const circuits = new Map<string, CircuitGroup<T>>();
  logs.forEach((log, index) => {
    const name = log.circuitName?.trim() || 'Ungrouped';
    const order = Number.isInteger(log.circuitOrder) && Number(log.circuitOrder) > 0
      ? Number(log.circuitOrder)
      : Number.MAX_SAFE_INTEGER;
    let circuit = circuits.get(name);
    if (!circuit) {
      circuit = { name, order: order === Number.MAX_SAFE_INTEGER ? index + 1_000_000 : order, exercises: [] };
      circuits.set(name, circuit);
    } else {
      circuit.order = Math.min(circuit.order, order);
    }
    let exercise = circuit.exercises.find((entry) => entry.name === log.exerciseName);
    if (!exercise) {
      exercise = { name: log.exerciseName, role: log.exerciseRole?.trim() || null, sets: [] };
      circuit.exercises.push(exercise);
    }
    exercise.sets.push(log);
  });
  return Array.from(circuits.values()).sort((a, b) => a.order - b.order);
}
