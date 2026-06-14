/**
 * MODULE: progressFileDownload
 * PURPOSE: Shared browser download helper for Progress Proof exports.
 * OWNER: Client Dashboard / Progress Proof.
 */

export const downloadBlob = (filename: string, blob: Blob): boolean => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};
