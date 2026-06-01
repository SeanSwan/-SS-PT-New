import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../../../../..');
const assistantHookPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistant.ts');
const foodHookPath = resolve(root, 'src/components/DashBoard/Pages/coach-assistant/hooks/useCoachAssistantFoodMessages.ts');

const readSource = (path: string) => readFileSync(path, 'utf8');

describe('useCoachAssistant food-message split', () => {
  it('keeps structured nutrition chat routing out of the main assistant hook', () => {
    const source = readSource(assistantHookPath);

    expect(source).toContain("import { useCoachAssistantFoodMessages } from './useCoachAssistantFoodMessages';");
    expect(source).toContain('useCoachAssistantFoodMessages({');
    expect(source).not.toContain('const sendMessageWithFood = useCallback');
    expect(source).not.toContain("'macro_logging' as Parameters<typeof chat.sendMessageWithConversation>[1]");
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps food-context messages in a capped hook with the nutrition lane contract', () => {
    const source = readSource(foodHookPath);

    expect(source).toContain('export function useCoachAssistantFoodMessages');
    expect(source).toContain('sendMessageWithFood');
    expect(source).toContain("'macro_logging'");
    expect(source).toContain("'Nutrition Coach'");
    expect(source).toContain('sendMessageWithConversation');
    expect(source).toContain('setLocalMessages([])');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(120);
  });
});
