/**
 * PDF attachment controls for a saved workout-plan card.
 */

import React, { useCallback } from 'react';
import { Eye, FileText, UploadCloud } from 'lucide-react';
import type { SavedPlanSummary } from './SavedPlanCard';
import {
  CardActionButton,
  PdfActions,
  PdfEmptyText,
  PdfFileName,
  PdfIcon,
  PdfInfo,
  PdfLabel,
  PdfPanel,
} from './SavedPlanCard.styles';

interface SavedPlanPdfPanelProps {
  plan: SavedPlanSummary;
  onViewPdf: (plan: SavedPlanSummary) => void;
  onUpdatePdf: (plan: SavedPlanSummary) => void;
}

const SavedPlanPdfPanel: React.FC<SavedPlanPdfPanelProps> = ({
  plan,
  onViewPdf,
  onUpdatePdf,
}) => {
  const handleViewPdf = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewPdf(plan);
  }, [onViewPdf, plan]);

  const handleUpdatePdf = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePdf(plan);
  }, [onUpdatePdf, plan]);

  return (
    <PdfPanel $hasFile={Boolean(plan.pdfFile)}>
      <PdfIcon aria-hidden="true">
        <FileText size={18} />
      </PdfIcon>
      <PdfInfo>
        <PdfLabel>PDF Plan</PdfLabel>
        {plan.pdfFile ? (
          <PdfFileName>{plan.pdfFile.fileName}</PdfFileName>
        ) : (
          <PdfEmptyText>No PDF plan attached</PdfEmptyText>
        )}
      </PdfInfo>
      <PdfActions>
        {plan.pdfFile && (
          <CardActionButton
            type="button"
            $variant="primary"
            onClick={handleViewPdf}
            aria-label={`View PDF for ${plan.name}`}
            data-testid={`action-view-pdf-${plan.id}`}
          >
            <Eye size={14} /> View PDF
          </CardActionButton>
        )}
        <CardActionButton
          type="button"
          onClick={handleUpdatePdf}
          aria-label={`${plan.pdfFile ? 'Update' : 'Attach'} PDF for ${plan.name}`}
          data-testid={`action-update-pdf-${plan.id}`}
        >
          <UploadCloud size={14} /> {plan.pdfFile ? 'Update PDF' : 'Attach PDF'}
        </CardActionButton>
      </PdfActions>
    </PdfPanel>
  );
};

export default SavedPlanPdfPanel;
