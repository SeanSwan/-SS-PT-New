// File: frontend/src/components/Reports/PropertyInfoPanel.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ClientData, MetricsData } from '../../types/reports';

// Styled components
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
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const MetricCard = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 1.25rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const MetricTitle = styled.h4`
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const MetricValue = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  font-size: ${props => props.size === 'large' ? '2rem' : props.size === 'medium' ? '1.5rem' : '1.25rem'  return (
    <div>
      {!clientData ? (
        <div>Please select a client to view property information</div>
      ) : (
        <>
          <Section>
            <SectionTitle>Property & Site Information</SectionTitle>
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
                {isEditing ? (
                  <>
                    <label>Total Cameras: </label>
                    <EditableInput 
                      type="number" 
                      value={editedMetrics.totalCameras} 
                      onChange={e => handleMetricChange('totalCameras', parseInt(e.target.value))} 
                    />
                    <br/>
                    <label>Cameras Online: </label>
                    <EditableInput 
                      type="number" 
                      value={editedMetrics.camerasOnline} 
                      onChange={e => handleMetricChange('camerasOnline', parseInt(e.target.value))} 
                    />
                  </>
                ) : (
                  <>
                    <MetricValue>{metrics.camerasOnline} / {metrics.totalCameras}</MetricValue>
                    <MetricDetail>
                      Camera Uptime: {calculatedMetrics.cameraUptime.toFixed(1)}%
                    </MetricDetail>
                  </>
                )}
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Camera Type</MetricTitle>
                <MetricValue size="medium">{clientData.cameraType || 'Standard IP'}</MetricValue>
                <MetricDetail>
                  {clientData.cameraDetails || 'High-definition security cameras with night vision capability'}
                </MetricDetail>
              </MetricCard>
            </InfoGrid>
          </Section>
        
          <Section>
            <SectionTitle>
              AI-Driven Insights
              {!isEditing ? (
                <button 
                  style={{
                    float: 'right',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#0070f3',
                    fontWeight: 'normal',
                    fontSize: '0.875rem'
                  }}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Metrics
                </button>
              ) : (
                <div style={{ float: 'right' }}>
                  <button 
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      fontWeight: 'normal',
                      fontSize: '0.875rem',
                      marginRight: '10px'
                    }}
                    onClick={handleCancelChanges}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{
                      background: '#0070f3',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      color: 'white',
                      fontWeight: 'normal',
                      fontSize: '0.875rem'
                    }}
                    onClick={handleSaveChanges}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </SectionTitle>
            
            <InfoGrid>
              <MetricCard>
                <MetricTitle>Total Human Intrusions</MetricTitle>
                <MetricValue size="large">{calculatedMetrics.totalHumanIntrusions}</MetricValue>
                <MetricDetail>
                  Avg. {calculatedMetrics.avgHumanIntrusionsPerDay.toFixed(1)} per day
                  <br />
                  Peak: {calculatedMetrics.peakHumanDay}
                </MetricDetail>
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Total Vehicle Intrusions</MetricTitle>
                <MetricValue size="large">{calculatedMetrics.totalVehicleIntrusions}</MetricValue>
                <MetricDetail>
                  Avg. {calculatedMetrics.avgVehicleIntrusionsPerDay.toFixed(1)} per day
                  <br />
                  Peak: {calculatedMetrics.peakVehicleDay}
                </MetricDetail>
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Potential Threats Identified</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number" 
                    value={editedMetrics.potentialThreats} 
                    onChange={e => handleMetricChange('potentialThreats', parseInt(e.target.value))} 
                  />
                ) : (
                  <MetricValue size="large">{metrics.potentialThreats}</MetricValue>
                )}
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Proactive Alerts Issued</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number" 
                    value={editedMetrics.proactiveAlerts} 
                    onChange={e => handleMetricChange('proactiveAlerts', parseInt(e.target.value))} 
                  />
                ) : (
                  <MetricValue size="large">{metrics.proactiveAlerts}</MetricValue>
                )}
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>AI Accuracy (%)</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="100" 
                    value={editedMetrics.aiAccuracy} 
                    onChange={e => handleMetricChange('aiAccuracy', parseFloat(e.target.value))} 
                  />
                ) : (
                  <MetricValue>{metrics.aiAccuracy}%</MetricValue>
                )}
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Avg. Response Time (sec)</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number" 
                    step="0.1"
                    min="0" 
                    value={editedMetrics.responseTime} 
                    onChange={e => handleMetricChange('responseTime', parseFloat(e.target.value))} 
                  />
                ) : (
                  <MetricValue>{metrics.responseTime} sec</MetricValue>
                )}
                <MetricDetail>
                  Efficiency Rating: {calculatedMetrics.responseEfficiency.toFixed(1)}%
                </MetricDetail>
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Total Monitoring Hours</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number" 
                    value={editedMetrics.totalMonitoringHours} 
                    onChange={e => handleMetricChange('totalMonitoringHours', parseInt(e.target.value))} 
                  />
                ) : (
                  <MetricValue>{metrics.totalMonitoringHours}</MetricValue>
                )}
              </MetricCard>
              
              <MetricCard>
                <MetricTitle>Operational Uptime</MetricTitle>
                {isEditing ? (
                  <EditableInput 
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"  
                    value={editedMetrics.operationalUptime} 
                    onChange={e => handleMetricChange('operationalUptime', parseFloat(e.target.value))} 
                  />
                ) : (
                  <MetricValue>{metrics.operationalUptime}%</MetricValue>
                )}
              </MetricCard>
            </InfoGrid>
          </Section>
          
          {/* Daily data input section */}
          <Section>
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
                {Object.keys(metrics.humanIntrusions).map(day => (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>
                      {isEditing ? (
                        <EditableInput 
                          type="number"
                          value={editedMetrics.humanIntrusions[day]} 
                          onChange={e => handleDailyMetricChange('humanIntrusions', day, parseInt(e.target.value))} 
                        />
                      ) : (
                        metrics.humanIntrusions[day]
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <EditableInput 
                          type="number"
                          value={editedMetrics.vehicleIntrusions[day]} 
                          onChange={e => handleDailyMetricChange('vehicleIntrusions', day, parseInt(e.target.value))} 
                        />
                      ) : (
                        metrics.vehicleIntrusions[day]
                      )}
                    </td>
                    <td>
                      {metrics.humanIntrusions[day] + metrics.vehicleIntrusions[day]}
                    </td>
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
  font-weight: 700;
  color: #333;
`;

