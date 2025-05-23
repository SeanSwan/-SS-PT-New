import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, CardMedia } from '@mui/material';
import GlowButton from '../../ui/GlowButton';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideocamIcon from '@mui/icons-material/Videocam';

const CreativeHubSection: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Creative Expression Hub</Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Share Your Creative Journey</Typography>
        <Typography paragraph>
          Express yourself through art, dance, and music. Share your creations with the community and get inspired by others.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <GlowButton variant="primary" startIcon={<ArtTrackIcon />}>
            Share Artwork
          </GlowButton>
          <GlowButton variant="secondary" startIcon={<VideocamIcon />}>
            Upload Dance Video
          </GlowButton>
          <GlowButton variant="info" startIcon={<MusicNoteIcon />}>
            Share Music
          </GlowButton>
        </Box>
      </Paper>
      
      <Typography variant="h5" gutterBottom>Featured Creations</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardMedia
              component="img"
              height="200"
              image="https://via.placeholder.com/400x200?text=Dance+Video"
              alt="Dance Video"
            />
            <CardContent>
              <Typography variant="h6">Contemporary Dance</Typography>
              <Typography variant="body2" color="text.secondary">
                By Sarah J. • 3 days ago
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Expressing emotions through movement and flow.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardMedia
              component="img"
              height="200"
              image="https://via.placeholder.com/400x200?text=Artwork"
              alt="Artwork"
            />
            <CardContent>
              <Typography variant="h6">Abstract Painting</Typography>
              <Typography variant="body2" color="text.secondary">
                By Michael T. • 1 week ago
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Inspired by the energy of morning workouts.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardMedia
              component="img"
              height="200"
              image="https://via.placeholder.com/400x200?text=Music+Track"
              alt="Music Track"
            />
            <CardContent>
              <Typography variant="h6">Workout Rhythm</Typography>
              <Typography variant="body2" color="text.secondary">
                By Jessica K. • 2 weeks ago
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                A motivational beat to keep you moving.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <GlowButton variant="secondary">
          View All Creations
        </GlowButton>
      </Box>
    </Box>
  );
};

export default CreativeHubSection;