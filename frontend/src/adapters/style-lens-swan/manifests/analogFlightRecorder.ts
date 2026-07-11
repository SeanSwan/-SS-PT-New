import { createSwanManifest } from '../manifestFactory';

export const ANALOG_FLIGHT_RECORDER_MANIFEST = createSwanManifest({
  id: 'analog-flight-recorder',
  name: 'Analog Flight Recorder',
  description: 'Instrument-led telemetry, tactile labels, and decisive status bands.',
  emotionalJob: 'operational trust',
  layoutSignature: 'instrument-telemetry-stack',
  navigationRenderer: 'instrument-strip-navigation',
  shellRenderer: 'instrument-shell',
  recipe: 'instrument-recipe',
  profileOffsets: [3, 5, 7],
});
