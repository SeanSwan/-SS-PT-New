/**
 * NASM Template Registry — Unit Tests
 * ====================================
 * Validates registry entries, lookup functions, alias mapping, and data integrity.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 */
import { describe, it, expect } from 'vitest';
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByFramework,
  getTemplatesByStatus,
  getTemplateByPhaseKey,
  resolveAlias,
  TEMPLATE_ID_ALIASES,
  REGISTRY_VERSION,
} from '../../services/ai/nasmTemplateRegistry.mjs';

// ── Registry Metadata ──────────────────────────────────────────────────────

describe('NASM Template Registry', () => {
  describe('registry metadata', () => {
    it('should export a registry version string', () => {
      expect(REGISTRY_VERSION).toBe('4a-1.0.0');
    });

    it('should contain exactly 10 templates (7 active + 3 pending)', () => {
      expect(getAllTemplates()).toHaveLength(10);
    });

    it('should have unique IDs across all entries', () => {
      const ids = getAllTemplates().map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ── Lookup Functions ──────────────────────────────────────────────────────

  describe('getAllTemplates', () => {
    it('should return a copy (not the internal array)', () => {
      const a = getAllTemplates();
      const b = getAllTemplates();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('getTemplateById', () => {
    it('should find an active template by canonical ID', () => {
      const t = getTemplateById('opt-phase-1-stabilization');
      expect(t).not.toBeNull();
      expect(t.id).toBe('opt-phase-1-stabilization');
      expect(t.status).toBe('active');
    });

    it('should find a template by legacy alias ID', () => {
      const t = getTemplateById('opt-1-stabilization');
      expect(t).not.toBeNull();
      expect(t.id).toBe('opt-phase-1-stabilization');
    });

    it('should return null for unknown ID', () => {
      expect(getTemplateById('nonexistent-template')).toBeNull();
    });

    it('should find pending_schema templates', () => {
      const t = getTemplateById('general-beginner');
      expect(t).not.toBeNull();
      expect(t.status).toBe('pending_schema');
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return 8 programming templates (5 OPT + 3 general)', () => {
      expect(getTemplatesByCategory('programming')).toHaveLength(8);
    });

    it('should return 1 corrective template', () => {
      expect(getTemplatesByCategory('corrective')).toHaveLength(1);
    });

    it('should return 1 assessment template', () => {
      expect(getTemplatesByCategory('assessment')).toHaveLength(1);
    });

    it('should return empty for unknown category', () => {
      expect(getTemplatesByCategory('nonexistent')).toHaveLength(0);
    });
  });

  describe('getTemplatesByFramework', () => {
    it('should return 5 OPT templates', () => {
      expect(getTemplatesByFramework('OPT')).toHaveLength(5);
    });

    it('should return 1 CES template', () => {
      expect(getTemplatesByFramework('CES')).toHaveLength(1);
    });

    it('should return 1 PAR-Q+ template', () => {
      expect(getTemplatesByFramework('PAR-Q+')).toHaveLength(1);
    });

    it('should return 3 GENERAL templates', () => {
      expect(getTemplatesByFramework('GENERAL')).toHaveLength(3);
    });
  });

  describe('getTemplatesByStatus', () => {
    it('should return 7 active templates', () => {
      expect(getTemplatesByStatus('active')).toHaveLength(7);
    });

    it('should return 3 pending_schema templates', () => {
      expect(getTemplatesByStatus('pending_schema')).toHaveLength(3);
    });

    it('should return 0 deprecated templates', () => {
      expect(getTemplatesByStatus('deprecated')).toHaveLength(0);
    });
  });

  describe('getTemplateByPhaseKey', () => {
    const PHASE_KEY_MAP = {
      stabilization_endurance: 'opt-phase-1-stabilization',
      strength_endurance:      'opt-phase-2-strength-endurance',
      hypertrophy:             'opt-phase-3-hypertrophy',
      maximal_strength:        'opt-phase-4-maximal-strength',
      power:                   'opt-phase-5-power',
    };

    for (const [phaseKey, expectedId] of Object.entries(PHASE_KEY_MAP)) {
      it(`should resolve ${phaseKey} → ${expectedId}`, () => {
        const t = getTemplateByPhaseKey(phaseKey);
        expect(t).not.toBeNull();
        expect(t.id).toBe(expectedId);
      });
    }

    it('should return null for unknown phase key', () => {
      expect(getTemplateByPhaseKey('nonexistent')).toBeNull();
    });
  });

  // ── Alias Map ─────────────────────────────────────────────────────────────

  describe('TEMPLATE_ID_ALIASES', () => {
    it('should map all legacy degraded response IDs to registry IDs', () => {
      expect(resolveAlias('opt-1-stabilization')).toBe('opt-phase-1-stabilization');
      expect(resolveAlias('opt-2-strength')).toBe('opt-phase-2-strength-endurance');
      expect(resolveAlias('opt-3-hypertrophy')).toBe('opt-phase-3-hypertrophy');
      expect(resolveAlias('opt-4-maxstrength')).toBe('opt-phase-4-maximal-strength');
      expect(resolveAlias('opt-5-power')).toBe('opt-phase-5-power');
      expect(resolveAlias('ces-general')).toBe('ces-corrective-strategy');
    });

    it('should pass through IDs that have no alias', () => {
      expect(resolveAlias('opt-phase-1-stabilization')).toBe('opt-phase-1-stabilization');
      expect(resolveAlias('unknown-id')).toBe('unknown-id');
    });

    it('should have all alias targets resolve to existing registry entries', () => {
      for (const [alias, target] of Object.entries(TEMPLATE_ID_ALIASES)) {
        const entry = getAllTemplates().find(t => t.id === target);
        expect(entry, `Alias "${alias}" → "${target}" has no registry entry`).toBeTruthy();
      }
    });
  });

  // ── Data Integrity ────────────────────────────────────────────────────────

  describe('data integrity', () => {
    it('should have valid SemVer versions on all entries', () => {
      const semverPattern = /^\d+\.\d+\.\d+$/;
      for (const t of getAllTemplates()) {
        expect(t.templateVersion, `${t.id} templateVersion`).toMatch(semverPattern);
        expect(t.schemaVersion, `${t.id} schemaVersion`).toMatch(semverPattern);
      }
    });

    it('should have source attribution on all entries', () => {
      for (const t of getAllTemplates()) {
        expect(t.source, `${t.id} missing source`).toBeTruthy();
        expect(t.source.provider, `${t.id} missing source.provider`).toBeTruthy();
        expect(t.source.framework, `${t.id} missing source.framework`).toBeTruthy();
        expect(t.source.licenseNotes, `${t.id} missing source.licenseNotes`).toBeTruthy();
        expect(t.source.lastVerifiedAt, `${t.id} missing source.lastVerifiedAt`).toBeTruthy();
      }
    });

    it('should have non-null schema for active templates', () => {
      for (const t of getTemplatesByStatus('active')) {
        expect(t.schema, `${t.id} active but schema is null`).not.toBeNull();
      }
    });

    it('should have null schema for pending_schema templates', () => {
      for (const t of getTemplatesByStatus('pending_schema')) {
        expect(t.schema, `${t.id} pending_schema but schema is not null`).toBeNull();
      }
    });

    it('should have OPT phases 1-5 with correct phaseKeys', () => {
      const expected = [
        { phase: 1, key: 'stabilization_endurance' },
        { phase: 2, key: 'strength_endurance' },
        { phase: 3, key: 'hypertrophy' },
        { phase: 4, key: 'maximal_strength' },
        { phase: 5, key: 'power' },
      ];
      for (const { phase, key } of expected) {
        const t = getTemplatesByFramework('OPT').find(t => t.optPhase === phase);
        expect(t, `OPT phase ${phase} not found`).toBeTruthy();
        expect(t.schema.phaseKey, `OPT phase ${phase} phaseKey mismatch`).toBe(key);
      }
    });

    it('should have CES compensationMap with 9 checkpoint entries', () => {
      const ces = getTemplateById('ces-corrective-strategy');
      expect(ces).not.toBeNull();
      expect(ces.schema.compensationMap).toHaveLength(9);
      expect(ces.schema.checkpointCount).toBe(9);
    });

    it('should have PAR-Q+ with 7 questions', () => {
      const parq = getTemplateById('parq-plus-screening');
      expect(parq).not.toBeNull();
      expect(parq.schema.questions).toHaveLength(7);
    });

    it('should have no PII fields in any registry entry', () => {
      const piiPatterns = /email|phone|address|ssn|firstName|lastName|dateOfBirth|password/i;
      const json = JSON.stringify(getAllTemplates());
      // Check keys — not values (values like 'address' in exercise names are OK)
      for (const t of getAllTemplates()) {
        const keys = extractAllKeys(t);
        for (const key of keys) {
          expect(key, `PII-like key "${key}" found in ${t.id}`).not.toMatch(piiPatterns);
        }
      }
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractAllKeys(obj, prefix = '') {
  const keys = [];
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      keys.push(prefix ? `${prefix}.${key}` : key);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...extractAllKeys(value, prefix ? `${prefix}.${key}` : key));
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            keys.push(...extractAllKeys(item, prefix ? `${prefix}.${key}[]` : `${key}[]`));
          }
        }
      }
    }
  }
  return keys;
}
