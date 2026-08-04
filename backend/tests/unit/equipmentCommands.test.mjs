/**
 * Slice S6 equipment command registry contracts — mirrors bootcampCommands.test.mjs.
 * Locks the tier model: three T0 reads (no confirmation), one T2 bounded write
 * (confirmation-gated, non-destructive, manual-status only — enforced in the
 * dispatcher), all trainer/admin, none client-ref'd.
 */
import { describe, expect, it } from 'vitest';
import commands, { EQUIPMENT_CATEGORIES } from '../../services/ai/commandRegistry/equipmentCommands.mjs';

const byType = Object.fromEntries(commands.map((c) => [c.type, c]));

describe('equipment command registry', () => {
  it('registers exactly the four S6 commands, trainer/admin, no client ref, non-destructive', () => {
    expect(Object.keys(byType).sort()).toEqual([
      'equipment_add_item', 'equipment_gap_report', 'equipment_list_items', 'equipment_list_profiles',
    ]);
    for (const cmd of commands) {
      expect(cmd.destructive).toBe(false);
      expect(cmd.requiresClientRef).toBe(false);
      expect(cmd.roleRequired).toEqual(['admin', 'trainer']);
      expect(cmd.category).toBe('O');
    }
  });

  it('tiers: reads never require confirmation; add_item (T2 write) always does', () => {
    expect(byType.equipment_list_profiles.requiresConfirmation).toBe(false);
    expect(byType.equipment_list_items.requiresConfirmation).toBe(false);
    expect(byType.equipment_gap_report.requiresConfirmation).toBe(false);
    expect(byType.equipment_add_item.requiresConfirmation).toBe(true);
    expect(byType.equipment_add_item.method).toBe('POST');
  });

  it('profile-scoped schemas require a positive integer profileId and stay strict', () => {
    for (const type of ['equipment_list_items', 'equipment_gap_report']) {
      const schema = byType[type].inputSchema;
      expect(schema.safeParse({ profileId: 5 }).success).toBe(true);
      expect(schema.safeParse({ profileId: '7' }).success).toBe(true); // voice lane coerces
      expect(schema.safeParse({ profileId: 0 }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ profileId: 5, rogue: true }).success).toBe(false); // strict
    }
    expect(byType.equipment_list_profiles.inputSchema.safeParse({}).success).toBe(true);
    expect(byType.equipment_list_profiles.inputSchema.safeParse({ rogue: 1 }).success).toBe(false);
  });

  it('add_item schema bounds name ≤150, category to the model validate list, quantity 1..50', () => {
    const schema = byType.equipment_add_item.inputSchema;
    expect(schema.safeParse({ profileId: 5, name: 'Kettlebell 16kg' }).success).toBe(true);
    expect(schema.safeParse({ profileId: 5, name: 'Band', category: 'resistance_band', quantity: 2 }).success).toBe(true);
    expect(schema.safeParse({ profileId: 5, name: '' }).success).toBe(false);
    expect(schema.safeParse({ profileId: 5, name: 'x'.repeat(151) }).success).toBe(false);
    expect(schema.safeParse({ profileId: 5, name: 'Bar', category: 'spaceship' }).success).toBe(false);
    expect(schema.safeParse({ profileId: 5, name: 'Bar', quantity: 0 }).success).toBe(false);
    expect(schema.safeParse({ profileId: 5, name: 'Bar', quantity: 51 }).success).toBe(false);
    // Category list mirrors the EquipmentItem model validate list.
    expect(EQUIPMENT_CATEGORIES).toContain('lacrosse_ball');
    expect(EQUIPMENT_CATEGORIES).toContain('pull_up_bar');
    expect(EQUIPMENT_CATEGORIES).toContain('other');
  });
});
