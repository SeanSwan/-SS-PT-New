import React, { useRef, useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import styled from 'styled-components';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { FileText, Download, Eye, Send } from 'lucide-react';
import { ThemeSettings, PropertyDataItem, DailyReport } from '../../types/reports';

// Add the missing type augmentation for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Styled components for PDF preview
const PreviewContainer = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
`;

const PreviewTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PDFPreview = styled.div`
  width: 100%;
  max-width: 210mm; /* A4 width */
  margin: 0 auto;
  padding: 15px;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  position: relative;
  min-height: 297mm; /* A4 height */
  transform-origin: top left;
  transform: scale(0.75);
  overflow: hidden;

  @media (max-width: 768px) {
    transform: scale(0.6);
  }
`;

const PageCounter = styled.div`
  position: absolute;
  bottom: 10mm;
  right: 10mm;
  font-size: 10px;
  color: #666;
`;

const PageBreak = styled.div`
  page-break-after: always;
  height: 0;
  margin: 0;
  border: 0;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #0070f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
`;

const StatusText = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  color: #666;
`;

const QRCodePlaceholder = styled.div`
  width: 80px;
  height: 80px;
  background-color: #e0e0e0;
  margin: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #666;
`;

// Preview message watermark
const PreviewMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  background-color: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.3);
  padding: 5px 20px;
  font-size: 36px;
  font-weight: bold;
  z-index: 5;
  pointer-events: none;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 5px;
`;

// PDF Export Container (hidden)
const ExportContainer = styled.div`
  display: none;
  position: absolute;
  left: -9999px;
  width: 210mm; /* A4 width */
  background-color: white;
  padding: 0;
  margin: 0;
`;

// Preview Content Styled Components
const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const LogoContainer = styled.div`
  width: 80px;
  height: 50px;
  
  img {
    max-width: 100%;
    max-height: 100%;
  }
`;

const HeaderContent = styled.div`
  text-align: center;
  flex: 1;
`;

const ReportTitle = styled.h1<{ color: string }>`
  color: ${props => props.color};
  font-size: 24px;
  margin: 0 0 5px;
`;

const ReportSubtitle = styled.div`
  font-size: 14px;
`;

const LineSeparator = styled.div<{ color: string }>`
  height: 2px;
  background-color: ${props => props.color};
  margin: 0 0 20px;
`;

const SectionContainer = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2<{ color: string }>`
  color: ${props => props.color};
  font-size: 18px;
  margin-bottom: 10px;
`;

const MetricsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

const TableHeader = styled.tr<{ bgColor: string }>`
  background-color: ${props => props.bgColor};
  color: white;
  
  th {
    padding: 8px;
    text-align: left;
    border: 1px solid #ddd;
  }
`;

const TableRow = styled.tr<{ isEven: boolean }>`
  background-color: ${props => props.isEven ? '#f8f9fa' : 'white'};
  
  td {
    padding: 8px;
    border: 1px solid #ddd;
  }
`;

const ChartContainer = styled.div`
  text-align: center;
  
  img {
    max-width: 100%;
    height: auto;
    max-height: 200px;
  }
`;

const ReportItem = styled.div`
  margin-bottom: 15px;
`;

const ReportItemTitle = styled.h3<{ color: string }>`
  color: ${props => props.color};
  font-size: 14px;
  margin-bottom: 5px;
`;

const ReportContent = styled.p`
  font-size: 12px;
  margin: 0;
  line-height: 1.5;
`;

const MoreIndicator = styled.div`
  font-size: 12px;
  font-style: italic;
  color: #666;
`;

const NotesText = styled.p`
  font-size: 12px;
  margin: 0 0 15px;
  line-height: 1.5;
`;

const VideoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;

const VideoItem = styled.div`
  width: 45%;
`;

const VideoTitle = styled.div`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const VideoExpiry = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
`;

const SignatureSection = styled.div`
  margin-top: 40px;
  font-size: 12px;
`;

const SignatureName = styled.span`
  font-weight: bold;
  border-bottom: 1px solid #666;
  padding-bottom: 2px;
`;

const SignatureDate = styled.div`
  margin-top: 5px;
`;

const Footer = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  font-size: 10px;
  color: #666;
  display: flex;
  justify-content: space-between;
  padding: 0 15px;
`;

