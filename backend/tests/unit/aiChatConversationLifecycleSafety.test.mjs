/**
 * aiChatConversationLifecycleSafety.test.mjs
 * ==========================================
 * Locks the conversation lifecycle contract for Swan Coach threads:
 * deleted conversations are not listable, reloadable, or restorable by ID.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AI_CHAT_ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/aiChatRoutes.mjs'),
  'utf8',
);

describe('AI chat conversation lifecycle safety', () => {
  it('keeps deleted conversations out of normal thread lists', () => {
    expect(AI_CHAT_ROUTES_SRC).toMatch(/const allowedStatuses = \['active', 'archived'\]/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/status: resolvedStatus/);
  });

  it('blocks direct ID access to deleted conversations', () => {
    expect(AI_CHAT_ROUTES_SRC).toMatch(/import \{ Op \} from 'sequelize';/);
    expect((AI_CHAT_ROUTES_SRC.match(/\[Op\.ne\]: 'deleted'/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('only appends new messages to active conversations', () => {
    expect(AI_CHAT_ROUTES_SRC).toMatch(/status: 'active'/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/strictPiiMiddleware/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/conversation\.messages\.length >= 200/);
  });
});
