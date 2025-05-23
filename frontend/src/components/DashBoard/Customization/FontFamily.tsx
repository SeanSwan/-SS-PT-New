import React from 'react';
import styled from 'styled-components';

// material-ui
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';

// project imports
import useConfig from '../../../hooks/useConfig';
import MainCard from '../../ui/MainCard';

interface FontOption {
  id: string;
  value: string;
  label: string;
}

// Styled components
const CustomizationContainer = styled.div`
  padding: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FontFamilyCard = styled(MainCard)<{ isActive: boolean }>`
  padding: 6px;
  background-color: ${props => props.isActive ? props.theme.primaryLight : props.theme.grey50};
`;

const FontOptionCard = styled(MainCard)<{ isActive: boolean }>`
  padding: 14px;
  border-width: 1px;
  border-color: ${props => props.isActive ? props.theme.primaryMain : 'inherit'};
`;

const FontLabel = styled(Typography)<{ fontFamily: string }>`
  padding-left: 16px;
  font-family: ${props => props.fontFamily};
`;

const FontFamily: React.FC = () => {
  const { fontFamily, onChangeFontFamily } = useConfig();

  const handleFontChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFontFamily(event.target.value);
  };

  const fonts: FontOption[] = [
    {
      id: 'inter',
      value: `'Inter', sans-serif`,
      label: 'Inter'
    },
    {
      id: 'poppins',
      value: `'Poppins', sans-serif`,
      label: 'Poppins'
    },
    {
      id: 'roboto',
      value: `'Roboto', sans-serif`,
      label: 'Roboto'
    }
  ];

  return (
    <CustomizationContainer>
      <Typography variant="h5">FONT STYLE</Typography>
      <RadioGroup 
        aria-label="font-family" 
        name="font-family" 
        value={fontFamily} 
        onChange={handleFontChange}
      >
        <Grid container spacing={1.25}>
          {fonts.map((font, index) => (
            <Grid key={index} size={12}>
              <FontFamilyCard 
                content={false} 
                isActive={fontFamily === font.value}
              >
                <FontOptionCard
                  content={false}
                  border
                  isActive={fontFamily === font.value}
                >
                  <FormControlLabel
                    sx={{ width: 1 }}
                    control={<Radio value={font.value} sx={{ display: 'none' }} />}
                    label={
                      <FontLabel variant="h5" fontFamily={font.value}>
                        {font.label}
                      </FontLabel>
                    }
                  />
                </FontOptionCard>
              </FontFamilyCard>
            </Grid>
          ))}
        </Grid>
      </RadioGroup>
    </CustomizationContainer>
  );
};

export default FontFamily;