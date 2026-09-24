/**
 * destructiveCommandsSingleEntity.test.mjs
 * =======================================
 * H8 (2026-08-21 hostile round 1, Sol Pro). The "50-record bulk cap" in
 * destructiveOperations.mjs bounds only the caller-supplied PREVIEW array, which
 * the executor fills with at most one resolved client. It is not a row cap.
 *
 * That is safe ONLY while every destructive command is single-entity. This test
 * locks that premise: the moment someone registers a destructive command whose
 * endpoint is not keyed by a single :param (a bulk or date-range delete), it fails
 * - and the cap must then be replaced by a DB-side preview count over the frozen
 * predicate, not quietly trusted.
 */
import { describe, expect, it } from 'vitest';
import { getAllCommands, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

describe('destructive commands are single-entity (H8 premise lock)', () => {
  it('every destructive command is keyed by exactly one path parameter', () => {
    initializeRegistry();
    const destructive = getAllCommands().filter((c) => c.destructive);
    expect(destructive.length).toBeGreaterThan(0);

    const multiEntity = destructive.filter((c) => {
      const params = (c.endpoint || '').match(/:[a-zA-Z]+/g) || [];
      return params.length !== 1;
    });
    expect(multiEntity.map((c) => `${c.type} ${c.endpoint}`)).toEqual([]);
  });

  it('no destructive command accepts a dateRange or bulk-style input', () => {
    initializeRegistry();
    const bulkish = getAllCommands()
      .filter((c) => c.destructive)
      .filter((c) => {
        const shape = c.inputSchema?.shape ? Object.keys(c.inputSchema.shape) : [];
        return shape.some((k) => /dateRange|ids|bulk|all/i.test(k));
      });
    expect(bulkish.map((c) => c.type)).toEqual([]);
  });
});
