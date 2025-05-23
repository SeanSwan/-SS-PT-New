# Client Dashboard

The Client Dashboard is the main interface for clients to interact with the Swan Studios platform. It provides a comprehensive suite of tools for fitness tracking, gamification, creative expression, community engagement, and profile management.

## Component Structure

- **ClientDashboard.tsx**: Main entry point for the client dashboard
- **ClientLayout.tsx**: Layout component that manages the overall structure including sidebar and content areas
- **ClientSidebar.tsx**: Navigation sidebar with links to all sections
- **ClientMainContent.tsx**: Wrapper for main content display with consistent styling

### Section Components

The dashboard is divided into several section components:

1. **OverviewSection**: Main dashboard landing page with gamification stats and personalized overview
2. **MyWorkoutsSection**: Access to fitness and dance workout plans
3. **ProgressSection**: Tracks client's progress with metrics, charts, and NASM protocol tracking
4. **GamificationSection**: Displays achievements, rewards, and gamification elements
5. **CreativeHubSection**: Space for creative expression including artwork, dance videos, and music
6. **CommunitySection**: Community features, meetups, and social interactions
7. **ProfileSection**: Client profile management
8. **SettingsSection**: Dashboard and account settings

## Styling

The dashboard uses a combination of styled-components with a consistent theme defined in `ClientLayout.tsx`. The UI follows a dark-themed aesthetic with neon accent colors and sleek, modern design elements.

## Key Features

- Responsive design that works on all device sizes
- Animated transitions between sections
- Gamification elements including levels, points, badges, and trophies
- Comprehensive progress tracking with visualization
- Community and social features
- Creative expression tools

## Usage

The ClientDashboard component is rendered in the main application routing. It handles its own internal routing through the sidebar navigation.

## Example

```jsx
import ClientDashboard from './components/ClientDashboard';

function App() {
  return (
    <div className="App">
      <ClientDashboard />
    </div>
  );
}
```

## Development Notes

When adding new features to the client dashboard:

1. Create new section components in the `sections` folder
2. Add the section to the `DashboardSection` enum in `ClientLayout.tsx`
3. Add the section to the `renderActiveSection` function in `ClientLayout.tsx`
4. Add the navigation item to `ClientSidebar.tsx`

UI components from `ClientMainContent.tsx` can be reused across sections for consistency.
