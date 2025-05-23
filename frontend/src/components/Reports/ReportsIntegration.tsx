// File: frontend/src/components/Reports2/ReportsIntegration.tsx

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { toast } from '../../hooks/use-toast';
import html2canvas from 'html2canvas';

// Import all enhanced components
import EnhancedPreviewPanel from '../Reports/PreviewPanel';
import EnhancedDataVisualizationPanel from '../Reports/DataVisualization';
import EnhancedDailyReportsPanel from '../Reports/DailyReportsPanel';
import AIReportAssistant from '../Reports/AIReportAssistant';
import MediaManagementSystem from './MediaManagementSystem';
import DualLogoHeaderCustomizer from '../Reports/DualLogoHeaderCustomizer';
import QuickIncidentReport from './QuickIncidentReport';
import AdvancedReportDelivery from '../Reports/ReportDelivery';

// Define and export updated types
export type DailyReportStatus = 'To update' | 'In progress' | 'Completed' | 'Needs review';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  reportTitle?: string; // Added reportTitle property
  backgroundOpacity?: number; // Added backgroundOpacity property
}

export interface AIOptions {
  enabled: boolean;
  autoCorrect?: boolean; // Added autoCorrect property
  enhanceWriting?: boolean;
  suggestContent?: boolean;
  generateSummary?: boolean;
  suggestImprovements?: boolean;
  analyzeThreats?: boolean;
  highlightPatterns?: boolean;
}

export interface DailyReport {
  day: string;
  content: string;
  status: DailyReportStatus | string; // Allow both DailyReportStatus and string
  securityCode: string;
}

export interface ClientData {
  id?: string;
  name: string;
  siteName?: string;
  location?: string;
  contactEmail?: string;
}

export interface MetricsData {
  humanIntrusions: Record<string, number>;
  vehicleIntrusions: Record<string, number>;
  totalCameras: number;
  camerasOnline: number;
  potentialThreats: number;
  proactiveAlerts: number;
  aiAccuracy: number;
  responseTime: number;
  totalMonitoringHours: number;
  operationalUptime: number;
}

export interface DeliveryOptions {
  email: boolean;
  sms: boolean;
  emailRecipients: string[];
  smsRecipients: string[];
  scheduleDelivery: boolean;
  deliveryDate: Date;
  includeFullData: boolean;
  includeCharts: boolean;
}

export interface VideoLink {
  url: string;
  title: string;
  expiryDate: string | Date;
}

export interface MediaFile {
  url: string;
  name: string;
  type: string;
  thumbnail?: string;
}

// Styled components with responsive design
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  
  @media (min-width: 1024px) {
    grid-template-columns: 3fr 2fr;
  }
`;

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  
  @media (max-width: 1023px) {
    grid-row: 1;
  }
`;

const Section = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  
  @media (max-width: 640px) {
    padding: 1rem;
  }
`;

const FloatingToolbar = styled.div`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 1rem;
  z-index: 50;
  
  @media (max-width: 640px) {
    bottom: 1rem;
    right: 1rem;
    flex-direction: column;
  }
