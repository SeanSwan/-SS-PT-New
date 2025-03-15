import React from 'react';
import styled from 'styled-components';

// material-ui
import Grid from '@mui/material/Grid2';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

// project imports
import useConfig from '../../../hooks/useConfig';

// Styled components
const CustomizationContainer = styled.div`
  padding: 0 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SliderContainer = styled.div`
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
`;

const GrowContainer = styled.div`
  flex-grow: 1;
`;

// concat 'px'
function valueText(value: number): string {
  return `${value}px`;
}

const BorderRadius: React.FC = () => {
  const { borderRadius, onChangeBorderRadius } = useConfig();

  const handleChange = (_event: Event, newValue: number | number[]) => {
    onChangeBorderRadius(newValue as number);
  };

  return (
    <CustomizationContainer>
      <Typography variant="h5">BORDER RADIUS</Typography>
      <SliderContainer>
        <Typography variant="h6">4px</Typography>
        <GrowContainer>
          <Slider
            size="small"
            value={borderRadius}
            onChange={handleChange}
            getAriaValueText={valueText}
            valueLabelDisplay="on"
            aria-labelledby="discrete-slider-small-steps"
            min={4}
            max={24}
            color="primary"
            sx={{
              '& .MuiSlider-valueLabel': {
                color: 'primary.light'
              }
            }}
          />
        </GrowContainer>
        <Typography variant="h6">24px</Typography>
      </SliderContainer>
    </CustomizationContainer>
  );
};

export default BorderRadius;