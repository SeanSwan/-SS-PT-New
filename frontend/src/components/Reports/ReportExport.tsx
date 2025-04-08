// File: frontend/src/components/Reports/ReportExport.ts
/**
 * ReportExport.ts
 *
 * Generates a multi-page PDF report with:
 *   - Page 1: Header image and a table of property intrusion data.
 *   - Page 2: Weekly graphs (chart image).
 *   - Page 3: Detailed report text and signature.
 *
 * Future enhancements:
 *   - Include custom footers, watermarks, or different paper sizes.
 *   - Use html2canvas to capture dynamic chart elements.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExportOptions {
  backgroundImage?: string;
  backgroundTheme?: string;
}

export const exportToPDF = (
  headerImage: string,
  propertyData: any[], // e.g., [{ type: string, count: number }, ...]
  chartImageData: string, // Base64 image string for the chart (if available)
  reportText: string,
  signature: string,
  options?: ExportOptions
) => {
  // Create a new PDF document (A4, portrait)
  const doc = new jsPDF('p', 'mm', 'a4');

  // PAGE 1: Header & Property Info
  // Add header image at the top (adjust coordinates and size as needed)
  doc.addImage(headerImage, 'JPEG', 10, 10, 190, 30);
  doc.setFontSize(16);
  doc.text('Property Information & Intrusion Data', 10, 50);

  // Use autoTable for the property data table.
  // We cast doc as any to avoid TypeScript errors since autoTable isn’t in the jsPDF types.
  (doc as any).autoTable({
    startY: 55,
    head: [['Intrusion Type', 'Count']],
    body: propertyData.map((item) => [item.type, item.count]),
    theme: 'striped',
  });

  // PAGE 2: Graphs
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Weekly Graphs', 10, 10);
  if (chartImageData) {
    doc.addImage(chartImageData, 'PNG', 10, 20, 190, 100);
  } else {
    doc.setFontSize(12);
    doc.text('Chart data not available', 10, 50);
  }

  // PAGE 3: Detailed Report & Signature
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Detailed Report', 10, 10);
  doc.setFontSize(12);
  const textLines = doc.splitTextToSize(reportText, 190);
  doc.text(textLines, 10, 20);

  // Add signature at the bottom.
  doc.text(`Signature: ${signature}`, 10, 280);

  // (Optional) Future Enhancement: Use options.backgroundImage/backgroundTheme to further style the PDF.

  // Save the PDF.
  doc.save('Report.pdf');
};
