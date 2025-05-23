// File: frontend/src/components/Reports/PropertyInfoPanel.tsx
import React, { useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ClientData, MetricsData } from '../../types/reports';

// --- THEME ASSET ---
import marbleTexture from '../../assets/marble-texture.png';

// =============== STYLED COMPONENTS (Theme & Color Adjusted) ===============
const Section = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  color: #faf0e6;
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
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 8px;
    z-index: 1;
  }

  & > * {
    position: relative;
    z-index: 2;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 238, 170, 0.2);
  padding-bottom: 0.75rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  color: #eee8aa;
  font-weight: 600;
  margin: 0;
`;

const EditButton = styled.button`
  background: none;
  border: 1px solid rgba(255, 238, 170, 0.5);
  cursor: pointer;
  color: #eee8aa;
  font-weight: 500;
  font-size: 0.9rem;
  padding: 4px 10px;
  border-radius: 4px;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: rgba(238, 232, 170, 0.15);
    color: #fffacd;
  }
`;

const SaveCancelContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ variant: 'save' | 'cancel' }>`
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background-color 0.2s ease, opacity 0.2s ease;

  ${({ variant }) =>
    variant === 'save'
      ? `
    background-color: #28a745;
    color: white;
    &:hover { background-color: #218838; }
  `
      : `
    background-color: #f8f9fa;
    color: #dc3545;
    border: 1px solid #ddd;
    &:hover { background-color: #e2e6ea; opacity: 0.9; }
  `}
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
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