interface EnhancedPDFGeneratorProps {
  reportTitle: string;
  leftLogo?: string;
  rightLogo?: string;
  backgroundImage?: string;
  backgroundOpacity: number;
  themeSettings: ThemeSettings;
  propertyData: PropertyDataItem[];
  chartImageURL: string;
  dailyReports: DailyReport[];
  summaryNotes: string;
  signature: string;
  dateRange: { start: Date; end: Date };
  clientName: string;
  videoLinks?: Array<{ url: string; title: string; expiryDate: Date }>;
  onSend?: (pdfBlob: Blob) => Promise<void>;
}

/**
 * Enhanced PDF Generator component for professional security reports
 * 
 * Features:
 * - Custom header with logos and branding
 * - Security metrics summary tables
 * - Data visualization charts
 * - Daily security reports with formatting
 * - Secure video links with QR codes
 * - Proper page breaks and pagination
 * - Interactive preview before generation
 * - Download and send options
 */
const EnhancedPDFGenerator: React.FC<EnhancedPDFGeneratorProps> = ({
  reportTitle,
  leftLogo,
  rightLogo,
  backgroundImage,
  backgroundOpacity,
  themeSettings,
  propertyData,
  chartImageURL,
  dailyReports,
  summaryNotes,
  signature,
  dateRange,
  clientName,
  videoLinks = [],
  onSend
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Format the date range for display
  const formattedDateRange = `${format(dateRange.start, 'MMMM d')} - ${format(dateRange.end, 'MMMM d, yyyy')}`;

  // Helper function to convert hex color to RGB array for jsPDF
  const hexToRgb = useCallback((hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ]
      : [0, 112, 243]; // Default blue
  }, []);

  // Generate QR code for video links (placeholder function)
  const generateQRCode = useCallback((url: string) => {
    // In a real implementation, you would use a QR code generation library
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;
  }, []);

  /**
   * Generate PDF document with all report elements
   * @returns Promise with PDF blob
   */
  const generatePDF = useCallback(async (): Promise<Blob | null> => {
    setIsGenerating(true);

    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set default font
      doc.setFont('helvetica', 'normal');

      // Constants for page layout
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      // Helper function to add headers to each page
      const addHeader = (pageNum: number) => {
        // Add background image if provided
        if (backgroundImage) {
          try {
            doc.addImage(
              backgroundImage,
              'JPEG',
              0,
              0,
              pageWidth,
              pageHeight,
              'bg',
              'FAST',
              backgroundOpacity
            );
          } catch (error) {
            console.error('Error adding background image:', error);
          }
        }
        
        // Add left logo if provided
        if (leftLogo) {
          try {
            doc.addImage(
              leftLogo,
              'JPEG',
              margin,
              margin,
              25,
              15,
              'leftLogo',
              'FAST'
            );
          } catch (error) {
            console.error('Error adding left logo:', error);
          }
        }
        
        // Add right logo if provided
        if (rightLogo) {
          try {
            doc.addImage(
              rightLogo,
              'JPEG',
              pageWidth - margin - 25,
              margin,
              25,
              15,
              'rightLogo',
              'FAST'
            );
          } catch (error) {
            console.error('Error adding right logo:', error);
          }
        }
        
        // Add title
        doc.setFontSize(20);
        doc.setTextColor(themeSettings.primaryColor || '#0070f3');
        doc.text(reportTitle, pageWidth / 2, margin + 20, { align: 'center' });
        
        // Add client name and date range
        doc.setFontSize(12);
        doc.setTextColor('#333333');
        doc.text(`${clientName} - ${formattedDateRange}`, pageWidth / 2, margin + 28, { align: 'center' });
        
        // Add page number
        doc.setFontSize(8);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        
        // Add line separator
        doc.setDrawColor(themeSettings.primaryColor || '#0070f3');
        doc.setLineWidth(0.5);
        doc.line(margin, margin + 32, pageWidth - margin, margin + 32);
      };

      // Add first page
      let currentPage = 1;
      addHeader(currentPage);

      // Add property data section
      let yPos = margin + 40;

      doc.setFontSize(14);
      doc.setTextColor(themeSettings.primaryColor || '#0070f3');
      doc.text('Security Metrics Summary', margin, yPos);
      yPos += 8;

      // Add property data table
      if (propertyData.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['Metric', 'Value']],
          body: propertyData.map(item => [item.type, item.count]),
          theme: 'striped',
          headStyles: {
            fillColor: themeSettings.primaryColor ? hexToRgb(themeSettings.primaryColor) : [0, 112, 243],
            textColor: [255, 255, 255]
          },
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Add chart if available
      if (chartImageURL) {
        // Check if we need a new page
        if (yPos + 100 > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          yPos = margin + 40;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(themeSettings.primaryColor || '#0070f3');
        doc.text('Security Activity Visualization', margin, yPos);
        yPos += 8;
        
        try {
          doc.addImage(
            chartImageURL,
            'PNG',
            margin,
            yPos,
            contentWidth,
            80
          );
          
          yPos += 85;
        } catch (error) {
          console.error('Error adding chart image:', error);
          yPos += 10; // Add a small gap if chart fails to load
        }
      }

      // Add daily reports section
      // Check if we need a new page
      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        currentPage++;
        addHeader(currentPage);
        yPos = margin + 40;
      }

      doc.setFontSize(14);
      doc.setTextColor(themeSettings.primaryColor || '#0070f3');
      doc.text('Daily Security Reports', margin, yPos);
      yPos += 8;

      // Add each daily report
      for (const report of dailyReports) {
        if (report.content) {
          // Check if we need a new page
          if (yPos + 40 > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            addHeader(currentPage);
            yPos = margin + 40;
          }
          
          doc.setFontSize(12);
          doc.setTextColor(themeSettings.primaryColor || '#0070f3');
          doc.text(`${report.day} (${report.securityCode || 'Code 4'})`, margin, yPos);
          yPos += 6;
          
          doc.setFontSize(10);
          doc.setTextColor('#333333');
          const splitContent = doc.splitTextToSize(report.content, contentWidth);
          
          // Check if content will fit on current page
          if (yPos + splitContent.length * 5 > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            addHeader(currentPage);
            yPos = margin + 40;
            
            doc.setFontSize(12);
            doc.setTextColor(themeSettings.primaryColor || '#0070f3');
            doc.text(`${report.day} (${report.securityCode || 'Code 4'}) (continued)`, margin, yPos);
            yPos += 6;
            
            doc.setFontSize(10);
            doc.setTextColor('#333333');
          }
          
          doc.text(splitContent, margin, yPos);
          yPos += splitContent.length * 5 + 8;
        }
      }

      // Add summary notes if provided
      if (summaryNotes) {
        // Check if we need a new page
        if (yPos + 40 > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          yPos = margin + 40;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(themeSettings.primaryColor || '#0070f3');
        doc.text('Additional Notes & Compliance', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor('#333333');
        const splitSummary = doc.splitTextToSize(summaryNotes, contentWidth);
        
        // Check if summary will fit on current page
        if (yPos + splitSummary.length * 5 > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          yPos = margin + 40;
        }
        
        doc.text(splitSummary, margin, yPos);
        yPos += splitSummary.length * 5 + 10;
      }

      // Add video links section if available
      if (videoLinks.length > 0) {
        // Check if we need a new page
        if (yPos + 50 > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          yPos = margin + 40;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(themeSettings.primaryColor || '#0070f3');
        doc.text('Secure Video Evidence', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor('#333333');
        doc.text('Scan QR codes to view secure videos. Links expire for security reasons.', margin, yPos);
        yPos += 8;
        
        for (const video of videoLinks) {
          // Check if we need a new page
          if (yPos + 30 > pageHeight - margin) {
            doc.addPage();
            currentPage++;
            addHeader(currentPage);
            yPos = margin + 40;
          }
          
          // Add video title
          doc.setFontSize(11);
          doc.setTextColor('#333333');
          doc.text(video.title, margin, yPos);
          yPos += 5;
          
          // Add expiry info
          doc.setFontSize(9);
          doc.setTextColor('#666666');
          doc.text(`Expires: ${format(video.expiryDate, 'MMM d, yyyy h:mm a')}`, margin, yPos);
          yPos += 5;
          
          // Add QR code
          try {
            const qrCode = generateQRCode(video.url);
            doc.addImage(qrCode, 'PNG', margin, yPos, 20, 20);
          } catch (error) {
            console.error('Error adding QR code:', error);
          }
          
          // Add URL text
          doc.setFontSize(8);
          doc.text(video.url, margin + 25, yPos + 10);
          
          yPos += 25;
        }
      }

      // Add signature if provided
      if (signature) {
        // Check if we need a new page
        if (yPos + 20 > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          yPos = margin + 40;
        }
        
        doc.setFontSize(10);
        doc.setTextColor('#333333');
        doc.text('Security Operations Manager:', margin, yPos);
        doc.text(signature, margin + 50, yPos);
        
        // Add date
        yPos += 6;
        doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, margin, yPos);
      }

      // Add footer with generated timestamp on all pages
      for (let i = 1; i <= currentPage; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#666666');
        doc.text(
          `Report generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
          margin,
          pageHeight - 10
        );

        // Add company info in footer
        doc.text(
          'Security System - Professional Monitoring Services',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Generate blob
      const blob = doc.output('blob');
      setPdfBlob(blob);
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [
    backgroundImage, 
    backgroundOpacity, 
    leftLogo, 
    rightLogo, 
    themeSettings, 
    reportTitle, 
    clientName, 
    formattedDateRange, 
    propertyData, 
    chartImageURL, 
    dailyReports, 
    summaryNotes, 
    signature, 
    videoLinks, 
    hexToRgb, 
    generateQRCode, 
    toast
  ]);

  // Handle download PDF
  const handleDownloadPDF = useCallback(async () => {
    try {
      setIsGenerating(true);
      
      // If we already have a PDF blob, use it; otherwise generate a new one
      const blob = pdfBlob || await generatePDF();
      
      if (blob) {
        // Create a download link and trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientName.replace(/\s+/g, '-')}-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: 'Success',
          description: 'PDF report downloaded successfully',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download PDF report',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [clientName, generatePDF, pdfBlob, toast]);

  // Handle send PDF
  const handleSendPDF = useCallback(async () => {
    if (!onSend) {
      toast({
        title: 'Error',
        description: 'Send function not provided',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // If we already have a PDF blob, use it; otherwise generate a new one
      const blob = pdfBlob || await generatePDF();
      
      if (blob) {
        await onSend(blob);
        
        toast({
          title: 'Success',
          description: 'PDF report sent successfully',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error sending PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to send PDF report',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [generatePDF, onSend, pdfBlob, toast]);

  // Toggle PDF preview
  const handleTogglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
    if (showPreview) {
      setPdfBlob(null);
    }
  }, [showPreview]);

  // Render preview content
  const renderPreviewContent = useCallback(() => {
    // For preview, only show max 2 reports and videos
    const previewReports = dailyReports.slice(0, 2);
    const previewVideos = videoLinks.slice(0, 2);
    const primaryColor = themeSettings.primaryColor || '#0070f3';
    
    return (
      <>
        {/* Header */}
        <HeaderContainer>
          {leftLogo && (
            <LogoContainer>
              <img src={leftLogo} alt="Left logo" />
            </LogoContainer>
          )}
          
          <HeaderContent>
            <ReportTitle color={primaryColor}>
              {reportTitle}
            </ReportTitle>
            <ReportSubtitle>
              {clientName} - {formattedDateRange}
            </ReportSubtitle>
          </HeaderContent>
          
          {rightLogo && (
            <LogoContainer>
              <img src={rightLogo} alt="Right logo" />
            </LogoContainer>
          )}
        </HeaderContainer>
        
        {/* Line separator */}
        <LineSeparator color={primaryColor} />
        
        {/* Property data */}
        <SectionContainer>
          <SectionTitle color={primaryColor}>
            Security Metrics Summary
          </SectionTitle>
          
          <MetricsTable>
            <thead>
              <TableHeader bgColor={primaryColor}>
                <th>Metric</th>
                <th>Value</th>
              </TableHeader>
            </thead>
            <tbody>
              {propertyData.map((item, index) => (
                <TableRow key={index} isEven={index % 2 === 0}>
                  <td>{item.type}</td>
                  <td>{item.count}</td>
                </TableRow>
              ))}
            </tbody>
          </MetricsTable>
        </SectionContainer>
        
        {/* Chart */}
        {chartImageURL && (
          <SectionContainer>
            <SectionTitle color={primaryColor}>
              Security Activity Visualization
            </SectionTitle>
            
            <ChartContainer>
              <img 
                src={chartImageURL} 
                alt="Security activity chart" 
              />
            </ChartContainer>
          </SectionContainer>
        )}
        
        {/* Daily reports */}
        <SectionContainer>
          <SectionTitle color={primaryColor}>
            Daily Security Reports
          </SectionTitle>
          
          {previewReports.map((report, index) => (
            <ReportItem key={index}>
              <ReportItemTitle color={primaryColor}>
                {report.day} ({report.securityCode || 'Code 4'})
              </ReportItemTitle>
              <ReportContent>
                {report.content && report.content.length > 150 
                  ? `${report.content.substring(0, 150)}...` 
                  : report.content}
              </ReportContent>
            </ReportItem>
          ))}
          
          {dailyReports.length > 2 && (
            <MoreIndicator>
              + {dailyReports.length - 2} more daily reports in full PDF
            </MoreIndicator>
          )}
        </SectionContainer>
        
        <PageBreak />
        
        {/* Second page preview */}
        <SectionContainer>
          <SectionTitle color={primaryColor}>
            Additional Notes & Compliance
          </SectionTitle>
          
          <NotesText>
            {summaryNotes && summaryNotes.length > 200 
              ? `${summaryNotes.substring(0, 200)}...` 
              : summaryNotes}
          </NotesText>
          
          {/* Video links preview */}
          {videoLinks.length > 0 && (
            <SectionContainer>
              <SectionTitle color={primaryColor}>
                Secure Video Evidence
              </SectionTitle>
              
              <NotesText>
                Scan QR codes to view secure videos. Links expire for security reasons.
              </NotesText>
              
              <VideoGrid>
                {previewVideos.map((video, index) => (
                  <VideoItem key={index}>
                    <VideoTitle>
                      {video.title}
                    </VideoTitle>
                    <VideoExpiry>
                      Expires: {format(video.expiryDate, 'MMM d, yyyy h:mm a')}
                    </VideoExpiry>
                    <QRCodePlaceholder>QR Code</QRCodePlaceholder>
                  </VideoItem>
                ))}
              </VideoGrid>
              
              {videoLinks.length > 2 && (
                <MoreIndicator>
                  + {videoLinks.length - 2} more video links in full PDF
                </MoreIndicator>
              )}
            </SectionContainer>
          )}
          
          {/* Signature */}
          {signature && (
            <SignatureSection>
              <span>Security Operations Manager: </span>
              <SignatureName>
                {signature}
              </SignatureName>
              <SignatureDate>
                Date: {format(new Date(), 'MMMM d, yyyy')}
              </SignatureDate>
            </SignatureSection>
          )}
        </SectionContainer>
        
        {/* Footer */}
        <Footer>
          <div>Report generated: {format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          <div>Security System - Professional Monitoring Services</div>
        </Footer>
        
        <PageCounter>Page 1 of 2</PageCounter>
        <PreviewMessage>PREVIEW</PreviewMessage>
      </>
    );
  }, [
    leftLogo,
    rightLogo,
    themeSettings,
    reportTitle,
    clientName,
    formattedDateRange,
    propertyData,
    chartImageURL,
    dailyReports,
    summaryNotes,
    videoLinks,
    signature
  ]);

  // Create a PDF preview component that resembles the actual PDF
  const renderPDFPreview = useCallback(() => {
    return (
      <PreviewContainer>
        <PreviewTitle>
          <FileText size={20} />
          PDF Preview
        </PreviewTitle>

        <PDFPreview ref={previewRef}>
          {isGenerating && <LoadingOverlay />}
          {renderPreviewContent()}
        </PDFPreview>
        
        <ButtonContainer>
          <Button onClick={handleTogglePreview} variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Close Preview
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {onSend && (
            <Button onClick={handleSendPDF} disabled={isGenerating}>
              <Send className="mr-2 h-4 w-4" />
              Send Report
            </Button>
          )}
        </ButtonContainer>
      </PreviewContainer>
    );
  }, [handleDownloadPDF, handleSendPDF, handleTogglePreview, isGenerating, onSend, renderPreviewContent]);

  return (
    <div>
      {!showPreview ? (
        <ButtonContainer>
          <Button onClick={handleTogglePreview} variant="outline" disabled={isGenerating}>
            <Eye className="mr-2 h-4 w-4" />
            Preview PDF
          </Button>
          
          <Button onClick={handleDownloadPDF} disabled={isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          
          {onSend && (
            <Button onClick={handleSendPDF} disabled={isGenerating}>
              <Send className="mr-2 h-4 w-4" />
              Send Report
            </Button>
          )}
          
          {isGenerating && (
            <StatusText>
              Generating PDF...
            </StatusText>
          )}
        </ButtonContainer>
      ) : (
        renderPDFPreview()
      )}
      
      {/* Hidden container for export - not visible to users */}
      <ExportContainer ref={exportRef} />
    </div>
  );
};

export default EnhancedPDFGenerator;