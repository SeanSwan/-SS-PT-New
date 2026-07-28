/** Side-effect-free CLI parsing and cost estimation. */
import {
  DEFAULT_MAX_CONTEXT_CHARS,
  DEFAULT_MAX_TOKENS_PER_TURN,
  DEFAULT_REASONING_TOKENS_PER_TURN,
  DEFAULT_RUN_CAP_USD,
  MAX_ROUNDS,
  MODEL_CONFIG,
} from './constants.mjs';

export function parseCliArgs(argv = process.argv.slice(2)) {
  const result = {
    task: '', mode: 'auto', files: [], maxRounds: MAX_ROUNDS,
    maxContextChars: DEFAULT_MAX_CONTEXT_CHARS,
    maxTokensPerTurn: DEFAULT_MAX_TOKENS_PER_TURN,
    capUsd: DEFAULT_RUN_CAP_USD, confirmSpend: false, out: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`);
      i += 1;
      return argv[i];
    };
    if (arg === '--task') result.task = next();
    else if (arg === '--mode') result.mode = next();
    else if (arg === '--file' || arg === '--files') result.files.push(...next().split(',').map((x) => x.trim()).filter(Boolean));
    else if (arg === '--max-rounds') result.maxRounds = Number(next());
    else if (arg === '--max-context-chars') result.maxContextChars = Number(next());
    else if (arg === '--max-tokens-per-turn') result.maxTokensPerTurn = Number(next());
    else if (arg === '--cap-usd') result.capUsd = Number(next());
    else if (arg === '--out') result.out = next();
    else if (arg === '--confirm-spend') result.confirmSpend = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!result.help && !result.task.trim()) throw new Error('--task is required');
  if (!Number.isInteger(result.maxRounds) || result.maxRounds < 1 || result.maxRounds > MAX_ROUNDS) {
    throw new Error(`--max-rounds must be between 1 and ${MAX_ROUNDS}`);
  }
  for (const key of ['maxContextChars', 'maxTokensPerTurn', 'capUsd']) {
    if (!Number.isFinite(result[key]) || result[key] <= 0) throw new Error(`${key} must be positive`);
  }
  return result;
}

export function estimateWorstCaseRun({ promptChars, maxRounds, maxTokensPerTurn }) {
  // Conservative ceiling: at most one input token per supplied UTF-8 byte/char budget.
  const inputTokens = Math.ceil(promptChars);
  let perRound = 0;
  for (const brain of ['opus', 'kimi']) {
    const cfg = MODEL_CONFIG[brain];
    perRound += (inputTokens / 1_000_000) * cfg.priceIn;
    const completionBudget = maxTokensPerTurn + DEFAULT_REASONING_TOKENS_PER_TURN;
    perRound += (completionBudget / 1_000_000) * cfg.priceOut;
  }
  return { calls: maxRounds * 2, usd: Number((perRound * maxRounds).toFixed(4)) };
}

