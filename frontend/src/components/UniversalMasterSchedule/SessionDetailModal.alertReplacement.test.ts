import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(__dirname, 'SessionDetailModal.tsx');

describe('SessionDetailModal cancellation feedback', () => {
  it('uses app toasts instead of blocking browser alerts', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain("import { useToast } from '../../hooks/use-toast';");
    expect(source).toContain('const { toast } = useToast();');
    expect(source).toContain("title: 'Session cancelled'");
    expect(source).not.toContain('alert(');
  });
});
