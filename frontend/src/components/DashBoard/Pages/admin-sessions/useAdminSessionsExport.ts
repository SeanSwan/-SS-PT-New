import React from 'react';
import { useToast } from '../../../../hooks/use-toast';
import type { Session } from './ViewSessionModal.types';
import { buildAdminSessionsCsv } from './AdminSessionsSessionList.logic';

interface UseAdminSessionsExportParams {
  sessions: Session[];
  formatDate: (dateString: string | null | undefined) => string;
  formatTime: (dateString: string | null | undefined) => string;
}

const useAdminSessionsExport = ({
  sessions,
  formatDate,
  formatTime,
}: UseAdminSessionsExportParams) => {
  const { toast } = useToast();

  return React.useCallback(() => {
    const csvString = buildAdminSessionsCsv(sessions, { formatDate, formatTime });
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sessions-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'CSV export started.' });
  }, [formatDate, formatTime, sessions, toast]);
};

export default useAdminSessionsExport;
