export type LensFoundryTabId = 'morph' | 'design-brain' | 'operator-flow' | 'portfolio' | 'promotion';

export interface LensFoundryTab {
  id: LensFoundryTabId;
  label: string;
  summary: string;
}

export interface LabMetric {
  label: string;
  value: string;
  detail: string;
  tone: 'pass' | 'watch' | 'queued';
}

export interface LabNode {
  title: string;
  eyebrow: string;
  detail: string;
}

export interface OperatorStage {
  step: string;
  title: string;
  detail: string;
  gate: string;
}

export const lensFoundryLaunchUrl = (import.meta.env.VITE_LENS_FOUNDRY_URL || '').trim();
export const lensFoundryRepoUrl = 'https://github.com/SeanSwan/lens-foundry';

export const labTabs: LensFoundryTab[] = [
  { id: 'morph', label: 'Morph Lab', summary: 'Interactive lens composer with Slice 1 stress receipts.' },
  { id: 'design-brain', label: 'Design Brain', summary: 'Visual map of Swan design sources, adapters, and provenance.' },
  { id: 'operator-flow', label: 'Operator Flow', summary: 'Hermes and Fable-style command paths with trust gates.' },
  { id: 'portfolio', label: 'Portfolio', summary: 'Landing-page, dashboard, and motion directions for reuse.' },
  { id: 'promotion', label: 'Promotion Queue', summary: 'What graduates from Lens Foundry back into SS-PT.' },
];

export const morphStressMetrics: LabMetric[] = [
  {
    label: 'Chromium Primary',
    value: '1000 / 1000',
    detail: '50 permutations, p95 615.3ms, max 618.7ms, CLS 0.',
    tone: 'pass',
  },
  {
    label: 'Reduced Motion',
    value: '40 / 40',
    detail: 'Max 11ms with motion disabled and CLS 0.',
    tone: 'pass',
  },
  {
    label: 'WebKit Fallback',
    value: '1000 / 1000',
    detail: 'No View Transitions, max 90ms, p95 18ms.',
    tone: 'pass',
  },
  {
    label: 'DOM Budget',
    value: '23 nodes',
    detail: 'Stress run stayed compact and avoided layout churn.',
    tone: 'pass',
  },
];

export const designBrainNodes: LabNode[] = [
  {
    eyebrow: 'Source',
    title: 'Swan Cinematic Design System',
    detail: 'Brand law, tokens, glow discipline, typography, and dark-first dashboard rules.',
  },
  {
    eyebrow: 'Source',
    title: 'Design Brain',
    detail: 'Callable design memory, external-reference receipt, archetypes, and adapters.',
  },
  {
    eyebrow: 'Adapter',
    title: 'LensDocument',
    detail: 'Versioned document boundary that lets a design move without leaking PII or backend state.',
  },
  {
    eyebrow: 'Output',
    title: 'SwanStudios Lens #1',
    detail: 'The first production lens, constrained by the SS-PT product loop and trust layer.',
  },
];

export const operatorStages: OperatorStage[] = [
  {
    step: '01',
    title: 'Intent Capture',
    detail: 'Sean chooses a design, operator, or portfolio goal from the lab.',
    gate: 'Read-only draft',
  },
  {
    step: '02',
    title: 'Fable Direction',
    detail: 'Fable owns layout, positioning, wireframe direction, and final design packet.',
    gate: 'Human-approved prompt',
  },
  {
    step: '03',
    title: 'Hermes Flow Plan',
    detail: 'Hermes turns the design packet into operator steps, receipts, and approval points.',
    gate: 'T0-T2 only in lab',
  },
  {
    step: '04',
    title: 'SS-PT Promotion',
    detail: 'Only stable components, contracts, or docs move into SwanStudios production code.',
    gate: 'Review and tests',
  },
];

export const portfolioLanes: LabNode[] = [
  {
    eyebrow: 'Landing',
    title: 'Campaign and Offer Pages',
    detail: 'Founder-led pages, bootcamp offers, program launches, and premium client funnels.',
  },
  {
    eyebrow: 'Dashboard',
    title: 'Admin and Coach Concepts',
    detail: 'Dense operational surfaces for command centers, approvals, and trust receipts.',
  },
  {
    eyebrow: 'Motion',
    title: 'Morph Studies',
    detail: 'FLIP, View Transitions, reduced-motion fallbacks, and GPU-safe choreography.',
  },
  {
    eyebrow: 'Prompt',
    title: 'Fable Packets',
    detail: 'Reusable prompts, Mermaid flows, and wireframe briefs that can be re-run cleanly.',
  },
];

export const promotionChecks: LabMetric[] = [
  {
    label: 'No PII Boundary',
    value: 'Required',
    detail: 'Synthetic LensDocuments only until a privacy review approves real adapters.',
    tone: 'watch',
  },
  {
    label: 'Standalone First',
    value: 'Required',
    detail: 'Lens Foundry proves the primitive before SS-PT imports it.',
    tone: 'pass',
  },
  {
    label: 'Rigorous Review',
    value: 'Required',
    detail: 'Architecture, route mount, motion budget, and trust layer get reviewed before promotion.',
    tone: 'watch',
  },
  {
    label: 'Package Path',
    value: 'Queued',
    detail: 'Shared primitives graduate as versioned packages or copied receipts, not ad hoc drift.',
    tone: 'queued',
  },
];

