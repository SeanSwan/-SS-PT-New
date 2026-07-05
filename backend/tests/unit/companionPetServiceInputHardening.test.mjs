import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sanitizePetName } from '../../services/gamification/CompanionPetService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceSource = readFileSync(
  resolve(__dirname, '../../services/gamification/CompanionPetService.mjs'),
  'utf8',
);

describe('sanitizePetName', () => {
  it('trims surrounding whitespace and returns a clean name unchanged', () => {
    expect(sanitizePetName('  Rex  ')).toBe('Rex');
    expect(sanitizePetName('Rex')).toBe('Rex');
  });

  it('collapses internal whitespace runs (incl. tabs/newlines) to single spaces', () => {
    expect(sanitizePetName('Sir   Fluffy\tthe\n\nGreat')).toBe('Sir Fluffy the Great');
  });

  it('caps length at 50 characters', () => {
    expect(sanitizePetName('a'.repeat(80)).length).toBe(50);
  });

  it('strips control characters (incl. null bytes) and DEL', () => {
    const withControls = 'Rex' + String.fromCharCode(0, 1, 31, 127);
    expect(sanitizePetName(withControls)).toBe('Rex');
  });

  it('strips angle brackets to defuse stored-XSS payloads', () => {
    const out = sanitizePetName('<script>alert(1)</script>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    const out2 = sanitizePetName('<img src=x onerror=alert(1)>');
    expect(out2).not.toContain('<');
    expect(out2).not.toContain('>');
  });

  it('preserves legitimate unicode and emoji', () => {
    expect(sanitizePetName('Café ☕ 龍')).toBe('Café ☕ 龍');
  });

  it('returns empty string for non-string / empty / control-only input', () => {
    expect(sanitizePetName(null)).toBe('');
    expect(sanitizePetName(undefined)).toBe('');
    expect(sanitizePetName(42)).toBe('');
    expect(sanitizePetName({})).toBe('');
    expect(sanitizePetName([])).toBe('');
    expect(sanitizePetName('   ')).toBe('');
    expect(sanitizePetName(String.fromCharCode(0, 1, 2))).toBe('');
  });
});

describe('CompanionPetService name hardening wiring (source-lock)', () => {
  it('routes adoptPet name through sanitizePetName with a safe species-default fallback', () => {
    expect(serviceSource).toContain('sanitizePetName(petName)');
    // must NOT persist the raw, unsanitized petName any more
    expect(serviceSource).not.toContain('petName: petName || PET_SPECIES[species].name');
  });

  it('routes renamePet name through sanitizePetName (not the old unbounded trim-slice)', () => {
    expect(serviceSource).toContain('sanitizePetName(newName)');
    expect(serviceSource).not.toContain('newName.trim().slice(0, 50)');
  });
});
