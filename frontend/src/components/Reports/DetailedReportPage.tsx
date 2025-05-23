// File: frontend/src/pages/DetailedReportPage.tsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';

// Import components using context
import PropertyInfoPage from '../../components/Reports/PropertyInfoPage';
import EnhancedPreviewPanel from '../../components/Reports/PreviewPanel';

// Import the custom hook and context type from ReportDataContext
import { useReportData, ReportDataContextType } from './../../context/ReportDataContext';
import { MediaFile, VideoLink } from '../../types/reports';

// Styled components
const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: #333;
  font-size: 2rem;
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ButtonBar = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #0060df;
  }
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  @media (min-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  font-size: 1.3rem;
  color: #444;
  flex-direction: column;
  gap: 1rem;
  &::before {
    content: '';
    display: block;
    width: 40px;
    height: 40px;
    border: 4px solid #e0e0e0;
    border-top-color: #0070f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorIndicator = styled(LoadingIndicator)`
  color: #dc3545;
  &::before {
    border-top-color: #dc3545;
    animation: none;
    border-style: dashed;
  }
`;

/**
 * DetailedReportPage Component
 * Fetches and displays report details using data from ReportDataContext.
 */
const DetailedReportPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  // Use the updated ReportDataContextType from our context
  const { client, fetchInitialData, isLoading } = useReportData() as ReportDataContextType;

  // Local state for additional media/video files if needed
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);

  // Fetch data when clientId changes
  useEffect(() => {
    if (clientId) {
      console.log(`DetailedReportPage: Triggering fetch for client ID: ${clientId}`);
      fetchInitialData(clientId);
      // TODO: Optionally fetch media/video files here, e.g.:
      // fetchMediaForClient(clientId).then(setMediaFiles);
    } else {
      console.warn('DetailedReportPage: No clientId found in URL params.');
    }
  }, [clientId, fetchInitialData]);

  // Handlers for PDF export and report actions
  const handleExportPDF = async (): Promise<void> => {
    console.log('PDF export triggered from DetailedReportPage - delegates to PreviewPanel');
    return Promise.resolve();
  };

  const handleSaveChanges = async (): Promise<void> => {
    console.log('Save Draft Clicked - Needs Implementation');
    // Implement saving logic here
  };

  const handleSendReport = async (): Promise<void> => {
    console.log('Send Report Clicked - Needs Implementation');
    // Implement send logic here
  };

  const handleEditReport = (): void => {
    console.log('Edit Report Clicked - Needs Implementation');
    // Implement edit logic here
  };

  // Render loading state if needed
  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Loading Report...</PageTitle>
          <ButtonBar>
            <Button disabled>Edit Report</Button>
            <Button disabled>Save Draft</Button>
            <Button disabled>Send Report</Button>
          </ButtonBar>
        </PageHeader>
        <LoadingIndicator>Loading Report Data...</LoadingIndicator>
      </PageContainer>
    );
  }

  // Render error state if client data is missing
  if (!client && !isLoading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Error</PageTitle>
          <ButtonBar>
            <Button disabled>Edit Report</Button>
            <Button disabled>Save Draft</Button>
            <Button disabled>Send Report</Button>
          </ButtonBar>
        </PageHeader>
        <ErrorIndicator>
          Could not load report data for the specified client.
        </ErrorIndicator>
      </PageContainer>
    );
  }

  // Main render when data is loaded
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          Detailed Security Report: {client?.siteName || client?.name || '...'}
        </PageTitle>
        <ButtonBar>
          <Button onClick={handleEditReport}>Edit Report</Button>
          <Button onClick={handleSaveChanges}>Save Draft</Button>
          <Button onClick={handleSendReport}>Send Report</Button>
        </ButtonBar>
      </PageHeader>

      <ContentGrid>
        <div>
          <PropertyInfoPage />
        </div>
        <div>
          <EnhancedPreviewPanel
            mediaFiles={mediaFiles}
            videoLinks={videoLinks}
            onExportPDF={handleExportPDF}
          />
        </div>
      </ContentGrid>
    </PageContainer>
  );
};

export default DetailedReportPage;
