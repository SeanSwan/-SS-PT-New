/** Canonical contracts for the Opus 5 x Kimi K3 consensus brain. */
import { getModelIdOrThrow } from '../../lib/model-registry.mjs';
export const MAX_ROUNDS = 7;
export const OPUS_MODEL = getModelIdOrThrow('openrouter-opus-5');
export const KIMI_MODEL = getModelIdOrThrow('openrouter-kimi-k3');

export const MODEL_CONFIG = {
  opus: { model: OPUS_MODEL, priceIn: 5, priceOut: 25 },
  kimi: { model: KIMI_MODEL, priceIn: 3, priceOut: 15 },
};

export const REQUIRED_PACKET_SECTIONS = [
  'Executive decision and success criteria',
  'Evidence, assumptions, and source manifest',
  'Scope, non-goals, and user journeys',
  'Enhancement and feature decisions',
  'UX/UI specification and responsive states',
  'Architecture, data, API, and security contracts',
  'Exact file and component change map',
  'State, error, empty, loading, and permission matrix',
  'Accessibility, performance, analytics, and observability',
  'Implementation slices and dependency order',
  'Testing and verification matrix',
  'Rollback, migration, and release plan',
  'Mermaid diagrams and wireframes',
  'Builder verbatim directive',
  'Decision ledger and zero-ambiguity checklist',
];

export const SWAN_SOURCES = {
  base: [
    'AGENTS.md',
    'docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md',
    'docs/ai-workflow/references/BEST-IN-CLASS-TRAINING-APP-STRATEGY.md',
  ],
  design: [
    'docs/ai-workflow/design-brain/design.md',
    'docs/ai-workflow/design-brain/index.md',
    'docs/ai-workflow/design-brain/components.md',
    'docs/ai-workflow/design-brain/qa-gates.md',
    'docs/ai-workflow/design-brain/motion.md',
    'docs/ai-workflow/design-brain/anti-patterns.md',
    'docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md',
  ],
};

export const DEFAULT_MAX_CONTEXT_CHARS = 120_000;
export const DEFAULT_MAX_TOKENS_PER_TURN = 24_000;
export const DEFAULT_REASONING_TOKENS_PER_TURN = 4_000;
export const MAX_CONSENSUS_CONTRACT_CHARS = 40_000;
export const DEFAULT_RUN_CAP_USD = 3;

export const CONSENSUS_START = '<<<CONSENSUS_JSON>>>';
export const CONSENSUS_END = '<<<END_CONSENSUS_JSON>>>';

