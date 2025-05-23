// File: frontend/src/components/Reports/MetricsVisualizationPanel.tsx

import React, { useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { MetricsData } from '../../types/reports';
import styled from 'styled-components';

interface MetricsVisualizationPanelProps {
  metrics: MetricsData;
  onChartRendered?: (chartRef: HTMLDivElement) => void;
}

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const MetricCard = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #0070f3;
  margin-bottom: 8px;
`;

const MetricLabel = styled.div`
  font-size: 14px;
  color: #666;
  text-align: center;
`;

/**
 * MetricsVisualizationPanel Component
 * Displays security metrics in a grid of cards and a visual chart representation.
 * Allows for capturing the chart as an image for PDF exports.
 * 
 * @param {MetricsVisualizationPanelProps} props - Component properties
 * @returns {JSX.Element} - Rendered component
 */
const MetricsVisualizationPanel: React.FC<MetricsVisualizationPanelProps> = ({ 
  metrics, 
  onChartRendered 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Effect to notify parent when chart is rendered
  useEffect(() => {
    if (chartRef.current && onChartRendered) {
      onChartRendered(chartRef.current);
    }
  }, [onChartRendered]);

  // Format metrics for display
  const displayMetrics = [
    { label: 'Cameras', value: `${metrics.camerasOnline}/${metrics.totalCameras}` },
    { label: 'AI Accuracy', value: `${metrics.aiAccuracy.toFixed(1)}%` },
    { label: 'Uptime', value: `${metrics.operationalUptime}%` },
    { label: 'Response Time', value: `${metrics.responseTime}s` },
    { 
      label: 'Human Intrusions', 
      value: Object.values(metrics.humanIntrusions).reduce((sum, val) => sum + val, 0) 
    },
    { 
      label: 'Vehicle Intrusions', 
      value: Object.values(metrics.vehicleIntrusions).reduce((sum, val) => sum + val, 0) 
    },
    { label: 'Proactive Alerts', value: metrics.proactiveAlerts },
    { label: 'Potential Threats', value: metrics.potentialThreats },
  ];

  // Get maximum value for proper scaling in chart
  const maxIntrusionValue = Math.max(
    ...Object.values(metrics.humanIntrusions),
    ...Object.values(metrics.vehicleIntrusions)
  );
  
  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">Security Metrics</h3>
      <MetricsGrid>
        {displayMetrics.map((metric, idx) => (
          <MetricCard key={idx}>
            <MetricValue>{metric.value}</MetricValue>
            <MetricLabel>{metric.label}</MetricLabel>
          </MetricCard>
        ))}
      </MetricsGrid>
      
      <div ref={chartRef} className="mt-6 bg-white p-4 border rounded-md">
        <h3 className="text-lg font-medium mb-4">Weekly Activity Visualization</h3>
        <div className="h-64 flex items-end justify-between bg-gray-50 border rounded-md p-4">
          <div className="flex-1 flex flex-col h-full">
            <div className="flex justify-between mb-2">
              <div className="text-sm font-medium">Intrusion Events</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-500">Human</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-500">Vehicle</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex">
              {Object.entries(metrics.humanIntrusions).map(([day, value], index) => {
                const vehicleValue = metrics.vehicleIntrusions[day as keyof typeof metrics.vehicleIntrusions] || 0;
                
                // Calculate height percentage based on maximum value
                const heightPercentageHuman = (value / (maxIntrusionValue || 1)) * 100;
                const heightPercentageVehicle = (vehicleValue / (maxIntrusionValue || 1)) * 100;
                
                return (
                  <div key={day} className="flex-1 flex flex-col items-center justify-end">
                    <div className="w-full flex justify-center gap-1">
                      <div 
                        className="w-4 bg-blue-500 rounded-t-sm" 
                        style={{ height: `${heightPercentageHuman}%`, maxHeight: '90%' }}
                      ></div>
                      <div 
                        className="w-4 bg-green-500 rounded-t-sm" 
                        style={{ height: `${heightPercentageVehicle}%`, maxHeight: '90%' }}
                      ></div>
                    </div>
                    <div className="text-xs mt-2 font-medium text-gray-500">{day.substring(0, 3)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MetricsVisualizationPanel;