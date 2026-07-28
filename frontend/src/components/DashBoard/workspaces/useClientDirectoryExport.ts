/**
 * HOOK: useClientDirectoryExport
 * PURPOSE: Own the canonical Client Hub CSV export command and user feedback.
 * OWNER: Codex
 *
 * DATA FLOW:
 * AdminClientService.exportClients -> authenticated CSV response -> browser download.
 *
 * SAFETY:
 * The hook never reads or logs client rows. It only coordinates the protected
 * service call, blocks duplicate requests, and reports completion state.
 */

import { useCallback, useRef, useState } from 'react';
import type { Toast } from '../../../hooks/use-toast';
import type { AdminClientServiceInterface } from '../../../services/adminClientService';

type ClientExportService = Pick<AdminClientServiceInterface, 'exportClients'>;
type ClientExportToast = (toast: Omit<Toast, 'id'>) => void;

const EXPORT_SUCCESS: Omit<Toast, 'id'> = {
  title: 'Client export ready',
  description: 'The complete client directory was downloaded as a CSV file.',
  variant: 'success',
};

const EXPORT_FAILURE: Omit<Toast, 'id'> = {
  title: 'Client export failed',
  description: 'No file was downloaded. Try again.',
  variant: 'destructive',
};

export const useClientDirectoryExport = (
  service: ClientExportService | null | undefined,
  toast: ClientExportToast,
) => {
  const [exporting, setExporting] = useState(false);
  const exportInFlight = useRef(false);

  const exportClients = useCallback(async (): Promise<void> => {
    if (exportInFlight.current) return;
    if (!service) {
      toast(EXPORT_FAILURE);
      return;
    }

    exportInFlight.current = true;
    setExporting(true);

    try {
      await service.exportClients('csv');
      toast(EXPORT_SUCCESS);
    } catch {
      toast(EXPORT_FAILURE);
    } finally {
      exportInFlight.current = false;
      setExporting(false);
    }
  }, [service, toast]);

  return {
    exportClients,
    exporting,
  };
};
