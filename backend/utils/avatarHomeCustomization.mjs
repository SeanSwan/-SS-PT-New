const BODY_TYPES = new Set(['athletic', 'average', 'muscular', 'slim', 'curvy']);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

const optionalString = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const validateIdentifier = (value, maxLength) => {
  const normalized = optionalString(value);
  if (normalized === null || normalized === undefined) return normalized;
  if (normalized.length > maxLength || !IDENTIFIER_PATTERN.test(normalized)) return undefined;
  return normalized;
};

export const buildAvatarHomeCustomizationUpdates = (payload = {}) => {
  const updates = {};

  const bodyType = optionalString(payload?.bodyType);
  if (bodyType !== null) {
    if (bodyType === undefined || !BODY_TYPES.has(bodyType)) {
      return { error: 'Invalid avatar body type', updates: {} };
    }
    updates.avatarBodyType = bodyType;
  }

  const skinTone = optionalString(payload?.skinTone);
  if (skinTone !== null) {
    if (skinTone === undefined || !HEX_COLOR_PATTERN.test(skinTone)) {
      return { error: 'Invalid avatar skin tone', updates: {} };
    }
    updates.avatarSkinTone = skinTone;
  }

  const hairStyle = validateIdentifier(payload?.hairStyle, 30);
  if (hairStyle !== null) {
    if (hairStyle === undefined) {
      return { error: 'Invalid avatar hair style', updates: {} };
    }
    updates.avatarHairStyle = hairStyle;
  }

  const hairColor = optionalString(payload?.hairColor);
  if (hairColor !== null) {
    if (hairColor === undefined || !HEX_COLOR_PATTERN.test(hairColor)) {
      return { error: 'Invalid avatar hair color', updates: {} };
    }
    updates.avatarHairColor = hairColor;
  }

  const outfit = validateIdentifier(payload?.outfit, 30);
  if (outfit !== null) {
    if (outfit === undefined) {
      return { error: 'Invalid avatar outfit', updates: {} };
    }
    updates.avatarOutfit = outfit;
  }

  return { error: null, updates };
};
