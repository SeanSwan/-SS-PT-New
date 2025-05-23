/**
 * shadow.tsx
 * Utility view for displaying shadow variants
 */
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';

// Project imports - adjusted imports for your file structure
import SubCard from '../../components/ui/MainCard';
import MainCard from '../../components/ui/MainCard';
import { SecondaryAction } from '../../components/ui/card';
import { gridSpacing } from '../../store/constants';

// Types
interface ShadowBoxProps {
  shadow: string;
}

interface CustomShadowBoxProps {
  shadow: string;
  label?: string;
  color: string;
}

/**
 * ShadowBox Component
 * Displays a card with the specified shadow level
 */
const ShadowBox: React.FC<ShadowBoxProps> = ({ shadow }) => {
  return (
    <Card sx={{ mb: 3, boxShadow: shadow }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4.5,
          bgcolor: 'primary.light',
          color: 'grey.800'
        }}
      >
        <Box sx={{ color: 'inherit' }}>boxShadow: {shadow}</Box>
      </Box>
    </Card>
  );
};

/**
 * CustomShadowBox Component
 * Displays a card with custom shadow and color
 */
const CustomShadowBox: React.FC<CustomShadowBoxProps> = ({ shadow, label, color }) => {
  return (
    <Card sx={{ mb: 3, boxShadow: shadow }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 3,
          bgcolor: color,
          color: 'background.default'
        }}
      >
        {!label && <Box sx={{ color: 'inherit' }}>boxShadow: {shadow}</Box>}
        {label && <Box sx={{ color: 'inherit' }}>{label}</Box>}
      </Box>
    </Card>
  );
};

/**
 * UtilitiesShadow Component
 * Main component that displays all shadow examples
 */
const UtilitiesShadow: React.FC = () => {
  const theme = useTheme();

  // Array of shadow levels for more efficient rendering
  const shadowLevels = Array.from({ length: 25 }, (_, i) => i.toString());

  return (
    <MainCard title="Basic Shadow" secondary={<SecondaryAction link="https://mui.com/system/shadows/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <SubCard title="Basic Shadow">
            <Grid container spacing={gridSpacing}>
              {shadowLevels.map((level) => (
                <Grid key={level} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ShadowBox shadow={level} />
                </Grid>
              ))}
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={12}>
          <SubCard title="Color Shadow">
            <Grid container spacing={gridSpacing}>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="primary.main" shadow={theme.customShadows?.primary || ''} label="primary" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="secondary.main" shadow={theme.customShadows?.secondary || ''} label="secondary" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="orange.main" shadow={theme.customShadows?.orange || ''} label="orange" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="success.main" shadow={theme.customShadows?.success || ''} label="success" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="warning.main" shadow={theme.customShadows?.warning || ''} label="warning" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <CustomShadowBox color="error.main" shadow={theme.customShadows?.error || ''} label="error" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default UtilitiesShadow;