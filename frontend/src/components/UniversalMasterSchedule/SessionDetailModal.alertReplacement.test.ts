import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(__dirname, 'SessionDetailModal.tsx');

describe('SessionDetailModal cancellation feedback', () => {
  it('uses app toasts instead of blocking browser alerts', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const cancellationHookSource = readFileSync(
      resolve(__dirname, 'hooks/useSessionCancellation.ts'),
      'utf8'
    );

    expect(source).toContain("import { useToast } from '../../hooks/use-toast';");
    expect(source).toContain('const { toast } = useToast();');
    expect(source).toContain('toast,');
    expect(cancellationHookSource).toContain("title: 'Session cancelled'");
    expect(source).not.toContain('alert(');
    expect(cancellationHookSource).not.toContain('alert(');
  });

  it('uses the native schedule confirmation dialog instead of blocking browser confirms', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const dialogSource = readFileSync(resolve(__dirname, 'ScheduleConfirmDialog.tsx'), 'utf8');

    expect(source).toContain("import ScheduleConfirmDialog");
    expect(source).toContain('<ScheduleConfirmDialog');
    expect(source).not.toContain('window.confirm');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toMatch(/min-height:\s*44px/);
  });

  it('uses lucide icons instead of mojibake/emoji glyphs in visible modal UI', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const cancelWarningPanelSource = readFileSync(
      resolve(__dirname, 'SessionDetailClientCancelWarningPanel.tsx'),
      'utf8'
    );
    const feedbackPanelSource = readFileSync(
      resolve(__dirname, 'SessionDetailClientFeedbackPanel.tsx'),
      'utf8'
    );

    expect(cancelWarningPanelSource).toMatch(/import \{[^}]*AlertTriangle[^}]*Check[^}]*\} from 'lucide-react';/s);
    expect(feedbackPanelSource).toMatch(/import \{[^}]*PartyPopper[^}]*Star[^}]*\} from 'lucide-react';/s);
    expect(feedbackPanelSource).toContain('<Star');
    expect(feedbackPanelSource).toContain('<PartyPopper');
    expect(cancelWarningPanelSource).toContain('<AlertTriangle');
    expect(cancelWarningPanelSource).toContain('<Check');
    expect(source).not.toMatch(/[^\x00-\x7F]/);
    expect(cancelWarningPanelSource).not.toMatch(/[^\x00-\x7F]/);
    expect(feedbackPanelSource).not.toMatch(/[^\x00-\x7F]/);
  });
});
