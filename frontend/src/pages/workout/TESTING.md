# Workout Dashboard Testing Strategy

## Overview

This document outlines the testing strategy for the Workout Dashboard module. We use a comprehensive approach that includes unit tests, integration tests, and end-to-end tests to ensure all components function correctly and the overall user experience is smooth.

## Testing Layers

### 1. Unit Tests

Unit tests focus on testing individual components and hooks in isolation.

#### Components to Test:

- **WorkoutDashboard**: Test tab switching, loading states, and error handling
- **ClientProgress**: Test chart data transformations and filtering
- **WorkoutPlanner**: Test plan creation, exercise addition/removal, and validation
- **RecentSessions**: Test session filtering and detail displays
- **TabNavigation**: Test tab selection
- **ClientSelector**: Test client selection functionality
- **ErrorDisplay**: Test different error message displays
- **ExerciseSelector**: Test filtering and selection capabilities

#### Hooks to Test:

- **useDashboardState**: Test state management, client selection, and authorization checks
- **useWorkoutProgress**: Test data fetching, filtering, and transformations

#### Examples:

```javascript
// Testing useDashboardState hook
describe('useDashboardState', () => {
  // Mock dependencies
  const mockNavigate = jest.fn();
  const mockDispatch = jest.fn();
  
  beforeEach(() => {
    // Set up mocks
    jest.clearAllMocks();
    useParams.mockReturnValue({ userId: 'test-user-id' });
    useNavigate.mockReturnValue(mockNavigate);
    useAppDispatch.mockReturnValue(mockDispatch);
    useAuth.mockReturnValue({
      user: { id: 'current-user', role: 'trainer' },
      clients: [{ id: 'client-1', role: 'client' }],
      loading: false,
      error: null,
      loadClients: jest.fn()
    });
    useAppSelector.mockReturnValue({ selectedClientId: 'client-1' });
  });
  
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useDashboardState());
    
    expect(result.current.activeTab).toBe('progress');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
  
  it('sets the selected client from URL', () => {
    renderHook(() => useDashboardState());
    
    expect(mockDispatch).toHaveBeenCalledWith(setSelectedClient('test-user-id'));
  });
  
  it('handles client change correctly', () => {
    const { result } = renderHook(() => useDashboardState());
    
    const mockEvent = {
      target: { value: 'new-client-id' }
    };
    
    act(() => {
      result.current.handleClientChange(mockEvent);
    });
    
    expect(mockDispatch).toHaveBeenCalledWith(setSelectedClient('new-client-id'));
    expect(mockNavigate).toHaveBeenCalledWith('/workout/new-client-id');
  });
  
  it('checks authorization correctly', () => {
    const { result } = renderHook(() => useDashboardState());
    
    expect(result.current.isAuthorized).toBe(true);
    
    // Test with non-matching user and non-admin role
    useAuth.mockReturnValue({
      user: { id: 'different-user', role: 'client' },
      clients: [],
      loading: false,
      error: null
    });
    
    const { result: unauthorizedResult } = renderHook(() => useDashboardState());
    
    expect(unauthorizedResult.current.isAuthorized).toBe(false);
  });
});
```

### 2. Integration Tests

Integration tests verify that components work together correctly.

#### Test Scenarios:

- **Dashboard Tab Navigation**: Ensure clicking tabs shows the correct content
- **Client Selection**: Verify selecting a client loads their data
- **Exercise Selection in Planner**: Test adding exercises to a workout plan
- **Time Filter in Progress View**: Test applying time filters updates charts
- **Session Detail View**: Test viewing session details shows correct information

#### Examples:

```javascript
describe('WorkoutDashboard Integration', () => {
  beforeEach(() => {
    // Set up mock store and router
    const store = configureTestStore({
      workout: {
        clientProgress: { data: mockProgressData, loading: false, error: null },
        statistics: { data: mockStatisticsData, loading: false, error: null },
        selectedClientId: 'client-1',
        timeRange: '30days'
      },
      auth: {
        user: { id: 'trainer-1', role: 'trainer' },
        clients: mockClients,
        loading: false,
        error: null
      },
      exercise: {
        exercises: mockExercises,
        loading: false,
        error: null
      }
    });
    
    render(
      <Provider store={store}>
        <MemoryRouter>
          <WorkoutDashboard />
        </MemoryRouter>
      </Provider>
    );
  });
  
  it('navigates between tabs correctly', () => {
    // Initially shows progress tab
    expect(screen.getByText('Your Fitness Progress')).toBeInTheDocument();
    
    // Click on Workout Planner tab
    fireEvent.click(screen.getByText('Workout Planner'));
    
    // Should show workout planner content
    expect(screen.getByText('Create Workout Plan')).toBeInTheDocument();
    
    // Click on Recent Sessions tab
    fireEvent.click(screen.getByText('Recent Sessions'));
    
    // Should show recent sessions content
    expect(screen.getByText('Recent Workout Sessions')).toBeInTheDocument();
  });
  
  it('selects a client and loads their data', async () => {
    // Find client selector
    const selector = screen.getByLabelText('Viewing data for:');
    
    // Select a different client
    fireEvent.change(selector, { target: { value: 'client-2' } });
    
    // Should dispatch action to change selected client
    await waitFor(() => {
      expect(store.getActions()).toContainEqual({
        type: 'workout/setSelectedClient',
        payload: 'client-2'
      });
    });
    
    // Should trigger data fetch for new client
    await waitFor(() => {
      expect(store.getActions()).toContainEqual(
        expect.objectContaining({
          type: 'workout/fetchClientProgress/pending'
        })
      );
    });
  });
});
```

