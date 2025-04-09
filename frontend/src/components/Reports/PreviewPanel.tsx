// File: frontend/src/components/Reports/EnhancedPreviewPanel.tsx
import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ClientData, MetricsData, DailyReport, ThemeSettings, MediaFile, VideoLink, DateRange } from '../../types/reports';
import { useReportData } from './../../context/ReportDataContext';

interface PreviewPanelProps { // Or whatever your interface is named
  client: ClientData | null; // <--- ADD
}

// Styled components (Unchanged)
const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const PreviewControlsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const PreviewControls = styled.div`
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 0.5rem;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

interface PreviewButtonProps {
  active?: boolean;
}

const PreviewButton = styled.button<PreviewButtonProps>`
  padding: 0.5rem 1rem;
  background-color: ${props => props.active ? '#0070f3' : 'transparent'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.active ? '#0060df' : '#e0e0e0'};
  }

  @media (max-width: 480px) {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    padding: 0.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 480px) {
    width: 100%;
    justify-content: stretch;
  }
`;

const DownloadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: #218838;
    transform: translateY(-2px);
  }

  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

const PDFButton = styled(DownloadButton)`
  background-color: #dc3545;

  &:hover {
    background-color: #c82333;
  }
`;

interface PreviewContainerProps {
  fontFamily?: string;
}

const PreviewContainer = styled.div<PreviewContainerProps>`
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  font-family: ${props => props.fontFamily || 'inherit'};
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  background-color: #1e1e1e;
  color: #e0e0e0;
`;

interface HeaderSectionProps {
  backgroundImage?: string;
  opacity?: number;
}

const HeaderSection = styled.div<HeaderSectionProps>`
  background-image: ${props => props.backgroundImage ? `url(${props.backgroundImage})` : 'none'};
  background-size: cover;
  background-position: center;
  min-height: 150px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  position: relative;
  background-color: #191919;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, ${props => props.opacity || 0.7});
    z-index: 1;
  }

  @media (max-width: 480px) {
    min-height: 120px;
    padding: 0.75rem;
  }
`;

const LogoContainer = styled.div`
  z-index: 2;
  max-width: 30%;
  display: flex;
  justify-content: center;
  align-items: center;

  img {
    max-height: 80px;
    max-width: 100%;
    object-fit: contain;
  }

  @media (max-width: 480px) {
    max-width: 25%;

    img {
      max-height: 60px;
    }
  }
