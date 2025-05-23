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
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Container = styled.div`
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="humanIntrusions" stroke="#8884d8" />
          <Line type="monotone" dataKey="vehicleIntrusions" stroke="#82ca9d" />
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>

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
