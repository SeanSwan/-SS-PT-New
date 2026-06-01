import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { exportBootcampPDF } from '../../services/pdfExportService';

export const exportBootcampTemplatePDF = (bootcamp: GeneratedBootcamp) => exportBootcampPDF({
  name: bootcamp.name,
  classFormat: bootcamp.classFormat,
  dayType: bootcamp.dayType,
  stationCount: bootcamp.stationCount,
  targetDuration: bootcamp.targetDuration,
  totalWorkoutMin: bootcamp.totalWorkoutMin,
  totalClassMin: bootcamp.totalClassMin,
  expectedParticipants: bootcamp.expectedParticipants,
  stations: bootcamp.stations as any,
  exercises: bootcamp.exercises,
  overflowPlan: bootcamp.overflowPlan,
});
