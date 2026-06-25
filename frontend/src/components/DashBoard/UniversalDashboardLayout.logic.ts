export const parseDashboardUserId = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export interface DashboardDiagnosticMeta {
  code: string;
  message: string;
  causeName: string;
}

export const dashboardDiagnosticMeta = (
  code: string,
  message: string,
  cause: unknown
): DashboardDiagnosticMeta => ({
  code,
  message,
  causeName: cause instanceof Error ? cause.name : typeof cause,
});

export const reportDashboardDiagnostic = (meta: DashboardDiagnosticMeta): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('swan-dashboard-diagnostic', {
      detail: meta,
    })
  );
};
