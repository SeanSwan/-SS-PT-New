import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Avatar, Chip, Button } from '@mui/material';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import ChatIcon from '@mui/icons-material/Chat';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 10 
    }
  }
};

// Styled components
const DashboardContainer = styled(motion.div)`
  width: 100%;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  background: rgba(30, 30, 60, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  }
`;

const GlowButton = styled(Button)`
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  text-transform: none;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    background-size: 400%;
    z-index: -1;
    filter: blur(5px);
    width: calc(100% + 4px);
    height: calc(100% + 4px);
    animation: glowing 20s linear infinite;
    opacity: 0;
    transition: opacity .3s ease-in-out;
  }
  
  &:hover:before {
    opacity: 1;
  }
  
  &:hover {
    background: linear-gradient(90deg, #00e5e5, #6a4897);
    box-shadow: 0 0 20px #00ffff;
  }
`;

const CommunityDashboard = () => {
  return (
    <DashboardContainer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ fontSize: 36, color: '#00ffff', mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ color: '#fff' }}>
            Community Hub
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Active Groups Section */}
        <Grid item xs={12} md={8}>
          <motion.div variants={itemVariants}>
            <StyledCard>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3, color: '#00ffff' }}>
                  Active Groups
                </Typography>

                <Grid container spacing={2}>
                  {/* Group 1 */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0, 255, 255, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(0, 255, 255, 0.2)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#00ffff', color: '#0a0a1a', mr: 2 }}>
                          <FitnessCenterIcon />
                        </Avatar>
                        <Typography variant="h6">HIIT Warriors</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                        High-intensity interval training group with daily challenges
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip 
                          icon={<PeopleIcon />} 
                          label="126 members" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <GlowButton size="small">
                          Join
                        </GlowButton>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Group 2 */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(120, 81, 169, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(120, 81, 169, 0.2)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#7851a9', color: '#ffffff', mr: 2 }}>
                          <DirectionsRunIcon />
                        </Avatar>
                        <Typography variant="h6">Marathon Prep</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                        Training together for upcoming marathon events
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip 
                          icon={<PeopleIcon />} 
                          label="89 members" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <GlowButton size="small">
                          Join
                        </GlowButton>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Group 3 */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255, 183, 0, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(255, 183, 0, 0.2)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#ffb700', color: '#0a0a1a', mr: 2 }}>
                          <EmojiEventsIcon />
                        </Avatar>
                        <Typography variant="h6">Wellness Journey</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                        Holistic wellness combining fitness, nutrition, and mindfulness
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip 
                          icon={<PeopleIcon />} 
                          label="204 members" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <GlowButton size="small">
                          Join
                        </GlowButton>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Group 4 */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0, 191, 143, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(0, 191, 143, 0.2)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: '#00bf8f', color: '#ffffff', mr: 2 }}>
                          <ChatIcon />
                        </Avatar>
                        <Typography variant="h6">Nutrition Support</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                        Share meal plans, recipes, and nutrition advice
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Chip 
                          icon={<PeopleIcon />} 
                          label="153 members" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <GlowButton size="small">
                          Join
                        </GlowButton>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <GlowButton>
                    View All Groups
                  </GlowButton>
                </Box>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>

        {/* Upcoming Events Section */}
        <Grid item xs={12} md={4}>
          <motion.div variants={itemVariants}>
            <StyledCard>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3, color: '#00ffff' }}>
                  Upcoming Events
                </Typography>

                {/* Event 1 */}
                <Paper sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'rgba(255, 65, 108, 0.1)', 
                  borderRadius: 2,
                  border: '1px solid rgba(255, 65, 108, 0.2)'
                }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(255, 65, 108, 0.2)', 
                      p: 1.5,
                      borderRadius: 1,
                      textAlign: 'center',
                      minWidth: '60px'
                    }}>
                      <Typography variant="subtitle2">JUN</Typography>
                      <Typography variant="h5">15</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Group HIIT Session</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                        10:00 AM - 11:30 AM • Studio A
                      </Typography>
                      <GlowButton size="small">Register</GlowButton>
                    </Box>
                  </Box>
                </Paper>

                {/* Event 2 */}
                <Paper sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'rgba(0, 191, 143, 0.1)', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 191, 143, 0.2)'
                }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(0, 191, 143, 0.2)', 
                      p: 1.5,
                      borderRadius: 1,
                      textAlign: 'center',
                      minWidth: '60px'
                    }}>
                      <Typography variant="subtitle2">JUN</Typography>
                      <Typography variant="h5">18</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Nutrition Workshop</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                        6:00 PM - 7:30 PM • Online
                      </Typography>
                      <GlowButton size="small">Register</GlowButton>
                    </Box>
                  </Box>
                </Paper>

                {/* Event 3 */}
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(120, 81, 169, 0.1)', 
                  borderRadius: 2,
                  border: '1px solid rgba(120, 81, 169, 0.2)'
                }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ 
                      bgcolor: 'rgba(120, 81, 169, 0.2)', 
                      p: 1.5,
                      borderRadius: 1,
                      textAlign: 'center',
                      minWidth: '60px'
                    }}>
                      <Typography variant="subtitle2">JUN</Typography>
                      <Typography variant="h5">22</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Charity Run</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                        8:00 AM - 11:00 AM • City Park
                      </Typography>
                      <GlowButton size="small">Register</GlowButton>
                    </Box>
                  </Box>
                </Paper>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <GlowButton>
                    View All Events
                  </GlowButton>
                </Box>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>

        {/* Community Challenges Section */}
        <Grid item xs={12}>
          <motion.div variants={itemVariants}>
            <StyledCard>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3, color: '#00ffff' }}>
                  Community Challenges
                </Typography>

                <Grid container spacing={2}>
                  {/* Challenge 1 */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(0, 255, 255, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>30-Day Fitness</Typography>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, flex: 1 }}>
                        Complete a workout every day for 30 days and track your progress
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label="621 participants" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          Ends in 12 days
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Challenge 2 */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(255, 183, 0, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(255, 183, 0, 0.2)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>100-Mile Club</Typography>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, flex: 1 }}>
                        Run, walk, or jog a total of 100 miles this month
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label="332 participants" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          Ends in 18 days
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Challenge 3 */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ 
                      p: 2, 
                      bgcolor: 'rgba(120, 81, 169, 0.1)', 
                      borderRadius: 2,
                      border: '1px solid rgba(120, 81, 169, 0.2)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>Healthy Habits</Typography>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, flex: 1 }}>
                        Build 5 new healthy habits over the course of 30 days
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label="479 participants" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(0, 0, 0, 0.3)' }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          Ends in 6 days
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <GlowButton>
                    Join a Challenge
                  </GlowButton>
                </Box>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>
      </Grid>
    </DashboardContainer>
  );
};

export default CommunityDashboard;