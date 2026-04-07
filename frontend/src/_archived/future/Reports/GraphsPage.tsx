// File: frontend/src/components/Reports/GraphsPage.tsx
/**
 * GraphsPage.tsx
 *
 * Displays weekly intrusion data on a line chart (Recharts) and provides
 * form inputs for each day to update the data (Mon–Sun). The left border numbers
 * (Y-axis) adjust automatically based on data values.
 *
 * Future enhancements:
 *   - Allow selection of different chart types (bar, pie, etc.)
 *   - Add filtering options by date or intrusion type.
 *   - Enable interactive features like zoom or hover details.
 */

import React, { useState, useEffect, ChangeEvent } from 'react';
import styled from 'styled-components';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
} from 'victory';

const Container = styled.div`
  padding: 1rem;
  background: var(--bg-surface, #141419);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
`;

// Container for the form inputs.
const FormContainer = styled.div`
  margin-top: 1rem;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const Label = styled.label`
  width: 50px;
`;

const NumberInput = styled.input`
  width: 80px;
  padding: 0.25rem;
`;

export interface GraphData {
  day: string;
  humanIntrusions: number;
  vehicleIntrusions: number;
}

interface GraphsPageProps {
  setChartDataURL: (dataURL: string) => void;
  // Ref for potential chart capture via html2canvas.
  chartRef: React.RefObject<HTMLDivElement>;
}

const initialData: GraphData[] = [
  { day: 'Mon', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Tue', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Wed', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Thu', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Fri', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Sat', humanIntrusions: 0, vehicleIntrusions: 0 },
  { day: 'Sun', humanIntrusions: 0, vehicleIntrusions: 0 },
];

const GraphsPage: React.FC<GraphsPageProps> = ({ setChartDataURL, chartRef }) => {
  // Data state for the chart.
  const [data, setData] = useState<GraphData[]>(initialData);

  // Update state when an input field changes.
  const handleInputChange = (
    dayIndex: number,
    field: 'humanIntrusions' | 'vehicleIntrusions',
    value: number
  ) => {
    const updatedData = data.map((item, index) =>
      index === dayIndex ? { ...item, [field]: value } : item
    );
    setData(updatedData);
  };

  // (Optional) You can use useEffect to update parent with a chart capture.
  useEffect(() => {
    // Future enhancement: Capture chart as image and call setChartDataURL
  }, [data, setChartDataURL]);

  return (
    <Container ref={chartRef}>
      <Title>Weekly Intrusion Analytics</Title>
      <div style={{ width: '100%', height: 300 }}>
        <VictoryChart
          height={300}
          padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }: any) => `${datum.day}: ${datum._y}`}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 11 }}
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                />
              }
            />
          }
        >
          <VictoryAxis
            tickFormat={(t: string) => t}
            style={{
              axis: { stroke: '#E0ECF4' },
              tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
              grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: '#E0ECF4' },
              tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
              grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
            }}
          />
          <VictoryLine
            data={data}
            x="day"
            y="humanIntrusions"
            interpolation="monotoneX"
            animate={{ duration: 800, easing: 'cubicInOut' }}
            style={{ data: { stroke: '#50A0F0', strokeWidth: 2 } }}
          />
          <VictoryLine
            data={data}
            x="day"
            y="vehicleIntrusions"
            interpolation="monotoneX"
            animate={{ duration: 800, easing: 'cubicInOut' }}
            style={{ data: { stroke: '#4ECDC4', strokeWidth: 2 } }}
          />
          <VictoryLegend
            x={80}
            y={0}
            orientation="horizontal"
            style={{ labels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Sora', sans-serif" } }}
            data={[
              { name: 'Human Intrusions', symbol: { fill: '#50A0F0' } },
              { name: 'Vehicle Intrusions', symbol: { fill: '#4ECDC4' } },
            ]}
          />
        </VictoryChart>
      </div>

      {/* Form inputs to update data for each day */}
      <FormContainer>
        {data.map((item, index) => (
          <div key={item.day}>
            <strong>{item.day}</strong>
            <InputRow>
              <Label>Human:</Label>
              <NumberInput
                type="number"
                value={item.humanIntrusions}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleInputChange(index, 'humanIntrusions', parseInt(e.target.value, 10))
                }
              />
              <Label>Vehicle:</Label>
              <NumberInput
                type="number"
                value={item.vehicleIntrusions}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleInputChange(index, 'vehicleIntrusions', parseInt(e.target.value, 10))
                }
              />
            </InputRow>
          </div>
        ))}
      </FormContainer>
    </Container>
  );
};

export default GraphsPage;
