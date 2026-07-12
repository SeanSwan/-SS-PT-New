/**
 * progressReportPdf
 * =================
 * Branded client progress report - one section per canonical progress chart,
 * rendered as clean striped tables (jspdf-autotable) on the shared Swan kit,
 * so the report a client hands to a physician or coach reads as a studio
 * document, not a data dump.
 */
import type { jsPDF as PdfDoc } from 'jspdf';
import { addAutoTable, getLastAutoTableY } from '../pdfAutoTable';
import {
  SWAN_PDF_BRAND,
  addBrandFooter,
  addBrandHeader,
  addPageIfNeeded,
  addSectionTitle,
  addWrappedText,
  createSwanPdfDoc,
} from './swanPdfKit';
import { resolveBrandIdentity } from './brandIdentity';

export interface ProgressReportRow {
  label: string;
  value: string;
  detail?: string;
}

export interface ProgressReportSection {
  title: string;
  subtitle?: string;
  rows: ProgressReportRow[];
}

export interface ProgressReportInput {
  clientName: string;
  generatedOnLabel: string;
  sections: ProgressReportSection[];
  /** Client's source — drives white-label branding (move_fitness -> Move Fitness only). */
  clientSource?: string | null;
}

const safeFilenamePart = (value: string): string =>
  value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'Client';

export const renderProgressReportPdf = (doc: PdfDoc, input: ProgressReportInput): Blob => {
  const pageW = doc.internal.pageSize.getWidth();
  const brand = resolveBrandIdentity(input.clientSource);
  let y = addBrandHeader(doc, { docLabel: 'PROGRESS REPORT', metaLine: input.clientName }, brand);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SWAN_PDF_BRAND.muted);
  y = addWrappedText(doc, `Generated ${input.generatedOnLabel}`, 16, y, pageW - 32, 4.5);
  y += 2;

  const printable = input.sections.filter((section) => section.rows.length > 0);
  if (printable.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...SWAN_PDF_BRAND.ink);
    addWrappedText(
      doc,
      'No logged training data in this window yet - the report fills in as workouts are logged.',
      16,
      y,
      pageW - 32,
    );
  }

  printable.forEach((section) => {
    y = addPageIfNeeded(doc, y, 26);
    y = addSectionTitle(doc, section.title, y);
    if (section.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...SWAN_PDF_BRAND.muted);
      y = addWrappedText(doc, section.subtitle, 16, y, pageW - 32, 4);
    }
    const hasDetail = section.rows.some((row) => Boolean(row.detail));
    addAutoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [hasDetail ? ['', 'Value', 'Detail'] : ['', 'Value']],
      body: section.rows.map((row) =>
        hasDetail ? [row.label, row.value, row.detail ?? ''] : [row.label, row.value],
      ),
      styles: { font: 'helvetica', fontSize: 8, textColor: SWAN_PDF_BRAND.ink, cellPadding: 1.6 },
      headStyles: { fillColor: SWAN_PDF_BRAND.royal, textColor: SWAN_PDF_BRAND.white, fontSize: 7.5 },
      alternateRowStyles: { fillColor: [244, 248, 252] },
      theme: 'striped',
    });
    y = getLastAutoTableY(doc, y) + 8;
  });

  addBrandFooter(doc, brand);
  return doc.output('blob');
};

export const buildProgressReportPdfFile = async (input: ProgressReportInput): Promise<File | null> => {
  if (typeof File === 'undefined') return null;
  const doc = await createSwanPdfDoc();
  const blob = renderProgressReportPdf(doc, input);
  const brand = resolveBrandIdentity(input.clientSource);
  const filename = `${brand.filenamePrefix}-Progress-Report-${safeFilenamePart(input.clientName)}.pdf`;
  return new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
};

/**
 * Approval Vault payload (A3): the exact bytes to preview AND download, plus the
 * resolved brand wordmark for the vault's branding-safety chip. Preview == print.
 */
export const buildProgressReportPdfPreview = async (
  input: ProgressReportInput,
): Promise<{ blob: Blob; filename: string; brandWordmark: string } | null> => {
  const file = await buildProgressReportPdfFile(input);
  if (!file) return null;
  return { blob: file, filename: file.name, brandWordmark: resolveBrandIdentity(input.clientSource).wordmark };
};

export const downloadProgressReportPdf = async (input: ProgressReportInput): Promise<boolean> => {
  const file = await buildProgressReportPdfFile(input);
  if (!file || typeof document === 'undefined') return false;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
};