`;

const HeaderContent = styled.div`
  z-index: 2;
  color: #e5c76b;
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);

  @media (max-width: 640px) {
    font-size: 1.5rem;
  }

  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`;

const HeaderSubtitle = styled.div`
  font-size: 1.125rem;
  margin-top: 0.5rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);

  @media (max-width: 640px) {
    font-size: 0.875rem;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

interface ContentSectionProps {
  primaryColor?: string;
  secondaryColor?: string;
}

const ContentSection = styled.div<ContentSectionProps>`
  padding: 1.5rem;
  background-color: ${props => props.secondaryColor || '#121212'};
  color: ${props => props.primaryColor || '#e0e0e0'};
  position: relative;

  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

interface SectionHeaderProps {
  accentColor?: string;
}

const SectionHeader = styled.h2<SectionHeaderProps>`
  color: ${props => props.accentColor || '#e5c76b'};
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid ${props => props.accentColor || '#e5c76b'};
  font-weight: 600;

  @media (max-width: 480px) {
    font-size: 1.25rem;
  }
`;

const PropertyInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const PropertyInfoCard = styled.div`
  background-color: transparent;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  height: 100%;
  background-image: url('/src/assets/marble-texture.png');
  background-size: 130%;
  background-position: ${() => {
    const positions = ['top left', 'center', 'top right', 'bottom left', 'bottom right'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 0;
    border-radius: 8px;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  color: #9e9e9e;
  margin-bottom: 0.25rem;
`;

const InfoValue = styled.div`
  font-weight: 700;
  font-size: 1.75rem;
  color: #e5c76b;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

interface MetricCardProps {
  accentColor?: string;
}

const MetricCard = styled.div<MetricCardProps>`
  padding: 1.25rem;
  border-radius: 8px;
  background-color: transparent;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  height: 100%;
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 100 + Math.random() * 50}%;
  background-position: ${() => {
    const positions = ['top left', 'center', 'top right', 'bottom left', 'bottom right', '25% 75%', '75% 25%'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 0;
    border-radius: 8px;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #e5c76b;

  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const MetricUnit = styled.span`
  font-size: 1.25rem;
  margin-left: 0.25rem;

  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const DailyReportsSection = styled.div`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
`;

interface SecurityCodeProps {
  code: string;
}

const SecurityCodeBadge = styled.span<SecurityCodeProps>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => {
    switch(props.code) {
      case 'Code 4': return 'rgba(209, 250, 229, 0.2)';
      case 'Code 3': return 'rgba(255, 249, 196, 0.2)';
      case 'Code 2': return 'rgba(255, 204, 188, 0.2)';
      case 'Code 1': return 'rgba(254, 202, 202, 0.2)';
      default: return 'rgba(209, 250, 229, 0.2)';
    }
  }};
  color: ${props => {
    switch(props.code) {
      case 'Code 4': return '#2ecc71';
      case 'Code 3': return '#f1c40f';
      case 'Code 2': return '#e67e22';
      case 'Code 1': return '#e74c3c';
      default: return '#2ecc71';
    }
  }};
`;

const DailyReportItem = styled.div`
  padding: 1rem;
  background-color: transparent;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 120 + Math.random() * 60}%;
  background-position: ${() => {
    const positions = ['top left', 'center', 'top right', 'bottom left', 'bottom right', '30% 70%', '70% 30%', '20% 20%'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, ${() => 0.6 + Math.random() * 0.1});
    z-index: 0;
    border-radius: 8px;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const DailyReportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const DailyReportDay = styled.div`
  font-weight: 600;
  color: #e5c76b;
`;

const DailyReportContent = styled.div`
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-line;
  color: #e0e0e0;

  @media (max-width: 480px) {
    font-size: 0.825rem;
  }
`;

const ChartImageContainer = styled.div`
  margin: 1.5rem 0;
  text-align: center;
  background-color: transparent;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  background-image: url('/src/assets/marble-texture.png');
  background-size: 170%;
  background-position: 40% 20%;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.62);
    z-index: 0;
    border-radius: 8px;
  }

  img {
    max-width: 100%;
    border-radius: 4px;
    position: relative;
    z-index: 1;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  }
`;

const NotesSection = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  background-color: transparent;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  background-image: url('/src/assets/marble-texture.png');
  background-size: 140%;
  background-position: 60% 40%;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 0;
    border-radius: 8px;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const SignatureSection = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  background-color: transparent;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  background-image: url('/src/assets/marble-texture.png');
  background-size: 150%;
  background-position: 30% 70%;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.58);
    z-index: 0;
    border-radius: 8px;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const ContactInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const ContactItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const ContactLabel = styled.div`
  font-size: 0.75rem;
  color: #9e9e9e;
  margin-bottom: 0.25rem;
`;

const ContactValue = styled.div`
  font-weight: 600;
  color: #e5c76b;
`;

const PreviewMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  z-index: 10;
  pointer-events: none;
  font-weight: bold;
  letter-spacing: 2px;
  white-space: nowrap;

  @media (max-width: 480px) {
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #2a2a2a;
  border-top: 4px solid #e5c76b;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const MediaSection = styled.div`
  margin-top: 2rem;
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const MediaItem = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  height: 150px;
  background-color: transparent;
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 120 + Math.random() * 50}%;
  background-position: ${() => {
    const positions = ['15% 85%', '45% 55%', '70% 30%', '25% 75%'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, ${() => 0.6 + Math.random() * 0.15});
    z-index: 0;
    border-radius: 8px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: relative;
    z-index: 1;
  }

  .overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.8);
    color: #e5c76b;
    padding: 0.5rem;
    font-size: 0.75rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 2;
  }

  &:hover .overlay {
    opacity: 1;
  }

  @media (max-width: 480px) {
    height: 120px;
  }
`;

const VideoLinkItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: transparent;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
  margin-bottom: 0.75rem;
  background-image: url('/src/assets/marble-texture.png');
  background-size: ${() => 120 + Math.random() * 40}%;
  background-position: ${() => {
    const positions = ['10% 90%', '35% 65%', '65% 35%', '90% 10%', '20% 40%', '80% 60%'];
    return positions[Math.floor(Math.random() * positions.length)];
  }};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, ${() => 0.58 + Math.random() * 0.12});
    z-index: 0;
    border-radius: 8px;
  }

  .link-info {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .link-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #e0e0e0;
  }

  .link-expiry {
    font-size: 0.75rem;
    color: #9e9e9e;
    margin-top: 0.25rem;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    position: relative;
    z-index: 1;
  }

  .active {
    background-color: rgba(209, 250, 229, 0.2);
    color: #2ecc71;
  }

  .expired {
    background-color: rgba(254, 202, 202, 0.2);
    color: #e74c3c;
  }
`;

// Props for the component
interface EnhancedPreviewPanelProps {
  mediaFiles?: MediaFile[];
  videoLinks?: VideoLink[];
  onExportPDF?: () => Promise<void>;
  backgroundColor?: string;
  textColor?: string;
  leftLogo?: string;
  rightLogo?: string;
}

type PreviewViewType = 'full' | 'page1' | 'page2' | 'page3';
type SectionType = 'header' | 'info' | 'metrics' | 'chart' | 'daily' | 'notes' | 'media' | 'videos';

// Fallback data if context is loading
const fallbackMetrics: MetricsData = {
  humanIntrusions: {},
  vehicleIntrusions: {},
  potentialThreats: 0,
  proactiveAlerts: 0,
  responseTime: 0,
  aiAccuracy: 0,
  totalCameras: 0,
  camerasOnline: 0,
  totalMonitoringHours: 0,
  operationalUptime: 0
};
const fallbackTheme: ThemeSettings = { fontFamily: 'inherit', backgroundOpacity: 0.7 };
const fallbackDateRange: DateRange = { start: new Date(), end: new Date() };

/**
 * Enhanced preview panel using data from ReportDataContext
 */
const EnhancedPreviewPanel: React.FC<EnhancedPreviewPanelProps> = ({
  mediaFiles = [],
  videoLinks = [],
  onExportPDF,
  backgroundColor,
  textColor,
  leftLogo,
  rightLogo,
}) => {
  const {
    client,
    themeSettings: contextTheme,
    metrics,
    dailyReports,
    summaryNotes,
    signature,
    chartDataURL,
    dateRange,
    isLoading: isContextLoading,
  } = useReportData();

  const [previewView, setPreviewView] = useState<PreviewViewType>('full');
  const [showPreviewMessage, setShowPreviewMessage] = useState<boolean>(false);
  const [isPDFLoading, setIsPDFLoading] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const effectiveMetrics = metrics || fallbackMetrics;
  const effectiveTheme = contextTheme || fallbackTheme;
  const effectiveDateRange = dateRange || fallbackDateRange;

  // Explicitly cast values to number[]
  const totalHumanIntrusions = (Object.values(effectiveMetrics.humanIntrusions || {}) as number[]).reduce(
    (sum: number, value: number) => sum + value,
    0
  );
  const totalVehicleIntrusions = (Object.values(effectiveMetrics.vehicleIntrusions || {}) as number[]).reduce(
    (sum: number, value: number) => sum + value,
    0
  );

  const handleDownloadPreview = async () => {
    if (previewRef.current) {
      try {
        setIsPDFLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(previewRef.current, {
          scale: 2, logging: false, useCORS: true,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${client?.name || 'Client'}-Report-Preview.png`;
        link.click();
      } catch (error) {
        console.error('Failed to download preview:', error);
      } finally {
        setIsPDFLoading(false);
      }
    }
  };

  const handleGeneratePDF = async () => {
     if (previewRef.current) {
        setIsPDFLoading(true);
        try {
            if (onExportPDF) {
                console.log("Attempting custom PDF export...");
                await onExportPDF();
            } else {
                console.log("Using basic PDF export...");
                await generateBasicPDF();
            }
        } catch (error) {
            console.error('PDF generation failed, falling back to basic if possible:', error);
            if (onExportPDF) {
                 try {
                    console.log("Fallback to basic PDF export...");
                    await generateBasicPDF();
                 } catch (basicError) {
                    console.error('Basic PDF generation fallback also failed:', basicError);
                 }
            }
        } finally {
            setIsPDFLoading(false);
        }
     } else {
        console.error("Preview reference is not available for PDF generation.");
     }
  };

  const generateBasicPDF = async () => {
    if (!previewRef.current) {
        console.error("Preview ref is null in generateBasicPDF");
        return;
    }

    const previewClone = previewRef.current.cloneNode(true) as HTMLElement;
    const previewMessageElement = previewClone.querySelector('[data-preview-message="true"]');
    if (previewMessageElement) {
        previewMessageElement.remove();
    }
    previewClone.style.margin = '0';
    previewClone.style.padding = '0';
    previewClone.style.boxShadow = 'none';
    previewClone.style.borderRadius = '0';
    previewClone.style.border = 'none';
    previewClone.style.width = '1200px';
    previewClone.style.position = 'absolute';
    previewClone.style.left = '-9999px';
    previewClone.style.top = '0px';

    document.body.appendChild(previewClone);
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(previewClone, {
            scale: 2,
            logging: false,
            useCORS: true,
            width: previewClone.scrollWidth,
            height: previewClone.scrollHeight,
            windowWidth: previewClone.scrollWidth,
            windowHeight: previewClone.scrollHeight,
    });

    document.body.removeChild(previewClone);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
            position = position - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
    }

    pdf.save(`${client?.name || 'Client'}-Report.pdf`);
  };

  const shouldShowSection = (section: SectionType): boolean => {
    if (previewView === 'full') return true;
    switch (section) {
      case 'header': case 'info': case 'metrics': return previewView === 'page1';
      case 'chart': case 'media': return previewView === 'page2';
      case 'daily': case 'notes': case 'videos': return previewView === 'page3';
      default: return false;
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      if (!date) return 'N/A';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'MMM d, yyyy');
    } catch (e) {
      console.error("Error formatting date:", date, e);
      return 'Invalid Date';
    }
  };

  return (
    <Section>
      <SectionTitle>
        Report Preview
        <PreviewControlsContainer>
          <PreviewControls>
             <PreviewButton active={previewView === 'full'} onClick={() => setPreviewView('full')}>Full Report</PreviewButton>
             <PreviewButton active={previewView === 'page1'} onClick={() => setPreviewView('page1')}>Page 1</PreviewButton>
             <PreviewButton active={previewView === 'page2'} onClick={() => setPreviewView('page2')}>Page 2</PreviewButton>
             <PreviewButton active={previewView === 'page3'} onClick={() => setPreviewView('page3')}>Page 3</PreviewButton>
          </PreviewControls>
          <ButtonGroup>
             <DownloadButton onClick={handleDownloadPreview} disabled={isPDFLoading}>
               <span>⬇</span> Download Preview {isPDFLoading ? '...' : ''}
             </DownloadButton>
             <PDFButton onClick={handleGeneratePDF} disabled={isPDFLoading}>
               <span>📄</span> Export PDF {isPDFLoading ? '...' : ''}
             </PDFButton>
          </ButtonGroup>
        </PreviewControlsContainer>
      </SectionTitle>

      <PreviewContainer ref={previewRef} fontFamily={effectiveTheme.fontFamily}>
        {showPreviewMessage && (
          <PreviewMessage data-preview-message="true"></PreviewMessage>
        )}

        {shouldShowSection('header') && (
          <HeaderSection
            backgroundImage={effectiveTheme.headerImage || backgroundColor}
            opacity={effectiveTheme.backgroundOpacity}
          >
            <LogoContainer>
              {(effectiveTheme.companyLogo || leftLogo) && (
                <img src={effectiveTheme.companyLogo || leftLogo} alt="Company Logo" />
              )}
            </LogoContainer>
            <HeaderContent>
              <HeaderTitle>
                {effectiveTheme.reportTitle || 'AI Live Monitoring Report'}
              </HeaderTitle>
              <HeaderSubtitle>
                {client?.name ? `[${client.name}` : '[Client Name'} – {formatDate(effectiveDateRange.start)} – {formatDate(effectiveDateRange.end)}]
              </HeaderSubtitle>
            </HeaderContent>
            <LogoContainer>
              {(effectiveTheme.clientLogo || rightLogo) && (
                <img src={effectiveTheme.clientLogo || rightLogo} alt="Client Logo" />
              )}
            </LogoContainer>
          </HeaderSection>
        )}

        <ContentSection
          primaryColor={effectiveTheme.primaryColor || textColor}
          secondaryColor={effectiveTheme.secondaryColor || backgroundColor}
        >
          {shouldShowSection('info') && client && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                Property & Site Information
              </SectionHeader>
              <PropertyInfoGrid>
                <PropertyInfoCard><InfoLabel>Site Name</InfoLabel><InfoValue>{client.siteName || client.name || 'Property'}</InfoValue></PropertyInfoCard>
                <PropertyInfoCard><InfoLabel>Location</InfoLabel><InfoValue>{client.location || 'N/A'}</InfoValue></PropertyInfoCard>
                <PropertyInfoCard><InfoLabel>Camera Coverage</InfoLabel><InfoValue>{effectiveMetrics.camerasOnline ?? 0} / {effectiveMetrics.totalCameras ?? 0}</InfoValue></PropertyInfoCard>
                <PropertyInfoCard><InfoLabel>Camera Type</InfoLabel><InfoValue>{client.cameraType || 'Standard IP'}</InfoValue></PropertyInfoCard>
                <PropertyInfoCard><InfoLabel>City</InfoLabel><InfoValue>{client.city || 'N/A'}</InfoValue></PropertyInfoCard>
                <PropertyInfoCard><InfoLabel>State/Zip</InfoLabel><InfoValue>{client.state || 'N/A'} {client.zipCode || ''}</InfoValue></PropertyInfoCard>
              </PropertyInfoGrid>
            </div>
          )}

          {shouldShowSection('metrics') && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                AI-Driven Insights & Metrics
              </SectionHeader>
              <MetricsGrid>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Total Human Intrusions</InfoLabel><MetricValue>{totalHumanIntrusions}</MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Total Vehicle Intrusions</InfoLabel><MetricValue>{totalVehicleIntrusions}</MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Potential Threats</InfoLabel><MetricValue>{effectiveMetrics.potentialThreats ?? 0}</MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Proactive Alerts</InfoLabel><MetricValue>{effectiveMetrics.proactiveAlerts ?? 0}</MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>AI Accuracy</InfoLabel><MetricValue>{(effectiveMetrics.aiAccuracy ?? 0).toFixed(1)}<MetricUnit>%</MetricUnit></MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Avg. Response Time</InfoLabel><MetricValue>{(effectiveMetrics.responseTime ?? 0).toFixed(1)}<MetricUnit>sec</MetricUnit></MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Monitoring Hours</InfoLabel><MetricValue>{effectiveMetrics.totalMonitoringHours ?? 0}</MetricValue></MetricCard>
                <MetricCard accentColor={effectiveTheme.accentColor}><InfoLabel>Operational Uptime</InfoLabel><MetricValue>{(effectiveMetrics.operationalUptime ?? 0).toFixed(1)}<MetricUnit>%</MetricUnit></MetricValue></MetricCard>
              </MetricsGrid>
            </div>
          )}

          {shouldShowSection('chart') && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                 Weekly Intrusion Analysis
              </SectionHeader>
              <ChartImageContainer>
                <img src={chartDataURL || '/placeholder-chart.png'} alt="Weekly Intrusion Trends" />
              </ChartImageContainer>
            </div>
          )}

          {shouldShowSection('media') && mediaFiles.length > 0 && (
            <MediaSection>
              <SectionHeader accentColor={effectiveTheme.accentColor}>Media Evidence</SectionHeader>
              <MediaGrid>
                {mediaFiles.map((file, index) => (
                  <MediaItem key={index}>
                    <img src={file.thumbnail || file.url} alt={file.name} />
                    <div className="overlay">{file.name}</div>
                  </MediaItem>
                ))}
              </MediaGrid>
            </MediaSection>
          )}

          {shouldShowSection('daily') && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                Weekly Activity Overview
              </SectionHeader>
              <DailyReportsSection>
                {dailyReports && dailyReports.length > 0 ? (
                  dailyReports.map((report: DailyReport) => (
                    <DailyReportItem key={report.day}>
                      <DailyReportHeader>
                        <DailyReportDay>{report.day}:</DailyReportDay>
                        {report.securityCode && (
                          <SecurityCodeBadge code={report.securityCode}>
                            {report.securityCode}
                          </SecurityCodeBadge>
                        )}
                      </DailyReportHeader>
                      <DailyReportContent>
                        {report.content || `No report available for ${report.day}.`}
                      </DailyReportContent>
                    </DailyReportItem>
                  ))
                ) : (
                  <DailyReportItem>
                    <DailyReportContent>No daily activity logs available for this period.</DailyReportContent>
                  </DailyReportItem>
                )}
              </DailyReportsSection>
            </div>
          )}

          {shouldShowSection('notes') && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                Additional Notes & Compliance
              </SectionHeader>
              <NotesSection>
                <DailyReportContent>
                  {summaryNotes || 'No additional notes provided.'}
                </DailyReportContent>
              </NotesSection>
            </div>
          )}

          {shouldShowSection('notes') && (
            <div>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                Contact Information
              </SectionHeader>
              <SignatureSection>
                <ContactInfo>
                  <ContactItem>
                    <ContactLabel>Report Prepared By:</ContactLabel>
                    <ContactValue>{signature || 'Security Manager'}</ContactValue>
                  </ContactItem>
                  <ContactItem>
                    <ContactLabel>Client Contact Email:</ContactLabel>
                    <ContactValue>{client?.contactEmail || 'N/A'}</ContactValue>
                  </ContactItem>
                </ContactInfo>
              </SignatureSection>
            </div>
          )}

          {shouldShowSection('videos') && videoLinks.length > 0 && (
            <MediaSection>
              <SectionHeader accentColor={effectiveTheme.accentColor}>
                Secured Video Evidence
              </SectionHeader>
              {videoLinks.map((link, index) => (
                <VideoLinkItem key={index}>
                  <div className="link-info">
                    <div className="link-title">{link.title}</div>
                    <div className="link-expiry">
                      {new Date(link.expiryDate) > new Date()
                        ? `Accessible until: ${formatDate(link.expiryDate)}`
                        : 'Access expired'}
                    </div>
                  </div>
                  <div className={`badge ${new Date(link.expiryDate) > new Date() ? 'active' : 'expired'}`}>
                    {new Date(link.expiryDate) > new Date() ? 'Active' : 'Expired'}
                  </div>
                </VideoLinkItem>
              ))}
            </MediaSection>
          )}
        </ContentSection>
      </PreviewContainer>

      {(isContextLoading || isPDFLoading) && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}
    </Section>
  );
};

export default EnhancedPreviewPanel;
