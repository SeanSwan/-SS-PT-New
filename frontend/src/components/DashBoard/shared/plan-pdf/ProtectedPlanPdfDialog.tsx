/**
 * FILE: ProtectedPlanPdfDialog.tsx
 * PURPOSE: Shared protected PDF viewer dialog for SwanStudios training plan arcs.
 */

import React, { useEffect } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import type { ProtectedPlanPdfViewerState } from './useProtectedPlanPdfViewer';
import {
  PdfActions,
  PdfDialogHeader,
  PdfDialogShell,
  PdfDownloadLink,
  PdfFrame,
  PdfFrameWrap,
  PdfIconButton,
  PdfKicker,
  PdfMetaRail,
  PdfMetaPill,
  PdfOverlay,
  PdfTitle,
  PdfTitleBlock,
} from './ProtectedPlanPdfDialog.styles';

interface ProtectedPlanPdfDialogProps {
  viewer: ProtectedPlanPdfViewerState | null;
  onClose: () => void;
  onOpenExternal: (objectUrl: string) => void;
}

const ProtectedPlanPdfDialog: React.FC<ProtectedPlanPdfDialogProps> = ({
  viewer,
  onClose,
  onOpenExternal,
}) => {
  useEffect(() => {
    if (!viewer) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewer]);

  if (!viewer) return null;

  const title = `${viewer.planName} PDF`;
  const planningLabel = viewer.planningSystem === 'swan_coach_planning'
    ? 'Swan Coach Planning'
    : null;

  return (
    <PdfOverlay
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <PdfDialogShell
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-plan-pdf-title"
      >
        <PdfDialogHeader>
          <PdfTitleBlock>
            <PdfKicker>Protected Plan PDF</PdfKicker>
            <PdfTitle id="client-plan-pdf-title">{title}</PdfTitle>
            <PdfMetaRail aria-label="PDF plan context">
              {viewer.horizonLabel && <PdfMetaPill>{viewer.horizonLabel}</PdfMetaPill>}
              {viewer.nasmPhase && <PdfMetaPill>NASM phase {viewer.nasmPhase}</PdfMetaPill>}
              {planningLabel && <PdfMetaPill>{planningLabel}</PdfMetaPill>}
            </PdfMetaRail>
          </PdfTitleBlock>
          <PdfActions>
            <PdfIconButton
              type="button"
              aria-label="Open PDF in new tab"
              onClick={() => onOpenExternal(viewer.objectUrl)}
            >
              <ExternalLink size={18} aria-hidden="true" />
            </PdfIconButton>
            <PdfDownloadLink
              href={viewer.objectUrl}
              download={viewer.fileName}
              aria-label={`Download ${viewer.fileName}`}
            >
              <Download size={18} aria-hidden="true" />
            </PdfDownloadLink>
            <PdfIconButton type="button" aria-label="Close PDF viewer" onClick={onClose}>
              <X size={20} aria-hidden="true" />
            </PdfIconButton>
          </PdfActions>
        </PdfDialogHeader>
        <PdfFrameWrap>
          <PdfFrame title={title} src={viewer.objectUrl} />
        </PdfFrameWrap>
      </PdfDialogShell>
    </PdfOverlay>
  );
};

export default ProtectedPlanPdfDialog;
