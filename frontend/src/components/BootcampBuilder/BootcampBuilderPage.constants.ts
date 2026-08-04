export type BuildMode = 'ai' | 'manual' | 'hybrid';
export type BootcampWorkflowStage = 'build' | 'preflight' | 'run';

export const BOOTCAMP_TEACH_ME_CONTENT = [
  '<strong>3 Build Modes:</strong>',
  '<ul>',
  '<li><strong>Swan Coach Generate:</strong> Choose format, day type, class style, Equipment Profile, OPT phase, and class length, then generate the full plan.</li>',
  '<li><strong>Manual:</strong> Pick a station, browse the Rolodex, and add main-board exercises one slot at a time.</li>',
  '<li><strong>Hybrid:</strong> Start with Swan Coach, then swap, add, or remove exercises without losing station placement.</li>',
  '</ul>',
  '<strong>Board Flow:</strong> Board 1 is main intensity, Board 2 is joint-friendly alternatives, and Board 3 is low-impact swaps for clients who need less pounding.',
  '<br/><strong>55-Minute Rule:</strong> The timer warns when the complete class plan exceeds 55 minutes.',
].join('');
