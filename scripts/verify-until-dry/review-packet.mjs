/**
 * @file review-packet.mjs
 * @description Builds canonical, blind, redacted hostile-review packets.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { redactSecrets } from '../context-gateway/src/egress.mjs';

const SAFE_RELATIVE_PATH = /^(?![A-Za-z]:)(?![\\/])(?!.*(?:^|[\\/])\.\.(?:[\\/]|$)).+/;
const EXTERNAL_OBJECTIVE = 'Find reproducible correctness defects in the pseudonymized control-flow evidence.';
const SUPPORTED_TRANSFORM_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx']);
const KEY_ASSIGNMENT = /\b(password|passwd|api[_-]?key|client[_-]?secret|access[_-]?token)\s*([=:])\s*([^\s,;]+)/gi;
const PII_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i,
  /\b(?:client|user|full)?name\s*[=:]\s*["'`][A-Z][a-z]+\s+[A-Z][a-z]+["'`]/i,
  /\b(?:dob|birth(?:day|date)?)\s*[=:]\s*["'`]\d{4}-\d{2}-\d{2}["'`]/i,
]);
const KIMI_CEILING_PATTERNS = Object.freeze([
  ['unsupported-template-interpolation', /\$\{/],
  ['payment-card', /\b(?:card(?:holder)?(?:Number|_number)?|cvv|cvc|payment|billing|stripe|bankAccount|routingNumber)\b/i],
  ['payment-card-number', /\b(?:\d[ -]?){13,19}\b/],
  ['identity-document', /\b(?:passport(?:Number)?|visa(?:Number)?|immigrationStatus|citizenship|driver(?:s)?License|nationalId|socialSecurity|ssn)\b/i],
  ['health-data', /\b(?:diagnosis(?:Code)?|hipaa|medical|patient|health|injury|pain|medication|prescription|pharmacy|dosage)\b/i],
  ['biometric-data', /\b(?:biometric(?:Template)?|fingerprint(?:Template)?|face(?:print|Template)|retina(?:Scan)?|iris(?:Scan)?|dna(?:Profile)?)\b/i],
  ['precise-location', /\b(?:homeCoordinates|latitude|longitude|geolocation|gpsCoordinates|preciseLocation)\b/i],
  ['member-identity', /\b(?:athleteName|memberName|lastKnownIp|ipAddress)\b/i],
  ['financial-record', /\b(?:swiftCode|accountBalance|productionRow|databaseRow|rawProductionData)\b/i],
  ['access-control', /\b(?:auth(?:entication|orization)?|login|permission|privilege|role|access[-_ ]?control|elevat(?:e|ion)|impersonat(?:e|ion)|canElevateRole)\b/i],
]);
const STRUCTURAL_WORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'get', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'of', 'return', 'set', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield',
  'diff', 'git', 'index', 'mode', 'file', 'rename', 'similarity', 'to', 'Binary',
  'files', 'differ', 'GIT', 'binary', 'patch', 'literal', 'COMMENT', 'REDACTED', 'PII', 'CREDENTIAL',
]);

export function detectSensitiveEvidence(value) {
  return PII_PATTERNS.flatMap((pattern, index) => pattern.test(String(value)) ? [`pii-pattern-${index + 1}`] : []);
}

export function detectKimiCeilingEvidence(value) {
  return KIMI_CEILING_PATTERNS.flatMap(([label, pattern]) => pattern.test(String(value)) ? [label] : []);
}

export function supportsKimiTransformPath(path) {
  const normalized = String(path).replaceAll('\\', '/').toLowerCase();
  const name = normalized.slice(normalized.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot >= 0 && SUPPORTED_TRANSFORM_EXTENSIONS.has(name.slice(dot));
}

function redactPii(value) {
  return PII_PATTERNS.reduce((text, pattern) => {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    return text.replace(new RegExp(pattern.source, flags), '<REDACTED-PII>');
  }, String(value));
}

function redact(value) {
  const keyed = String(value).replace(KEY_ASSIGNMENT, (_match, key, separator) =>
    `${key}${separator}<REDACTED-CREDENTIAL>`);
  return redactSecrets(keyed).text;
}

function sensitiveError(reasons) {
  const error = new Error('Evidence exceeds the external Kimi privacy ceiling');
  error.code = 'SENSITIVE_EVIDENCE';
  error.detail = reasons;
  return error;
}

function normalizeObjective(value) {
  const raw = String(value ?? 'Find reproducible correctness defects in the supplied evidence.');
  const ceilingReasons = detectKimiCeilingEvidence(raw);
  if (ceilingReasons.length) throw sensitiveError(ceilingReasons);
  if (detectSensitiveEvidence(raw).length) throw sensitiveError(['objective-pii']);
  return EXTERNAL_OBJECTIVE;
}

function alias(map, key, prefix) {
  if (!map.has(key)) map.set(key, `${prefix}_${map.size + 1}`);
  return map.get(key);
}

function marker(index, open, close) {
  const bits = index.toString(2).replaceAll('0', '.').replaceAll('1', ':');
  return `${open}${bits}${close}`;
}

function markerIndex(bits) {
  return Number.parseInt(bits.replaceAll('.', '0').replaceAll(':', '1'), 2);
}

function pseudonymizeEvidence(value, aliases) {
  let text = String(value)
    .replace(/\/\*[\s\S]*?\*\//g, '/* COMMENT */')
    .replace(/(^|[^:])\/\/.*$/gm, '$1// COMMENT');
  const hideString = (match) => {
    const valueKey = match.slice(1, -1);
    const label = alias(aliases.strings, valueKey, 'STR');
    return marker(Number(label.slice(4)), '\u0001', '\u0002');
  };
  text = text
    .replace(/`(?:\\.|[^`\\])*`/gs, hideString)
    .replace(/"(?:\\.|[^"\\])*"/g, hideString)
    .replace(/'(?:\\.|[^'\\])*'/g, hideString)
    .replace(/(?<![\p{L}\p{N}_$])(?:0[xX][0-9A-Fa-f](?:_?[0-9A-Fa-f])*n?|0[bB][01](?:_?[01])*n?|0[oO][0-7](?:_?[0-7])*n?|(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?n?)(?![\p{L}\p{N}_$])/gu, (token) => {
      const label = alias(aliases.numbers, token, 'NUM');
      return marker(Number(label.slice(4)), '\u0003', '\u0004');
    });
  text = text.replace(/[\p{L}\p{Nl}_$][\p{L}\p{Nl}\p{Nd}\p{Mn}\p{Mc}\p{Pc}\u200C\u200D_$]*/gu, (token) => {
    if (STRUCTURAL_WORDS.has(token)) return token;
    return alias(aliases.identifiers, token, 'ID');
  });
  return text
    .replace(/\u0001([.:]+)\u0002/g, (_match, bits) => `"STR_${markerIndex(bits)}"`)
    .replace(/\u0003([.:]+)\u0004/g, (_match, bits) => `NUM_${markerIndex(bits)}`)
    .replace(/[^\x00-\x7F]/g, '?');
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error('Review evidence is required');
  const normalized = evidence.map((item) => {
    if (!item?.id || !item?.path || typeof item.content !== 'string' || !SAFE_RELATIVE_PATH.test(item.path)) {
      throw new Error('Every evidence item needs an id, safe relative path, and text content');
    }
    if (!supportsKimiTransformPath(item.path)) throw new Error(`Unsupported Kimi evidence transform: ${item.path}`);
    const ceilingReasons = detectKimiCeilingEvidence(item.content);
    if (ceilingReasons.length) throw sensitiveError(ceilingReasons);
    return { id: String(item.id), path: item.path.replaceAll('\\', '/'), rawContent: item.content };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.path.localeCompare(b.path));
  const aliases = { identifiers: new Map(), strings: new Map(), numbers: new Map() };
  return normalized.map((item) => {
    const content = pseudonymizeEvidence(redactPii(redact(item.rawContent)), aliases);
    if (detectSensitiveEvidence(content).length) {
      const error = new Error('Sensitive evidence could not be safely redacted');
      error.code = 'SENSITIVE_EVIDENCE';
      throw error;
    }
    return { id: item.id, path: item.path, content };
  });
}

function normalizePathList(paths, label) {
  if (!Array.isArray(paths) || paths.some((path) =>
    typeof path !== 'string' || !path.trim() || !SAFE_RELATIVE_PATH.test(path))) {
    throw new Error(`${label} must contain safe relative paths`);
  }
  const normalized = paths.map((path) => path.replaceAll('\\', '/'));
  if (new Set(normalized).size !== normalized.length) throw new Error(`${label} cannot contain duplicates`);
  return normalized.sort();
}

function normalizeManifest(manifest, evidence) {
  const evidencePaths = evidence.map((item) => item.path).sort();
  const includedPaths = normalizePathList(manifest?.includedPaths ?? evidencePaths, 'Included evidence paths');
  const excludedPaths = normalizePathList(manifest?.excludedPaths ?? [], 'Excluded evidence paths');
  if (canonicalJson(includedPaths) !== canonicalJson(evidencePaths)) {
    throw new Error('Included evidence paths must exactly match packet evidence');
  }
  if (excludedPaths.some((path) => includedPaths.includes(path))) {
    throw new Error('Included and excluded evidence paths cannot overlap');
  }
  return { includedPaths, excludedPaths };
}

/** Builder narratives and proposed fixes are deliberately not accepted into the packet body. */
export function buildReviewPacket(input = {}) {
  const evidence = normalizeEvidence(input.evidence);
  const evidenceManifest = normalizeManifest(input.evidenceManifest, evidence);
  const packet = {
    schema: 'verify-until-dry.review-packet.v1',
    runId: String(input.runId ?? 'unassigned'),
    sourceHash: String(input.sourceHash ?? 'unproven'),
    scopeHash: String(input.scopeHash ?? 'unproven'),
    objective: normalizeObjective(input.objective),
    reviewerRules: [
      'Assume the implementation is wrong until evidence disproves each attack.',
      'Report only reproducible findings with severity, evidence id, and a failing scenario.',
      'Do not trust builder conclusions and do not declare global perfection.',
      'Identifiers and literals are deterministically pseudonymized; reason from control flow and evidence IDs.',
      'Transformed evidence may not parse as source; do not report syntax or lexical defects from transformed tokens.',
    ],
    evidenceTransform: 'pseudonymized-control-flow-v1',
    evidenceManifest,
    evidence,
  };
  const sections = evidence.map((item) =>
    `## EVID-${sha256(item.id).slice(0, 12)} -- PATH-${sha256(item.path).slice(0, 12)}\n\n` +
    `\`\`\`text\n${item.content}\n\`\`\``).join('\n\n');
  const text = `# Blind Hostile Review Packet\n\n` +
    `Run: ${sha256(packet.runId).slice(0, 12)}\nSource: ${packet.sourceHash}\nScope: ${packet.scopeHash}\n\n` +
    `Objective: ${packet.objective}\n\n${packet.reviewerRules.map((rule) => `- ${rule}`).join('\n')}\n\n${sections}\n`;
  const textHash = sha256(text);
  const canonical = canonicalJson({ packet, textHash });
  return Object.freeze({
    text,
    hash: sha256(canonical),
    canonical,
    textHash,
    sourceHash: packet.sourceHash,
    scopeHash: packet.scopeHash,
    evidencePaths: Object.freeze([...evidenceManifest.includedPaths]),
    excludedEvidencePaths: Object.freeze([...evidenceManifest.excludedPaths]),
  });
}