`;

const FloatingButton = styled.button<{ color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: ${props => props.color || '#0070f3'};
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  @media (max-width: 640px) {
    width: 48px;
    height: 48px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  height: 30px;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0070f3;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface ReportsIntegrationProps {
  client: ClientData | null;
  dateRange: { start: Date; end: Date };
  onSave?: (reportData: any) => Promise<any>;
  onSend?: (reportData: any, deliveryOptions: DeliveryOptions) => Promise<any>;
  initialMetrics?: Partial<MetricsData>;
  initialDailyReports?: DailyReport[];
  initialSummaryNotes?: string;
  initialSignature?: string;
  initialAIOptions?: Partial<AIOptions>;
  initialThemeSettings?: Partial<ThemeSettings>;
  initialMediaFiles?: MediaFile[];
  initialVideoLinks?: VideoLink[];
  onIncidentReport?: (incidentData: any) => Promise<any>;
}

/**
 * Reports Integration Component
 * 
 * A comprehensive integration module that brings all enhanced reporting components together
 * to create a seamless, professional reporting system.
 */
const ReportsIntegration: React.FC<ReportsIntegrationProps> = ({
  client,
  dateRange,
  onSave,
  onSend,
  initialMetrics,
  initialDailyReports,
  initialSummaryNotes = '',
  initialSignature = '',
  initialAIOptions,
  initialThemeSettings,
  initialMediaFiles = [],
  initialVideoLinks = [],
  onIncidentReport,
}) => {
  // References
  const chartRef = useRef<HTMLDivElement>(null);
  
  // State for metrics data
  const [metrics, setMetrics] = useState<MetricsData>({
    humanIntrusions: {
      Monday: 5,
      Tuesday: 7,
      Wednesday: 4,
      Thursday: 6,
      Friday: 8,
      Saturday: 3,
      Sunday: 2
    },
    vehicleIntrusions: {
      Monday: 3,
      Tuesday: 2,
      Wednesday: 4,
      Thursday: 5,
      Friday: 4,
      Saturday: 2,
      Sunday: 1
    },
    totalCameras: 12,
    camerasOnline: 12,
    potentialThreats: 3,
    proactiveAlerts: 8,
    aiAccuracy: 98.5,
    responseTime: 20,
    totalMonitoringHours: 168,
    operationalUptime: 99.9,
    ...initialMetrics
  });
  
  // State for daily reports
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    if (initialDailyReports && initialDailyReports.length) {
      return initialDailyReports;
    }
    
    return [
      { day: 'Monday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Tuesday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Wednesday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Thursday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Friday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Saturday', content: '', status: 'To update', securityCode: 'Code 4' },
      { day: 'Sunday', content: '', status: 'To update', securityCode: 'Code 4' }
    ];
  });
  
  // State for summary notes and signature
  const [summaryNotes, setSummaryNotes] = useState<string>(initialSummaryNotes);
  const [signature, setSignature] = useState<string>(initialSignature);
  const [contactEmail, setContactEmail] = useState<string>(client?.contactEmail || '');
  
  // State for media and visualization
  const [chartDataURL, setChartDataURL] = useState<string>('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMediaFiles);
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>(initialVideoLinks);
  
  // State for theme and design
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    primaryColor: '#0070f3',
    secondaryColor: '#ffffff',
    accentColor: '#f5a623',
    fontFamily: 'Arial, sans-serif',
    reportTitle: 'Security Operations Report',
    backgroundOpacity: 0.7,
    ...initialThemeSettings
  });
  const [leftLogo, setLeftLogo] = useState<string | undefined>(undefined);
  const [rightLogo, setRightLogo] = useState<string | undefined>(undefined);
  const [headerImage, setHeaderImage] = useState<string | undefined>(undefined);
  
  // State for AI and delivery options
  const [aiOptions, setAIOptions] = useState<AIOptions>({
    enabled: true,
    autoCorrect: true,
    enhanceWriting: true,
    suggestContent: true,
    generateSummary: true,
    suggestImprovements: true,
    analyzeThreats: true,
    highlightPatterns: true,
    ...initialAIOptions
  });
  
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOptions>({
    email: true,
    sms: false,
    emailRecipients: client?.contactEmail ? [client.contactEmail] : [],
    smsRecipients: [],
    scheduleDelivery: false,
    deliveryDate: new Date(),
    includeFullData: true,
    includeCharts: true,
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showIncidentReport, setShowIncidentReport] = useState<boolean>(false);
  const [showDeliveryOptions, setShowDeliveryOptions] = useState<boolean>(false);
  
  // Update contact email when client changes
  useEffect(() => {
    if (client?.contactEmail) {
      setContactEmail(client.contactEmail);
      
      // Also update delivery options with the new email
      setDeliveryOptions(prev => ({
        ...prev,
        emailRecipients: [client.contactEmail as string]
      }));
    }
  }, [client]);
  
  // Handle metrics changes
  const handleMetricsChange = (updatedMetrics: Partial<MetricsData>) => {
    setMetrics(prev => ({ ...prev, ...updatedMetrics }));
  };
  
  // Handle daily report changes
  const handleReportChange = (day: string, content: string, status?: string, securityCode?: string) => {
    setDailyReports(prev => 
      prev.map(report => 
        report.day === day 
          ? { 
              ...report, 
              content, 
              status: status || report.status,
              securityCode: securityCode || report.securityCode
            } 
          : report
      )
    );
  };
  
  // Handle theme changes
  const handleThemeChange = (settings: Partial<ThemeSettings>) => {
    setThemeSettings(prev => ({ ...prev, ...settings }));
  };
  
  // Handle header customization
  const handleHeaderUpdate = (values: any) => {
    setLeftLogo(values.leftLogo);
    setRightLogo(values.rightLogo);
    setHeaderImage(values.backgroundImage);
    setThemeSettings(prev => ({
      ...prev,
      primaryColor: values.textColor || prev.primaryColor,
      secondaryColor: values.backgroundColor || prev.secondaryColor,
      accentColor: values.accentColor || prev.accentColor,
      fontFamily: values.fontFamily || prev.fontFamily,
      backgroundOpacity: values.backgroundOpacity || prev.backgroundOpacity,
      reportTitle: values.reportTitle || prev.reportTitle
    }));
  };
  
  // Handle AI options changes
  const handleAIOptionChange = (options: Partial<AIOptions>) => {
    setAIOptions(prev => ({ ...prev, ...options }));
  };
  
  // Handle delivery options changes
  const handleDeliveryOptionsChange = (options: Partial<DeliveryOptions>) => {
    setDeliveryOptions(prev => ({ ...prev, ...options }));
  };
  
  // Handle media selection
  const handleMediaSelect = (media: MediaFile[]) => {
    setMediaFiles(media);
    
    // Extract video links with expiry
    const videos = media.filter(item => item.type === 'video').map(video => ({
      url: video.url,
      title: video.name,
      // Set expiry to 7 days from now
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    setVideoLinks(videos);
  };
  
  // Generate PDF report
  const generatePDF = async () => {
    if (!client) {
      toast({
        title: 'Missing Client Information',
        description: 'Client information is required to generate a PDF',
        variant: 'destructive'
      });
      return null;
    }
    
    setIsLoading(true);
    
    try {
      // Create PDF document with A4 size
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add header
      if (headerImage) {
        pdf.addImage(headerImage, 'JPEG', 0, 0, 210, 40);
        
        // Add semi-transparent overlay to ensure text readability
        pdf.setFillColor(0, 0, 0);
        const opacity = themeSettings.backgroundOpacity || 0.5;
        // Correct way to use GState - call as a method, not with new
        pdf.setFillColor(0, 0, 0);
        const gState = pdf.GState({ opacity: opacity });
        pdf.setGState(gState);
        pdf.rect(0, 0, 210, 40, 'F');
        // Reset opacity
        pdf.setGState(pdf.GState({ opacity: 1 }));
      } else {
        // Create a colored header background if no image
        const primary = themeSettings.primaryColor ? hexToRgb(themeSettings.primaryColor) : { r: 0, g: 112, b: 243 };
        pdf.setFillColor(primary.r, primary.g, primary.b);
        pdf.rect(0, 0, 210, 40, 'F');
      }
      
      // Add logos if available
      if (leftLogo) {
        pdf.addImage(leftLogo, 'PNG', 10, 5, 30, 30);
      }
      
      if (rightLogo) {
        pdf.addImage(rightLogo, 'PNG', 170, 5, 30, 30);
      }
      
      // Add report title and date range
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(themeSettings.reportTitle || 'Security Operations Report', 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`, 105, 30, { align: 'center' });
      
      // Reset text color for content
      pdf.setTextColor(0, 0, 0);
      
      // Add client and site information
      let yPosition = 50;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Site & Monitoring Details', 10, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Site Name: ${client.siteName || client.name}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Location: ${client.location || 'N/A'}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Monitoring Period: ${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Total Cameras: ${metrics.totalCameras}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Operational Uptime: ${metrics.operationalUptime}%`, 15, yPosition);
      yPosition += 15;
      
      // Add chart if available
      if (chartDataURL) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Analytics & Insights', 10, yPosition);
        yPosition += 10;
        
        pdf.addImage(chartDataURL, 'PNG', 10, yPosition, 190, 100);
        yPosition += 110;
      }
      
      // Add daily reports
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Daily Security Reports', 10, yPosition);
      yPosition += 10;
      
      // Check if we need to add a new page
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Add each daily report
      dailyReports.forEach(report => {
        // Check if we need to add a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${report.day}:`, 15, yPosition);
        
        // Add security code
        if (report.securityCode) {
          const codeWidth = pdf.getTextWidth(report.securityCode);
          
          // Draw security code background
          const codeColor = getSecurityCodeColor(report.securityCode);
          pdf.setFillColor(codeColor.r, codeColor.g, codeColor.b);
          pdf.roundedRect(190 - codeWidth - 10, yPosition - 4, codeWidth + 8, 6, 1, 1, 'F');
          
          // Add security code text
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(report.securityCode, 190 - codeWidth / 2 - 2, yPosition - 1, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }
        
        yPosition += 8;
        
        // Add report content with word wrapping
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const contentLines = pdf.splitTextToSize(report.content || 'No report content.', 180);
        contentLines.forEach((line: string) => {
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.text(line, 15, yPosition);
          yPosition += 5;
        });
        
        yPosition += 10;
      });
      
      // Add summary notes
      if (summaryNotes) {
        // Check if we need to add a new page
        if (yPosition > 240) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Additional Notes & Compliance', 10, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const summaryLines = pdf.splitTextToSize(summaryNotes, 180);
        summaryLines.forEach((line: string) => {
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.text(line, 15, yPosition);
          yPosition += 5;
        });
        
        yPosition += 10;
      }
      
      // Add signature and contact information
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Contact Information', 10, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Preparer: ${signature || 'N/A'}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Contact Email: ${contactEmail || 'N/A'}`, 15, yPosition);
      yPosition += 7;
      
      pdf.text(`Report Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 15, yPosition);
      
      // Save the PDF if in save mode
      if (onSave) {
        const pdfOutput = pdf.output('datauristring');
        
        // Prepare data to save
        const reportData = {
          client,
          dateRange,
          metrics,
          dailyReports,
          summaryNotes,
          signature,
          contactEmail,
          themeSettings,
          leftLogo,
          rightLogo,
          headerImage,
          chartDataURL,
          mediaFiles,
          videoLinks,
          pdfOutput
        };
        
        // Call save handler
        await onSave(reportData);
      }
      
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save and download PDF
  const handleSaveAndDownload = async () => {
    if (!client) {
      toast({
        title: 'Missing Client Information',
        description: 'Client information is required to save the report',
        variant: 'destructive'
      });
      return;
    }
    
    const pdf = await generatePDF();
    
    if (pdf) {
      // Download the PDF
      pdf.save(`${client.name}-Security-Report-${format(dateRange.start, 'MMM-d')}-${format(dateRange.end, 'MMM-d-yyyy')}.pdf`);
      
      toast({
        title: 'Success',
        description: 'Report saved and downloaded successfully',
      });
    }
  };
  
  // Send report
  const handleSendReport = async () => {
    if (!client) {
      toast({
        title: 'Missing Client Information',
        description: 'Client information is required to send the report',
        variant: 'destructive'
      });
      return;
    }
    
    if (deliveryOptions.emailRecipients.length === 0 && deliveryOptions.smsRecipients.length === 0) {
      toast({
        title: 'Missing Recipients',
        description: 'Add at least one email or SMS recipient',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const pdf = await generatePDF();
      
      if (pdf && onSend) {
        // Prepare data to send
        const reportData = {
          client,
          dateRange,
          metrics,
          dailyReports,
          summaryNotes,
          signature,
          contactEmail,
          themeSettings,
          leftLogo,
          rightLogo,
          headerImage,
          chartDataURL,
          mediaFiles,
          videoLinks,
          pdfOutput: pdf.output('datauristring')
        };
        
        // Call send handler
        await onSend(reportData, deliveryOptions);
        
        toast({
          title: 'Success',
          description: 'Report sent successfully',
        });
        
        // Close delivery options panel
        setShowDeliveryOptions(false);
      }
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: 'Error',
        description: 'Failed to send report',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fixed: Handle incident report submission that matches the expected props
  const handleIncidentReportSubmit = () => {
    if (onIncidentReport) {
      try {
        // Submit with default data since QuickIncidentReport doesn't provide a way to pass data
        onIncidentReport({
          clientId: client?.id,
          timestamp: new Date().toISOString(),
          // Default values - the actual report content would be collected by the QuickIncidentReport component internally
          type: 'incident',
          status: 'new'
        });
        
        // Close the incident report panel
        setShowIncidentReport(false);
        
        toast({
          title: 'Success',
          description: 'Incident report submitted successfully',
        });
      } catch (error) {
        console.error('Error submitting incident report:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit incident report',
          variant: 'destructive'
        });
      }
    }
  };
  
  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse rgb values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
  };
  
  // Helper function to get security code color
  const getSecurityCodeColor = (code: string) => {
    switch(code) {
      case 'Code 4':
        return { r: 209, g: 250, b: 229 }; // Light green
      case 'Code 3':
        return { r: 255, g: 249, b: 196 }; // Light yellow
      case 'Code 2':
        return { r: 255, g: 204, b: 188 }; // Light orange
      case 'Code 1':
        return { r: 254, g: 202, b: 202 }; // Light red
      default:
        return { r: 224, g: 224, b: 224 }; // Light gray
    }
  };
  
  return (
    <>
      <Container>
        <MainPanel>
          <Section>
            <EnhancedDailyReportsPanel
              dailyReports={dailyReports}
              onReportChange={handleReportChange}
              dateRange={dateRange}
              summaryNotes={summaryNotes}
              onSummaryChange={setSummaryNotes}
              signature={signature}
              onSignatureChange={setSignature}
              aiOptions={aiOptions}
              onAIOptionChange={handleAIOptionChange}
              contactEmail={contactEmail}
              onContactEmailChange={setContactEmail}
            />
          </Section>
          
          <Section>
            <MediaManagementSystem
              onMediaSelect={handleMediaSelect}
              clientId={client?.id}
              reportId="current-report"
              initialMedia={mediaFiles}
            />
          </Section>
        </MainPanel>
        
        <SidePanel>
          <Section>
            <DualLogoHeaderCustomizer
              leftLogo={leftLogo}
              rightLogo={rightLogo}
              backgroundImage={headerImage}
              reportTitle={themeSettings.reportTitle || ''}
              clientName={client?.name || ''}
              backgroundColor={themeSettings.secondaryColor}
              textColor={themeSettings.primaryColor}
              accentColor={themeSettings.accentColor}
              fontFamily={themeSettings.fontFamily}
              backgroundOpacity={themeSettings.backgroundOpacity || 0.7}
              dateRange={dateRange}
              onUpdate={handleHeaderUpdate}
            />
          </Section>
          
          <Section>
            <EnhancedDataVisualizationPanel
              chartRef={chartRef}
              metrics={metrics}
              themeSettings={themeSettings}
              setChartDataURL={setChartDataURL}
              dateRange={dateRange}
            />
          </Section>
          
          <Section>
            <EnhancedPreviewPanel
              client={client}
              themeSettings={themeSettings}
              metrics={metrics}
              dailyReports={dailyReports}
              summaryNotes={summaryNotes}
              signature={signature}
              chartDataURL={chartDataURL}
              dateRange={dateRange}
              mediaFiles={mediaFiles}
              videoLinks={videoLinks}
              onExportPDF={generatePDF}
              backgroundColor={themeSettings.secondaryColor}
              textColor={themeSettings.primaryColor}
              leftLogo={leftLogo}
              rightLogo={rightLogo}
            />
          </Section>
        </SidePanel>
      </Container>
      
      {/* Floating action buttons */}
      <FloatingToolbar>
        <FloatingButton 
          onClick={() => setShowIncidentReport(!showIncidentReport)}
          color="#dc3545"
          title="Report Incident"
        >
          🚨
        </FloatingButton>
        
        <FloatingButton 
          onClick={() => setShowDeliveryOptions(!showDeliveryOptions)}
          color="#4caf50"
          title="Send Report"
        >
          📤
        </FloatingButton>
        
        <FloatingButton 
          onClick={handleSaveAndDownload}
          title="Save Report"
        >
          💾
        </FloatingButton>
      </FloatingToolbar>
      
      {/* Quick incident report */}
      {showIncidentReport && (
        <div style={{ 
          position: 'fixed', 
          bottom: '90px', 
          right: '20px', 
          width: '400px', 
          maxWidth: 'calc(100vw - 40px)',
          zIndex: 100, 
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          {/* Only pass the props that QuickIncidentReport actually accepts */}
          <QuickIncidentReport 
            clientId={client?.id}
            onReportSent={handleIncidentReportSubmit}
          />
          {/* Add our own close button since QuickIncidentReport doesn't accept onClose */}
          <CloseButton onClick={() => setShowIncidentReport(false)}>
            ✕
          </CloseButton>
        </div>
      )}
      
      {/* Delivery options */}
      {showDeliveryOptions && (
        <div style={{ 
          position: 'fixed', 
          bottom: '90px', 
          right: '20px', 
          width: '450px', 
          maxWidth: 'calc(100vw - 40px)',
          zIndex: 100, 
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          backgroundColor: 'white',
          overflow: 'hidden'
        }}>
          <AdvancedReportDelivery
            client={client}
            dailyReports={dailyReports}
            deliveryOptions={deliveryOptions}
            onDeliveryOptionsChange={handleDeliveryOptionsChange}
            onSend={handleSendReport}
            onClose={() => setShowDeliveryOptions(false)}
          />
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}
    </>
  );
};

export default ReportsIntegration;