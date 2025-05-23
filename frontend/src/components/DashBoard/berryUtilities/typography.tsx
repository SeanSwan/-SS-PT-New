/**
 * typography.tsx
 * Utility view for displaying typography variants
 */
import React from 'react';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// Project imports - adjusted imports for your file structure
import SubCard from '../../components/ui/MainCard';
import MainCard from '../../components/ui/MainCard';
// Use the correct export name from your card module
import { SecondaryAction } from '../../components/ui/card';
import { gridSpacing } from '../../store/constants';

/**
 * Typography Component
 * Displays examples of all typography variants
 */
const TypographyPage: React.FC = () => {
  return (
    <MainCard title="Basic Typography" secondary={<SecondaryAction link="https://mui.com/system/typography/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Heading">
            <Grid container direction="column" spacing={1}>
              <Grid>
                <Typography variant="h1" gutterBottom>
                  h1. Heading
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="h2" gutterBottom>
                  h2. Heading
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="h3" gutterBottom>
                  h3. Heading
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="h4" gutterBottom>
                  h4. Heading
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="h5" gutterBottom>
                  h5. Heading
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="h6" gutterBottom>
                  h6. Heading
                </Typography>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Sub title">
            <Grid container direction="column" spacing={1}>
              <Grid>
                <Typography variant="subtitle1" gutterBottom>
                  subtitle1. Lorem ipsum dolor sit connecter adieu siccing eliot. Quos blanditiis tenetur
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="subtitle2" gutterBottom>
                  subtitle2. Lorem ipsum dolor sit connecter adieu siccing eliot. Quos blanditiis tenetur
                </Typography>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Body">
            <Grid container direction="column" spacing={1}>
              <Grid>
                <Typography variant="body1" gutterBottom>
                  body1. Lorem ipsum dolor sit connecter adieu siccing eliot. Quos blanditiis tenetur unde suscipit, quam beatae rerum
                  inventore consectetur, neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum quasi quidem
                  quibusdam.
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="body2" gutterBottom>
                  body2. Lorem ipsum dolor sit connecter adieu siccing eliot. Quos blanditiis tenetur unde suscipit, quam beatae rerum
                  inventore consectetur, neque doloribus, cupiditate numquam dignissimos laborum fugiat deleniti? Eum quasi quidem
                  quibusdam.
                </Typography>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Extra">
            <Grid container direction="column" spacing={1}>
              <Grid>
                <Typography variant="button" display="block" gutterBottom>
                  button text
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="caption" display="block" gutterBottom>
                  caption text
                </Typography>
              </Grid>
              <Grid>
                <Typography variant="overline" display="block" gutterBottom>
                  overline text
                </Typography>
              </Grid>
              <Grid>
                <Typography
                  variant="body2"
                  color="primary"
                  component={Link}
                  href="https://swanstudios.io"
                  target="_blank"
                  underline="hover"
                  gutterBottom
                  sx={{ display: 'block' }}
                >
                  https://swanstudios.io
                </Typography>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default TypographyPage;