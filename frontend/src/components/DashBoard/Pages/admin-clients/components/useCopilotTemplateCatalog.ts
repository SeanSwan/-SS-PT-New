/**
 * useCopilotTemplateCatalog
 *
 * Purpose: Loads the informational NASM template catalog for the workout
 * copilot idle state without bloating the main copilot state-machine shell.
 */

import { useEffect, useState } from 'react';
import type { TemplateEntry } from './copilot-types';

interface TemplateCatalogService {
  listTemplates: () => Promise<{
    success: boolean;
    templates: TemplateEntry[];
  }>;
}

interface UseCopilotTemplateCatalogOptions {
  open: boolean;
  service: TemplateCatalogService;
}

export const useCopilotTemplateCatalog = ({
  open,
  service,
}: UseCopilotTemplateCatalogOptions) => {
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setTemplates([]);
    setTemplatesLoading(true);

    service.listTemplates()
      .then((resp) => {
        if (active && resp.success) setTemplates(resp.templates);
      })
      .catch(() => {
        if (active) setTemplates([]);
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, service]);

  return { templates, templatesLoading };
};