### 3. End-to-End Tests

E2E tests validate complete user flows across the application.

#### Test Flows:

- **Trainer Views Client Progress**: Login as trainer, navigate to dashboard, select client, view progress
- **Create Workout Plan**: Login, navigate to planner, create plan, add exercises, save plan
- **View Workout History**: Login, navigate to sessions, filter by time, view session details
- **Client Views Own Progress**: Login as client, navigate to dashboard, view progress charts

#### Examples:

```javascript
describe('Workout Dashboard E2E', () => {
  beforeEach(() => {
    // Set up mock API responses
    cy.intercept('GET', '/api/clients', { fixture: 'clients.json' });
    cy.intercept('GET', '/api/workout/progress/*', { fixture: 'progress.json' });
    cy.intercept('GET', '/api/workout/statistics/*', { fixture: 'statistics.json' });
    cy.intercept('GET', '/api/exercises', { fixture: 'exercises.json' });
    
    // Login as trainer
    cy.login('trainer@example.com', 'password123');
  });
  
  it('trainer can view client progress', () => {
    // Navigate to workout dashboard
    cy.visit('/workout');
    
    // Select a client from dropdown
    cy.get('[data-testid="client-selector"]').select('client-1');
    
    // Verify progress tab is active
    cy.get('[data-testid="tab-progress"]').should('have.attr', 'aria-selected', 'true');
    
    // Verify client data is displayed
    cy.get('[data-testid="skill-radar-chart"]').should('be.visible');
    cy.get('[data-testid="summary-metrics"]').contains('Total Workouts: 25');
    
    // Change time filter
    cy.get('[data-testid="time-range-filter"]').select('7days');
    
    // Verify charts update
    cy.get('[data-testid="weekday-chart"]').should('be.visible');
  });
  
  it('can create a workout plan', () => {
    // Navigate to workout dashboard
    cy.visit('/workout');
    
    // Switch to planner tab
    cy.get('[data-testid="tab-planner"]').click();
    
    // Fill in plan details
    cy.get('#planTitle').type('12-Week Strength Program');
    cy.get('#planDescription').type('Progressive overload strength training');
    cy.get('#planDuration').select('12');
    
    // Add exercises to day 1
    cy.get('[data-testid="add-exercise-button"]').click();
    cy.get('[data-testid="exercise-search"]').type('squat');
    cy.get('[data-testid="exercise-item-0"]').click();
    
    // Set exercise details
    cy.get('[data-testid="exercise-sets-input"]').clear().type('5');
    cy.get('[data-testid="exercise-reps-input"]').clear().type('5');
    
    // Save the plan
    cy.get('[data-testid="save-plan-button"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
});
```

## Testing Tools

- **Jest**: Primary test runner and assertion library
- **React Testing Library**: Component testing with focus on user behavior
- **MSW (Mock Service Worker)**: API mocking for integration tests
- **Redux Mock Store**: Testing Redux integration
- **Cypress**: End-to-end testing

## Test Coverage Goals

We aim for the following test coverage:

- **Unit Tests**: 90%+ coverage of all components and hooks
- **Integration Tests**: Cover all critical user interactions
- **E2E Tests**: Cover all main user flows

## CI/CD Integration

Tests are integrated into our CI/CD pipeline:

1. **Pull Request Checks**: All tests must pass before PR can be merged
2. **Pre-Deploy Tests**: Full test suite runs before deployment
3. **Performance Benchmarks**: Track component render times to catch performance regressions

## Manual Testing Checklist

In addition to automated tests, manual testing should verify:

- **Responsive Design**: Test on various screen sizes
- **Accessibility**: Verify keyboard navigation and screen reader support
- **Cross-Browser**: Test on Chrome, Firefox, Safari, and Edge
- **Mobile Experience**: Test on iOS and Android devices

## Implementing Tests

1. Create test files adjacent to components (`Component.test.tsx`)
2. Use consistent naming patterns for tests
3. Group tests logically by feature or behavior
4. Keep test code clean and maintainable

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch

# Run specific test file
npm test -- WorkoutDashboard.test.tsx

# Run E2E tests
npm run cy:run
```