const MetricChange = styled.span<{ positive?: boolean }>`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#28a745' : '#dc3545'};
  display: flex;
  align-items: center;
  margin-top: 0.25rem;
  
  &::before {
    content: ${props => props.positive ? '"↑"' : '"↓"'};
    margin-right: 0.25rem;
  }
`;

const MetricDetail = styled.div`
  font-size: 0.875rem;
  color: #6c757d;
  margin-top: 0.5rem;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  
  th, td {
    padding: 0.75rem;
    border: 1px solid #dee2e6;
    text-align: left;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: 600;
  }
  
  tbody tr:nth-child(even) {
    background-color: #f8f9fa;
  }
  
  tbody tr:hover {
    background-color: #f1f1f1;
  }
`;

const EditableInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  
  &:focus {
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

// Type for the calculated metrics
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

const PropertyInfoPanel: React.FC<PropertyInfoPanelProps> = ({
  clientData,
  metrics,
  dateRange,
  onMetricsChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetrics, setEditedMetrics] = useState<MetricsData>(metrics);
  
  // Update local state when props change
  React.useEffect(() => {
    setEditedMetrics(metrics);
  }, [metrics]);
  // Calculate derived metrics from either edited or original metrics
  const calculatedMetrics: CalculatedMetrics = React.useMemo(() => {
    const data = isEditing ? editedMetrics : metrics;
    
    // Sum values
    const totalHumanIntrusions = Object.values(data.humanIntrusions).reduce((sum, value) => sum + value, 0);
    const totalVehicleIntrusions = Object.values(data.vehicleIntrusions).reduce((sum, value) => sum + value, 0);
    
    // Averages
    const avgHumanIntrusionsPerDay = totalHumanIntrusions / 7;
    const avgVehicleIntrusionsPerDay = totalVehicleIntrusions / 7;
    
    // Peak days
    const humanEntries = Object.entries(data.humanIntrusions);
    const vehicleEntries = Object.entries(data.vehicleIntrusions);
    
    const peakHumanDay = humanEntries.reduce((max, [day, count]) => 
      count > (max[1] || 0) ? [day, count] : max, ['', 0])[0];
      
    const peakVehicleDay = vehicleEntries.reduce((max, [day, count]) => 
      count > (max[1] || 0) ? [day, count] : max, ['', 0])[0];
    
    // Additional calculated metrics
    const cameraUptime = data.camerasOnline / Math.max(data.totalCameras, 1) * 100;
    const responseEfficiency = 100 - (data.responseTime / 2 * 100); // Normalize 0-2 seconds to 100-0%
    
    return {
      totalHumanIntrusions,
      totalVehicleIntrusions,
      avgHumanIntrusionsPerDay,
      avgVehicleIntrusionsPerDay,
      peakHumanDay,
      peakVehicleDay,
      cameraUptime,
      responseEfficiency
    };
  }, [metrics, editedMetrics, isEditing]);
  
  // Handle manual metric changes
  const handleMetricChange = (key: keyof MetricsData, value: any) => {
    setEditedMetrics(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Handle daily metric input
  const handleDailyMetricChange = (
    metricType: 'humanIntrusions' | 'vehicleIntrusions',
    day: string,
    value: number
  ) => {
    setEditedMetrics(prev => ({
      ...prev,
      [metricType]: {
        ...prev[metricType],
        [day]: value
      }
    }));
  };
  
  // Save changes
  const handleSaveChanges = () => {
    onMetricsChange(editedMetrics);
    setIsEditing(false);
  };
  
  // Cancel changes
  const handleCancelChanges = () => {
    setEditedMetrics(metrics);
    setIsEditing(false);
  };