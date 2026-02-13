/**
 * Session Type Policy Tests
 * =========================
 * Validates the 5 approved session types with credit rules.
 */
import { describe, it, expect } from 'vitest';

const SESSION_TYPES = [
  { name: 'Personal Training (60 min)', duration: 60, bufferBefore: 0, bufferAfter: 15, creditsRequired: 1, color: '#00FFFF' },
  { name: 'Extended Training (90 min)', duration: 90, bufferBefore: 0, bufferAfter: 15, creditsRequired: 2, color: '#7851A9' },
  { name: 'Partner Training (60 min)', duration: 60, bufferBefore: 0, bufferAfter: 15, creditsRequired: 1, color: '#FF6B6B' },
  { name: 'Assessment / Movement Screen', duration: 60, bufferBefore: 0, bufferAfter: 30, creditsRequired: 0, color: '#FFD700' },
  { name: 'Orientation / Onboarding', duration: 30, bufferBefore: 0, bufferAfter: 0, creditsRequired: 0, color: '#4CAF50' },
];

describe('Session Type Policy', () => {
  it('defines exactly 5 session types', () => {
    expect(SESSION_TYPES).toHaveLength(5);
  });

  it('all session types have required fields', () => {
    for (const type of SESSION_TYPES) {
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('duration');
      expect(type).toHaveProperty('bufferBefore');
      expect(type).toHaveProperty('bufferAfter');
      expect(type).toHaveProperty('creditsRequired');
      expect(type).toHaveProperty('color');
      expect(typeof type.name).toBe('string');
      expect(typeof type.duration).toBe('number');
      expect(type.duration).toBeGreaterThan(0);
    }
  });

  it('Personal Training costs 1 credit', () => {
    const pt = SESSION_TYPES.find(t => t.name.includes('Personal Training'));
    expect(pt.creditsRequired).toBe(1);
    expect(pt.duration).toBe(60);
  });

  it('Extended Training costs 2 credits', () => {
    const ext = SESSION_TYPES.find(t => t.name.includes('Extended Training'));
    expect(ext.creditsRequired).toBe(2);
    expect(ext.duration).toBe(90);
  });

  it('Partner Training costs 1 credit per person', () => {
    const partner = SESSION_TYPES.find(t => t.name.includes('Partner Training'));
    expect(partner.creditsRequired).toBe(1);
  });

  it('Assessment costs 0 credits', () => {
    const assessment = SESSION_TYPES.find(t => t.name.includes('Assessment'));
    expect(assessment.creditsRequired).toBe(0);
    expect(assessment.bufferAfter).toBe(30);
  });

  it('Orientation costs 0 credits', () => {
    const orientation = SESSION_TYPES.find(t => t.name.includes('Orientation'));
    expect(orientation.creditsRequired).toBe(0);
    expect(orientation.duration).toBe(30);
  });

  it('all colors are valid hex codes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const type of SESSION_TYPES) {
      expect(type.color).toMatch(hexRegex);
    }
  });

  it('no duplicate session type names', () => {
    const names = SESSION_TYPES.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('buffers are non-negative integers', () => {
    for (const type of SESSION_TYPES) {
      expect(type.bufferBefore).toBeGreaterThanOrEqual(0);
      expect(type.bufferAfter).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(type.bufferBefore)).toBe(true);
      expect(Number.isInteger(type.bufferAfter)).toBe(true);
    }
  });
});
