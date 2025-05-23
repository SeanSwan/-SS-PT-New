import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Fab,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FitnessCenter as ExerciseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as DurationIcon,
  TrendingUp as DifficultyIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useWorkoutMcp, Exercise } from '../../hooks/useWorkoutMcp';

interface ExerciseLibraryProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  selectedExercises?: string[];
  multiSelect?: boolean;
  filterOptions?: {
    categories?: string[];
    muscleGroups?: string[];
    equipment?: string[];
    difficulties?: string[];
  };
}

const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  onExerciseSelect,
  selectedExercises = [],
  multiSelect = false,
  filterOptions = {}
}) => {
  const { getWorkoutRecommendations, loading, error } = useWorkoutMcp();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    goal: 'general'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock data for fallback when MCP server is unavailable
  const mockExercises: Exercise[] = [
    {
      id: '1',
      name: 'Push-ups',
      description: 'Classic upper body exercise targeting chest, shoulders, and triceps',
      difficulty: 'beginner',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '1', name: 'Chest', shortName: 'chest', bodyRegion: 'upper_body' },
        { id: '2', name: 'Shoulders', shortName: 'shoulders', bodyRegion: 'upper_body' },
        { id: '3', name: 'Triceps', shortName: 'triceps', bodyRegion: 'upper_body' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '2',
      name: 'Squats',
      description: 'Fundamental lower body exercise for legs and glutes',
      difficulty: 'beginner',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '4', name: 'Quadriceps', shortName: 'quads', bodyRegion: 'lower_body' },
        { id: '5', name: 'Glutes', shortName: 'glutes', bodyRegion: 'lower_body' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '3',
      name: 'Deadlift',
      description: 'Full body compound movement focusing on posterior chain',
      difficulty: 'intermediate',
      category: 'strength',
      exerciseType: 'compound',
      muscleGroups: [
        { id: '6', name: 'Hamstrings', shortName: 'hamstrings', bodyRegion: 'lower_body' },
        { id: '5', name: 'Glutes', shortName: 'glutes', bodyRegion: 'lower_body' },
        { id: '7', name: 'Lower Back', shortName: 'lower_back', bodyRegion: 'core' }
      ],
      equipment: [{ id: '2', name: 'Barbell', category: 'free_weights' }]
    },
    {
      id: '4',
      name: 'Plank',
      description: 'Core stability exercise for abdominal strength',
      difficulty: 'beginner',
      category: 'core',
      exerciseType: 'isolation',
      muscleGroups: [
        { id: '8', name: 'Core', shortName: 'core', bodyRegion: 'core' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    },
    {
      id: '5',
      name: 'Bicycle Crunches',
      description: 'Dynamic ab exercise with rotational movement',
      difficulty: 'beginner',
      category: 'core',
      exerciseType: 'isolation',
      muscleGroups: [
        { id: '8', name: 'Core', shortName: 'core', bodyRegion: 'core' },
        { id: '9', name: 'Obliques', shortName: 'obliques', bodyRegion: 'core' }
      ],
      equipment: [{ id: '1', name: 'Bodyweight', category: 'bodyweight' }]
    }
  ];

  // Load exercises on component mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Filter exercises based on search and filters
  useEffect(() => {
    let filtered = exercises;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(exercise => exercise.category === filters.category);
    }

    // Muscle group filter
    if (filters.muscleGroup) {
      filtered = filtered.filter(exercise =>
        exercise.muscleGroups?.some(mg => mg.name === filters.muscleGroup)
      );
    }

    // Equipment filter
    if (filters.equipment) {
      filtered = filtered.filter(exercise =>
        exercise.equipment?.some(eq => eq.name === filters.equipment)
      );
    }

    // Difficulty filter
    if (filters.difficulty) {
      filtered = filtered.filter(exercise => exercise.difficulty === filters.difficulty);
    }

    setFilteredExercises(filtered);
  }, [exercises, searchTerm, filters]);

  const loadExercises = async () => {
    try {
      // Try to load from MCP server first
      const response = await getWorkoutRecommendations({
        userId: 'admin-library', // Special ID for admin library view
        goal: filters.goal,
        limit: 50
      });

      if (response?.exercises && response.exercises.length > 0) {
        setExercises(response.exercises);
      } else {
        // Fallback to mock data
        setExercises(mockExercises);
      }
    } catch (err) {
      console.error('Failed to load exercises from MCP:', err);
      // Use mock data as fallback
      setExercises(mockExercises);
    }
  };

  const handleExerciseClick = (exercise: Exercise) => {
    if (onExerciseSelect) {
      onExerciseSelect(exercise);
    }
    if (!multiSelect) {
      setSelectedExercise(exercise);
      setDialogOpen(true);
    }
  };

  const isExerciseSelected = (exerciseId: string) => {
    return selectedExercises.includes(exerciseId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'strength': return 'primary';
      case 'cardio': return 'error';
      case 'flexibility': return 'secondary';
      case 'core': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Exercise Library
        </Typography>
        <Tooltip title="Add New Exercise">
          <Fab
            color="primary"
            size="medium"
            onClick={() => {/* TODO: Implement add exercise */}}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Goal</InputLabel>
              <Select
                value={filters.goal}
                label="Goal"
                onChange={(e) => setFilters({ ...filters, goal: e.target.value })}
              >
                <MenuItem value="general">General Fitness</MenuItem>
                <MenuItem value="strength">Strength</MenuItem>
                <MenuItem value="hypertrophy">Muscle Building</MenuItem>
                <MenuItem value="endurance">Endurance</MenuItem>
                <MenuItem value="weight_loss">Weight Loss</MenuItem>
                <MenuItem value="rehabilitation">Rehabilitation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        {showFilters && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.category}
                      label="Category"
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <MenuItem value="strength">Strength</MenuItem>
                      <MenuItem value="cardio">Cardio</MenuItem>
                      <MenuItem value="flexibility">Flexibility</MenuItem>
                      <MenuItem value="core">Core</MenuItem>
                      <MenuItem value="balance">Balance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Muscle Group</InputLabel>
                    <Select
                      value={filters.muscleGroup}
                      label="Muscle Group"
                      onChange={(e) => setFilters({ ...filters, muscleGroup: e.target.value })}
                    >
                      <MenuItem value="">All Muscle Groups</MenuItem>
                      <MenuItem value="Chest">Chest</MenuItem>
                      <MenuItem value="Back">Back</MenuItem>
                      <MenuItem value="Shoulders">Shoulders</MenuItem>
                      <MenuItem value="Arms">Arms</MenuItem>
                      <MenuItem value="Legs">Legs</MenuItem>
                      <MenuItem value="Core">Core</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Equipment</InputLabel>
                    <Select
                      value={filters.equipment}
                      label="Equipment"
                      onChange={(e) => setFilters({ ...filters, equipment: e.target.value })}
                    >
                      <MenuItem value="">Any Equipment</MenuItem>
                      <MenuItem value="Bodyweight">Bodyweight</MenuItem>
                      <MenuItem value="Dumbbells">Dumbbells</MenuItem>
                      <MenuItem value="Barbell">Barbell</MenuItem>
                      <MenuItem value="Machines">Machines</MenuItem>
                      <MenuItem value="Resistance Bands">Resistance Bands</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Difficulty</InputLabel>
                    <Select
                      value={filters.difficulty}
                      label="Difficulty"
                      onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                    >
                      <MenuItem value="">All Levels</MenuItem>
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Exercise Grid */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          MCP Server connection issue. Showing cached exercises.
        </Alert>
      )}

      <Grid container spacing={2}>
        {filteredExercises.map((exercise) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={exercise.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                border: isExerciseSelected(exercise.id) ? '2px solid' : '1px solid',
                borderColor: isExerciseSelected(exercise.id) ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: (theme) => theme.shadows[8],
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}
              onClick={() => handleExerciseClick(exercise)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h3" noWrap>
                    {exercise.name}
                  </Typography>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement edit exercise
                  }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {exercise.description.length > 80 
                    ? `${exercise.description.substring(0, 80)}...` 
                    : exercise.description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {exercise.category && (
                    <Chip
                      icon={<CategoryIcon />}
                      label={exercise.category}
                      color={getCategoryColor(exercise.category)}
                      size="small"
                    />
                  )}
                  {exercise.difficulty && (
                    <Chip
                      icon={<DifficultyIcon />}
                      label={exercise.difficulty}
                      color={getDifficultyColor(exercise.difficulty)}
                      size="small"
                    />
                  )}
                </Box>

                {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Target Muscles:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {exercise.muscleGroups.slice(0, 3).map((mg) => (
                        <Chip
                          key={mg.id}
                          label={mg.shortName}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {exercise.muscleGroups.length > 3 && (
                        <Chip
                          label={`+${exercise.muscleGroups.length - 3} more`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </Box>
                )}

                {exercise.equipment && exercise.equipment.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Equipment:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {exercise.equipment.slice(0, 2).map((eq) => (
                        <Chip
                          key={eq.id}
                          label={eq.name}
                          size="small"
                          variant="outlined"
                          icon={<ExerciseIcon />}
                        />
                      ))}
                      {exercise.equipment.length > 2 && (
                        <Chip
                          label={`+${exercise.equipment.length - 2} more`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Button size="small" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedExercise(exercise);
                  setDialogOpen(true);
                }}>
                  View Details
                </Button>
                {multiSelect && (
                  <Button
                    size="small"
                    variant={isExerciseSelected(exercise.id) ? "contained" : "outlined"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onExerciseSelect) {
                        onExerciseSelect(exercise);
                      }
                    }}
                  >
                    {isExerciseSelected(exercise.id) ? 'Selected' : 'Select'}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Exercise Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedExercise && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">
                  {selectedExercise.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {selectedExercise.category && (
                    <Chip
                      label={selectedExercise.category}
                      color={getCategoryColor(selectedExercise.category)}
                    />
                  )}
                  {selectedExercise.difficulty && (
                    <Chip
                      label={selectedExercise.difficulty}
                      color={getDifficultyColor(selectedExercise.difficulty)}
                    />
                  )}
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedExercise.description}
              </Typography>

              {selectedExercise.muscleGroups && selectedExercise.muscleGroups.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Target Muscle Groups
                  </Typography>
                  <List dense>
                    {selectedExercise.muscleGroups.map((mg) => (
                      <ListItem key={mg.id}>
                        <ListItemText
                          primary={mg.name}
                          secondary={`${mg.shortName} - ${mg.bodyRegion.replace('_', ' ')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Required Equipment
                  </Typography>
                  <List dense>
                    {selectedExercise.equipment.map((eq) => (
                      <ListItem key={eq.id}>
                        <ListItemText
                          primary={eq.name}
                          secondary={eq.category.replace('_', ' ')}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {selectedExercise.isRehabExercise && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This is a rehabilitation exercise. Please consult with a qualified healthcare provider.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>
                Close
              </Button>
              {onExerciseSelect && (
                <Button
                  variant="contained"
                  onClick={() => {
                    onExerciseSelect(selectedExercise);
                    setDialogOpen(false);
                  }}
                >
                  Select Exercise
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ExerciseLibrary;