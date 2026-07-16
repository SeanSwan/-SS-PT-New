const MAX_FACTION_ID_LENGTH = 50;
const CONTROL_CHARS = /\p{Cc}/u;

export function normalizeAvatarHomeFactionId(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FACTION_ID_LENGTH) return undefined;
  if (CONTROL_CHARS.test(trimmed)) return undefined;

  return trimmed;
}
