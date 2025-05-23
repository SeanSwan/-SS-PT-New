// File: frontend/src/components/Reports/PropertyInfoPage.tsx
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ClientData, MetricsData } from '../../types/reports';
import { useReportData } from './../../context/ReportDataContext';

// --- THEME ASSET ---
import marbleTexture from '../../assets/marble-texture.png';

// =============== STYLED COMPONENTS (Theme & Color Adjusted) - UNCHANGED ===============
const Container = styled.div`
  margin-bottom: 2rem;
  background: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  color: #faf0e6;
`;

const PageHeader = styled.div`
  padding: 1.5rem;
  background-image: url(${marbleTexture});
  background-size: cover;
  background-position: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 1;
  }
`;

const Title = styled.h2`
  margin: 0;
  position: relative;
  z-index: 2;
  color: #eee8aa;
  font-weight: 600;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 238, 170, 0.2);
`;

const ContentContainer = styled.div`
  padding: 1.5rem;
`;

const InfoSections = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  color: #eee8aa;
  margin-bottom: 1rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 238, 170, 0.2);
  padding-bottom: 0.5rem;
`;

const PropertyCard = styled.div`
  background: rgba(10, 10, 10, 0.6);
  border: 1px solid rgba(255, 238, 170, 0.15);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(20, 20, 20, 0.7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.h4`
  font-size: 0.875rem;
  color: #eee8aa;
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardValue = styled.div`
  font-size: 1.75rem;
  font-weight: 600;
  color: #faf0e6;
  line-height: 1.2;
`;

const CardText = styled.div`
  font-size: 0.9rem;
  color: #e0e0e0;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

const DailyDataSection = styled.div`
  margin-top: 2rem;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #faf0e6;

  th,
  td {
    padding: 0.75rem;
    border: 1px solid rgba(238, 232, 170, 0.2);
    text-align: left;
    vertical-align: middle;
  }

  th {
    background-color: rgba(0, 0, 0, 0.5);
    font-weight: 600;
    color: #eee8aa;
  }

  tbody tr {
    background-color: rgba(0, 0, 0, 0.2);
  }

  tbody tr:nth-child(even) {
    background-color: rgba(0, 0, 0, 0.3);
  }

  tbody tr:hover {
    background-color: rgba(238, 232, 170, 0.08);
  }

  tfoot {
    font-weight: 600;
    background-color: rgba(0, 0, 0, 0.5);
    color: #eee8aa;
  }
`;

const TotalCounter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  color: #eee8aa;
  font-weight: 600;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const MetricCard = styled.div`
  background: rgba(10, 10, 10, 0.6);
  border: 1px solid rgba(255, 238, 170, 0.15);
  border-radius: 6px;
  padding: 1.25rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(20, 20, 20, 0.7);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const MetricTitle = styled.h4`
  font-size: 0.875rem;
  color: #eee8aa;
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 600;
  color: #faf0e6;
  line-height: 1.2;
`;

const MetricDetail = styled.div`
  font-size: 0.8rem;
  color: #e0e0e0;
  margin-top: 0.5rem;
  line-height: 1.4;
`;

// =============== INTERFACES & TYPES ===============
interface CalculatedMetrics {
  totalHumanIntrusions: number;
  totalVehicleIntrusions: number;
  avgHumanIntrusionsPerDay: number;
  avgVehicleIntrusionsPerDay: number;
  peakHumanDay: string;
  peakVehicleDay: string;
  cameraUptime: number;
  responseEfficiency: number;
}

interface PropertyInfoPageProps {}

// Default data
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
  operationalUptime: 0,
};

// =============== COMPONENT ===============
const PropertyInfoPage: React.FC<PropertyInfoPageProps> = () => {
  const { client, metrics, dateRange, isLoading } = useReportData();
  const currentMetrics = metrics || fallbackMetrics;

  const calculatedMetrics: CalculatedMetrics = useMemo(() => {
    const safeMetrics = metrics || fallbackMetrics;
    // Explicitly cast to ensure TypeScript sees these as records of numbers
    const humanIntrusions = safeMetrics.humanIntrusions as Record<string, number>;
    const vehicleIntrusions = safeMetrics.vehicleIntrusions as Record<string, number>;

    const totalHumanIntrusions = (Object.values(humanIntrusions) as number[]).reduce(
      (sum, value) => sum + value,
      0
    );
    const totalVehicleIntrusions = (Object.values(vehicleIntrusions) as number[]).reduce(
      (sum, value) => sum + value,
      0
    );
    const numDays = Object.keys(humanIntrusions).length || 7;
    const avgHumanIntrusionsPerDay = numDays > 0 ? totalHumanIntrusions / numDays : 0;
    const avgVehicleIntrusionsPerDay = numDays > 0 ? totalVehicleIntrusions / numDays : 0;

    const findPeakDay = (intrusions: Record<string, number>): string => {
      const entries = Object.entries(intrusions);
      if (entries.length === 0) return 'N/A';
      return entries.reduce(
        (max, [day, count]: [string, number]) => (count > max[1] ? [day, count] : max),
        ['', 0]
      )[0] || 'N/A';
    };

    const peakHumanDay = findPeakDay(humanIntrusions);
    const peakVehicleDay = findPeakDay(vehicleIntrusions);
    const totalCamerasSafe = Number(safeMetrics.totalCameras) || 0;
    const camerasOnlineSafe = Number(safeMetrics.camerasOnline) || 0;
    const cameraUptime = totalCamerasSafe > 0 ? (camerasOnlineSafe / totalCamerasSafe) * 100 : 0;
    const responseTimeSafe = Number(safeMetrics.responseTime) || 0;
    const maxExpectedResponseTime = 2.0;
    const efficiency =
      ((maxExpectedResponseTime - Math.min(responseTimeSafe, maxExpectedResponseTime)) /
        maxExpectedResponseTime) *
      100;
    const responseEfficiency = Math.max(0, efficiency);

    return {
      totalHumanIntrusions,
      totalVehicleIntrusions,
      avgHumanIntrusionsPerDay: Number.isNaN(avgHumanIntrusionsPerDay) ? 0 : avgHumanIntrusionsPerDay,
      avgVehicleIntrusionsPerDay: Number.isNaN(avgVehicleIntrusionsPerDay) ? 0 : avgVehicleIntrusionsPerDay,
      peakHumanDay,
      peakVehicleDay,
      cameraUptime: Number.isNaN(cameraUptime) ? 0 : cameraUptime,
      responseEfficiency: Number.isNaN(responseEfficiency) ? 0 : responseEfficiency,
    };
  }, [metrics]);

  if (isLoading && !client) {
    return (
      <Container>
        <ContentContainer>Loading property data...</ContentContainer>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <Title>Property & Security Analytics</Title>
      </PageHeader>

      <ContentContainer>
        {/* Property Information Section */}
        <SectionTitle>Property & Site Information</SectionTitle>
        <InfoSections>
          <PropertyCard>
            <CardHeader>Site Name</CardHeader>
            <CardValue>{client?.siteName || client?.name || 'N/A'}</CardValue>
            <CardText>
              Monitoring Period:{' '}
              {dateRange
                ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
                : 'N/A'}
            </CardText>
          </PropertyCard>

          <PropertyCard>
            <CardHeader>Location</CardHeader>
            <CardValue>{client?.location || 'N/A'}</CardValue>
            <CardText>
              {client?.city || 'N/A'}, {client?.state || ''} {client?.zipCode || ''}
            </CardText>
          </PropertyCard>

          <PropertyCard>
            <CardHeader>Camera Coverage</CardHeader>
            <CardValue>
              {currentMetrics.camerasOnline ?? 'N/A'} / {currentMetrics.totalCameras ?? 'N/A'}
            </CardValue>
            <CardText>Camera Uptime: {calculatedMetrics.cameraUptime.toFixed(1)}%</CardText>
          </PropertyCard>

          <PropertyCard>
            <CardHeader>Camera Type</CardHeader>
            <CardValue>{client?.cameraType || 'N/A'}</CardValue>
            <CardText>{client?.cameraDetails || 'N/A'}</CardText>
          </PropertyCard>
        </InfoSections>

        {/* AI Metrics Section */}
        <SectionTitle>AI-Driven Insights & Metrics</SectionTitle>
        <MetricsGrid>
          <MetricCard>
            <MetricTitle>Total Human Intrusions</MetricTitle>
            <MetricValue>{calculatedMetrics.totalHumanIntrusions}</MetricValue>
            <MetricDetail>
              Avg. {calculatedMetrics.avgHumanIntrusionsPerDay.toFixed(1)} / day | Peak:{' '}
              {calculatedMetrics.peakHumanDay}
            </MetricDetail>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Total Vehicle Intrusions</MetricTitle>
            <MetricValue>{calculatedMetrics.totalVehicleIntrusions}</MetricValue>
            <MetricDetail>
              Avg. {calculatedMetrics.avgVehicleIntrusionsPerDay.toFixed(1)} / day | Peak:{' '}
              {calculatedMetrics.peakVehicleDay}
            </MetricDetail>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Potential Threats</MetricTitle>
            <MetricValue>{currentMetrics.potentialThreats ?? 0}</MetricValue>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Proactive Alerts</MetricTitle>
            <MetricValue>{currentMetrics.proactiveAlerts ?? 0}</MetricValue>
          </MetricCard>

          <MetricCard>
            <MetricTitle>AI Accuracy</MetricTitle>
            <MetricValue>{(currentMetrics.aiAccuracy ?? 0).toFixed(1)}%</MetricValue>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Avg. Response Time</MetricTitle>
            <MetricValue>{(currentMetrics.responseTime ?? 0).toFixed(1)} sec</MetricValue>
            <MetricDetail>Efficiency: {calculatedMetrics.responseEfficiency.toFixed(1)}%</MetricDetail>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Monitoring Hours</MetricTitle>
            <MetricValue>{currentMetrics.totalMonitoringHours ?? 0}</MetricValue>
          </MetricCard>

          <MetricCard>
            <MetricTitle>Operational Uptime</MetricTitle>
            <MetricValue>{(currentMetrics.operationalUptime ?? 0).toFixed(1)}%</MetricValue>
          </MetricCard>
        </MetricsGrid>

        {/* Daily Intrusion Data Section */}
        <DailyDataSection>
          <SectionTitle>Daily Intrusion Data</SectionTitle>
          <DataTable>
            <thead>
              <tr>
                <th>Day</th>
                <th>Human Intrusions</th>
                <th>Vehicle Intrusions</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const humanCount = currentMetrics.humanIntrusions?.[day] ?? 0;
                const vehicleCount = currentMetrics.vehicleIntrusions?.[day] ?? 0;
                return (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>{humanCount}</td>
                    <td>{vehicleCount}</td>
                    <td>{humanCount + vehicleCount}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>Totals</th>
                <th>{calculatedMetrics.totalHumanIntrusions}</th>
                <th>{calculatedMetrics.totalVehicleIntrusions}</th>
                <th>
                  {calculatedMetrics.totalHumanIntrusions + calculatedMetrics.totalVehicleIntrusions}
                </th>
              </tr>
            </tfoot>
          </DataTable>
          <TotalCounter>
            Total Intrusions:{' '}
            {calculatedMetrics.totalHumanIntrusions + calculatedMetrics.totalVehicleIntrusions}
          </TotalCounter>
        </DailyDataSection>
      </ContentContainer>
    </Container>
  );
};

export default PropertyInfoPage;
