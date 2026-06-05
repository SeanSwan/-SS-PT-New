import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/LongHorizonContent.tsx'),
  'utf8',
);

describe('LongHorizonContent workflow extraction', () => {
  it('keeps API workflow orchestration in the long-horizon hook', () => {
    expect(source).toContain("from './useLongHorizonWorkflow'");
    expect(source).toContain('useLongHorizonWorkflow({');
    expect(source).not.toContain('service.generateLongHorizonDraft');
    expect(source).not.toContain('service.approveLongHorizonDraft');
    expect(source).not.toContain('adminClientService.getClientDetails');
  });
});
