import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateEntry } from './copilot-types';
import { useCopilotTemplateCatalog } from './useCopilotTemplateCatalog';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const TEMPLATE: TemplateEntry = {
  id: 'template-1',
  label: 'Strength Phase',
  category: 'strength',
  status: 'active',
  nasmFramework: 'OPT',
  optPhase: 2,
  supportsAiContext: true,
  tags: ['strength'],
};

describe('useCopilotTemplateCatalog', () => {
  it('keeps template loading outside the copilot reset effect', () => {
    expect(panelSource).toContain("from './useCopilotTemplateCatalog'");
    expect(panelSource).not.toContain('service.listTemplates()');
    expect(panelSource).not.toContain('setTemplatesLoading(true)');
  });

  it('loads templates when the copilot opens', async () => {
    const service = {
      listTemplates: vi.fn().mockResolvedValue({ success: true, templates: [TEMPLATE] }),
    };

    const { result } = renderHook(() => useCopilotTemplateCatalog({ open: true, service }));

    expect(result.current.templatesLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.templatesLoading).toBe(false);
    });

    expect(service.listTemplates).toHaveBeenCalledTimes(1);
    expect(result.current.templates).toEqual([TEMPLATE]);
  });

  it('does not load templates while the copilot is closed', () => {
    const service = {
      listTemplates: vi.fn().mockResolvedValue({ success: true, templates: [TEMPLATE] }),
    };

    const { result } = renderHook(() => useCopilotTemplateCatalog({ open: false, service }));

    expect(service.listTemplates).not.toHaveBeenCalled();
    expect(result.current.templatesLoading).toBe(false);
    expect(result.current.templates).toEqual([]);
  });

  it('fails closed when the template service rejects', async () => {
    const service = {
      listTemplates: vi.fn().mockRejectedValue(new Error('network')),
    };

    const { result } = renderHook(() => useCopilotTemplateCatalog({ open: true, service }));

    await waitFor(() => {
      expect(result.current.templatesLoading).toBe(false);
    });

    expect(result.current.templates).toEqual([]);
  });
});
