/**
 * Tests for the de-identification layer — the last gate before client data reaches a cloud model.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28):
 * `deIdentifier.mjs` had zero test coverage. Its module header claims "PII is NEVER sent to AI
 * models", and for STRUCTURED fields that was true — email, phone, date of birth, and last name
 * were correctly excluded, and pain entries were correctly abstracted to `{bodyPart, level}`.
 *
 * But goal text was passed through verbatim, and goal text is where people write sentences.
 * Verified by execution, this reached the model intact:
 *
 *   "Sarah wants to squat 200lb — Dr. Smith cleared her after ACL surgery"
 *
 * leaking the client's own first name, their physician's name, and a diagnosis — through a module
 * whose entire job is to prevent exactly that. Rule 8 is categorical, so free text is now treated
 * as hostile: the client's name is aliased out, then the PHI scanner strips the rest.
 *
 * The second property these tests defend is just as important: the output must remain USEFUL.
 * A de-identifier that redacts "squat 200lb" protects privacy by making the coach useless.
 */
import { describe, it, expect } from 'vitest';
import { deIdentifyClient } from '../../services/ai/deIdentifier.mjs';

const client = {
  id: 42,
  firstName: 'Sarah',
  lastName: 'Connor',
  email: 'sarah.connor@example.com',
  phone: '555-123-4567',
  dateOfBirth: '1985-03-14',
  gender: 'female',
  trainingExperience: 'intermediate',
  fitnessGoals: 'Help Sarah lose 20 lbs before her wedding'
};

const enrichment = {
  goals: [{ description: 'Sarah Connor wants to squat 200lb — Dr. Smith cleared her after ACL surgery' }],
  painEntries: [{ bodyPart: 'knee', painLevel: 6, notes: 'Torn ACL, taking Oxycodone' }]
};

const payloadOf = (c = client, e = enrichment) => JSON.stringify(deIdentifyClient(c, e).deIdentified);

describe('deIdentifyClient — nothing identifying may reach the model', () => {
  it.each([
    ['client first name', 'Sarah'],
    ['client last name', 'Connor'],
    ['email address', 'sarah.connor@example.com'],
    ['phone number', '555-123-4567'],
    ['date of birth', '1985-03-14'],
    ['physician name', 'Smith'],
    ['medication', 'Oxycodone'],
    ['diagnosis', 'ACL']
  ])('does not leak %s', (_label, needle) => {
    expect(payloadOf()).not.toContain(needle);
  });

  it('substitutes the alias for the client name in free text', () => {
    const { deIdentified } = deIdentifyClient(client, enrichment);
    expect(JSON.stringify(deIdentified)).toContain('Client-42');
  });

  it('keeps the real name only in the server-side alias map, never in the payload', () => {
    const { deIdentified, aliasMap } = deIdentifyClient(client, enrichment);
    expect(aliasMap['Client-42']).toBe('Sarah Connor');
    expect(JSON.stringify(deIdentified)).not.toContain('Sarah Connor');
  });

  it('replaces the full name before the bare first name can match inside it', () => {
    // Longest-first ordering: "Sarah Connor" must be consumed as one unit, otherwise replacing
    // "Sarah" first leaves a dangling "Client-42 Connor".
    const { deIdentified } = deIdentifyClient(client, {
      goals: [{ description: 'Sarah Connor is progressing well' }]
    });
    expect(JSON.stringify(deIdentified)).not.toContain('Connor');
  });
});

describe('deIdentifyClient — output must stay USEFUL to the coach', () => {
  it('preserves the actionable part of a goal', () => {
    // Over-scrubbing is its own failure: privacy achieved by destroying meaning is not a win.
    expect(payloadOf()).toMatch(/squat|200lb|20 lbs/i);
  });

  it('keeps non-identifying structured context', () => {
    const { deIdentified } = deIdentifyClient(client, enrichment);
    expect(deIdentified.trainingExperience).toBe('intermediate');
    expect(deIdentified.gender).toBe('female');
    expect(deIdentified.clientAlias).toBe('Client-42');
  });

  it('abstracts pain entries to body part and level, dropping the notes entirely', () => {
    const { deIdentified } = deIdentifyClient(client, enrichment);
    expect(deIdentified.painEntries[0]).toMatchObject({ bodyPart: 'knee', level: 'medium' });
    expect(JSON.stringify(deIdentified.painEntries)).not.toContain('Oxycodone');
  });
});

describe('deIdentifyClient — robustness', () => {
  it('throws when given no client id, rather than silently emitting an unaliased payload', () => {
    expect(() => deIdentifyClient(null)).toThrow(/client with id is required/);
    expect(() => deIdentifyClient({})).toThrow(/client with id is required/);
  });

  it('handles a client with no name and no enrichment', () => {
    const { deIdentified } = deIdentifyClient({ id: 7 });
    expect(deIdentified.clientAlias).toBe('Client-7');
    expect(deIdentified.fitnessGoals).toEqual([]);
  });

  it('drops goal text it cannot make safe instead of passing it through raw', () => {
    // scrubFreeText fails closed — on error it returns '' rather than the original string.
    const { deIdentified } = deIdentifyClient({ id: 9, firstName: 'Ann' }, {
      goals: [{ description: null }, { description: '' }]
    });
    expect(deIdentified.goals.every((g) => typeof g.title === 'string')).toBe(true);
  });
});