const MetricValue = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  font-size: ${(props) =>
    props.size === 'large' ? '2rem' : props.size === 'medium' ? '1.5rem' : '1.25rem'};
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

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #faf0e6;

  th,
  td {
    padding: 0.6rem 0.75rem;
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

const EditableInput = styled.input`
  width: calc(100% - 1rem);
  padding: 0.5rem;
  border: 1px solid rgba(238, 232, 170, 0.3);
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
  background-color: rgba(0, 0, 0, 0.4);
  color: #faf0e6;

  &:focus {
    border-color: #eee8aa;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(238, 232, 170, 0.25);
    background-color: rgba(0, 0, 0, 0.5);
  }
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

interface PropertyInfoPanelProps {
  clientData: ClientData | null;
  metrics: MetricsData;
  dateRange: { start: Date; end: Date };
  onMetricsChange: (metrics: Partial<MetricsData>) => void;
}

// =============== UTILITY FUNCTIONS ===============
const createDefaultMetrics = (): MetricsData => ({
  humanIntrusions: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
  vehicleIntrusions: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
  potentialThreats: 0,
  proactiveAlerts: 0,
  responseTime: 0,
  aiAccuracy: 0,
  totalCameras: 0,
  camerasOnline: 0,
  totalMonitoringHours: 0,
  operationalUptime: 0,
});

// =============== COMPONENT ===============
const PropertyInfoPanel: React.FC<PropertyInfoPanelProps> = ({
  clientData,
  metrics,
  dateRange,
  onMetricsChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetrics, setEditedMetrics] = useState<MetricsData>(() => ({
    ...createDefaultMetrics(),
    ...metrics,
  }));

  useEffect(() => {
    setEditedMetrics({
      ...createDefaultMetrics(),
      ...metrics,
    });
  }, [metrics]);

  const calculatedMetrics: CalculatedMetrics = useMemo(() => {
    const data = isEditing ? editedMetrics : metrics;
    const safeData = { ...createDefaultMetrics(), ...data };
    // Cast to ensure TypeScript treats these as records of numbers
    const humanIntrusions = safeData.humanIntrusions as Record<string, number>;
    const vehicleIntrusions = safeData.vehicleIntrusions as Record<string, number>;

    const totalHumanIntrusions = (Object.values(humanIntrusions) as number[]).reduce(
      (sum, value) => sum + value,
      0
    );
    const totalVehicleIntrusions = (Object.values(vehicleIntrusions) as number[]).reduce(
      (sum, value) => sum + value,
      0
    );
    const numDays = 7;
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
    const totalCamerasSafe = Number(safeData.totalCameras) || 0;
    const camerasOnlineSafe = Number(safeData.camerasOnline) || 0;
    const cameraUptime = totalCamerasSafe > 0 ? (camerasOnlineSafe / totalCamerasSafe) * 100 : 0;
    const responseTimeSafe = Number(safeData.responseTime) || 0;
    const responseEfficiency = Math.max(0, 100 - (responseTimeSafe / 2 * 100));
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
  }, [metrics, editedMetrics, isEditing]);

  const handleMetricChange = (key: keyof MetricsData, rawValue: string) => {
    const isFloat = key === 'aiAccuracy' || key === 'responseTime' || key === 'operationalUptime';
    const value = isFloat ? parseFloat(rawValue) : parseInt(rawValue, 10);
    setEditedMetrics((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
  };

  const handleDailyMetricChange = (
    metricType: 'humanIntrusions' | 'vehicleIntrusions',
    day: string,
    rawValue: string
  ) => {
    const value = parseInt(rawValue, 10);
    setEditedMetrics((prev) => ({
      ...prev,
      [metricType]: { ...(prev[metricType] || {}), [day]: Number.isNaN(value) ? 0 : value },
    }));
  };

  const handleSaveChanges = () => {
    onMetricsChange(editedMetrics);
    setIsEditing(false);
  };
  const handleCancelChanges = () => {
    setEditedMetrics({ ...createDefaultMetrics(), ...metrics });
    setIsEditing(false);
  };
  const getCurrentMetric = (key: keyof MetricsData): number => {
    if (key === 'humanIntrusions' || key === 'vehicleIntrusions') return 0;
    const source = isEditing ? editedMetrics : metrics;
    const value = source[key];
    const numValue = Number(value);
    return Number.isNaN(numValue) ? 0 : numValue;
  };
  const getCurrentDailyMetric = (type: 'humanIntrusions' | 'vehicleIntrusions', day: string): number => {
    const source = isEditing ? editedMetrics : metrics;
    const value = source?.[type]?.[day];
    const numValue = Number(value);
    return Number.isNaN(numValue) ? 0 : numValue;
  };

  return (
    <div>
      {!clientData ? (
        <Section>
          <p style={{ position: 'relative', zIndex: 2 }}>Please select a client first.</p>
        </Section>
      ) : (
        <>
          {/* Section 1: Property & Site Information */}
          <Section>
            <SectionHeader>
              <SectionTitle>Property & Site Information</SectionTitle>
            </SectionHeader>
            <InfoGrid>
              <MetricCard>
                <MetricTitle>Site Name</MetricTitle>
                <MetricValue>{clientData.siteName || clientData.name}</MetricValue>
                <MetricDetail>
                  Monitoring Period: {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
                </MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Location</MetricTitle>
                <MetricValue size="medium">{clientData.location || 'N/A'}</MetricValue>
                <MetricDetail>
                  {clientData.city}, {clientData.state} {clientData.zipCode}
                </MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Camera Coverage</MetricTitle>
                <MetricValue>
                  {getCurrentMetric('camerasOnline')} / {getCurrentMetric('totalCameras')}
                </MetricValue>
                <MetricDetail>Camera Uptime: {calculatedMetrics.cameraUptime.toFixed(1)}%</MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Camera Type</MetricTitle>
                <MetricValue size="medium">{clientData.cameraType || 'Standard IP'}</MetricValue>
                <MetricDetail>{clientData.cameraDetails || 'High-definition cameras'}</MetricDetail>
              </MetricCard>
            </InfoGrid>
          </Section>

          {/* Section 2: AI Insights & Metrics */}
          <Section>
            <SectionHeader>
              <SectionTitle>AI-Driven Insights & Metrics</SectionTitle>
              {!isEditing ? (
                <EditButton onClick={() => setIsEditing(true)}>Edit Metrics</EditButton>
              ) : (
                <SaveCancelContainer>
                  <ActionButton variant="cancel" onClick={handleCancelChanges}>
                    Cancel
                  </ActionButton>
                  <ActionButton variant="save" onClick={handleSaveChanges}>
                    Save Changes
                  </ActionButton>
                </SaveCancelContainer>
              )}
            </SectionHeader>
            <InfoGrid>
              <MetricCard>
                <MetricTitle>Total Human Intrusions</MetricTitle>
                <MetricValue size="large">{calculatedMetrics.totalHumanIntrusions}</MetricValue>
                <MetricDetail>
                  Avg. {calculatedMetrics.avgHumanIntrusionsPerDay.toFixed(1)} / day | Peak:{' '}
                  {calculatedMetrics.peakHumanDay}
                </MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Total Vehicle Intrusions</MetricTitle>
                <MetricValue size="large">{calculatedMetrics.totalVehicleIntrusions}</MetricValue>
                <MetricDetail>
                  Avg. {calculatedMetrics.avgVehicleIntrusionsPerDay.toFixed(1)} / day | Peak:{' '}
                  {calculatedMetrics.peakVehicleDay}
                </MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Potential Threats</MetricTitle>
                <MetricValue size="large">{Number(getCurrentMetric('potentialThreats'))}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Proactive Alerts</MetricTitle>
                <MetricValue size="large">{Number(getCurrentMetric('proactiveAlerts'))}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricTitle>AI Accuracy</MetricTitle>
                <MetricValue>{Number(getCurrentMetric('aiAccuracy')).toFixed(1)}%</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Avg. Response Time</MetricTitle>
                <MetricValue>{Number(getCurrentMetric('responseTime')).toFixed(1)} sec</MetricValue>
                <MetricDetail>Efficiency: {calculatedMetrics.responseEfficiency.toFixed(1)}%</MetricDetail>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Monitoring Hours</MetricTitle>
                <MetricValue>{Number(getCurrentMetric('totalMonitoringHours'))}</MetricValue>
              </MetricCard>
              <MetricCard>
                <MetricTitle>Operational Uptime</MetricTitle>
                <MetricValue>{Number(getCurrentMetric('operationalUptime')).toFixed(1)}%</MetricValue>
              </MetricCard>
            </InfoGrid>

            {/* Editable Input Grid */}
            {isEditing && (
              <InfoGrid
                style={{
                  marginTop: '2rem',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px dashed rgba(238, 232, 170, 0.4)',
                }}
              >
                <MetricCard>
                  <MetricTitle>Potential Threats</MetricTitle>
                  <EditableInput
                    type="number"
                    value={getCurrentMetric('potentialThreats')}
                    onChange={(e) => handleMetricChange('potentialThreats', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Proactive Alerts</MetricTitle>
                  <EditableInput
                    type="number"
                    value={getCurrentMetric('proactiveAlerts')}
                    onChange={(e) => handleMetricChange('proactiveAlerts', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>AI Accuracy (%)</MetricTitle>
                  <EditableInput
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getCurrentMetric('aiAccuracy')}
                    onChange={(e) => handleMetricChange('aiAccuracy', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Avg. Response Time (sec)</MetricTitle>
                  <EditableInput
                    type="number"
                    step="0.1"
                    min="0"
                    value={getCurrentMetric('responseTime')}
                    onChange={(e) => handleMetricChange('responseTime', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Total Cameras</MetricTitle>
                  <EditableInput
                    type="number"
                    min="0"
                    value={getCurrentMetric('totalCameras')}
                    onChange={(e) => handleMetricChange('totalCameras', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Cameras Online</MetricTitle>
                  <EditableInput
                    type="number"
                    min="0"
                    value={getCurrentMetric('camerasOnline')}
                    onChange={(e) => handleMetricChange('camerasOnline', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Total Monitoring Hours</MetricTitle>
                  <EditableInput
                    type="number"
                    min="0"
                    value={getCurrentMetric('totalMonitoringHours')}
                    onChange={(e) => handleMetricChange('totalMonitoringHours', e.target.value)}
                  />
                </MetricCard>
                <MetricCard>
                  <MetricTitle>Operational Uptime (%)</MetricTitle>
                  <EditableInput
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={getCurrentMetric('operationalUptime')}
                    onChange={(e) => handleMetricChange('operationalUptime', e.target.value)}
                  />
                </MetricCard>
              </InfoGrid>
            )}
          </Section>

          {/* Section 3: Daily Data Table */}
          <Section>
            <SectionHeader>
              <SectionTitle>Daily Intrusion Data</SectionTitle>
            </SectionHeader>
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
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>
                      {isEditing ? (
                        <EditableInput
                          type="number"
                          min="0"
                          value={getCurrentDailyMetric('humanIntrusions', day)}
                          onChange={(e) => handleDailyMetricChange('humanIntrusions', day, e.target.value)}
                        />
                      ) : (
                        getCurrentDailyMetric('humanIntrusions', day)
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <EditableInput
                          type="number"
                          min="0"
                          value={getCurrentDailyMetric('vehicleIntrusions', day)}
                          onChange={(e) => handleDailyMetricChange('vehicleIntrusions', day, e.target.value)}
                        />
                      ) : (
                        getCurrentDailyMetric('vehicleIntrusions', day)
                      )}
                    </td>
                    <td>{getCurrentDailyMetric('humanIntrusions', day) + getCurrentDailyMetric('vehicleIntrusions', day)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Totals</th>
                  <th>{calculatedMetrics.totalHumanIntrusions}</th>
                  <th>{calculatedMetrics.totalVehicleIntrusions}</th>
                  <th>{calculatedMetrics.totalHumanIntrusions + calculatedMetrics.totalVehicleIntrusions}</th>
                </tr>
              </tfoot>
            </DataTable>
          </Section>
        </>
      )}
    </div>
  );
};

export default PropertyInfoPanel;
