/**
 * PURPOSE: Own the canonical Client Hub CSV download lifecycle.
 * SECURITY: Delegates row construction to the protected backend export route.
 * UX: Coalesces repeat clicks and emits honest success/failure feedback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import adminClientService from '../../../services/adminClientService';
import { useToast } from '../../../hooks/use-toast';

export interface ClientDirectoryExportService {
  exportClients: (format?: string) => Promise<boolean>;
}

interface ClientDirectoryExportState {
  isExporting: boolean;
  exportDirectory: () => Promise<void>;
}

export const useClientDirectoryExport = (
  service: ClientDirectoryExportService = adminClientService
): ClientDirectoryExportState => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const exportDirectory = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setIsExporting(true);

    try {
      const downloadCompleted = await service.exportClients('csv');
      if (downloadCompleted !== true) {
        throw new Error('client_export_not_completed');
      }
      if (mountedRef.current) {
        toast({
          title: 'Client export ready',
          description: 'Your client directory CSV was downloaded.',
        });
      }
    } catch {
      if (mountedRef.current) {
        toast({
          title: 'Client export failed',
          description: 'No client file was downloaded. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setIsExporting(false);
      }
    }
  }, [service, toast]);

  return {
    isExporting,
    exportDirectory,
  };
};
