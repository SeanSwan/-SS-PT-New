# Schedule Component

A premium calendar component that seamlessly integrates with both client and admin dashboards. This component provides a fully-featured scheduling system for fitness trainers, clients, and administrators.

## Features

- **Multi-role support**: Different functionality for admins, trainers, and clients
- **Admin controls**: Create sessions, assign trainers, view all sessions
- **Trainer features**: Manage assigned sessions, mark as completed, confirm bookings
- **Client features**: View available sessions, book sessions, manage bookings
- **Real-time updates**: Auto-refreshes when changes are made by other users
- **Premium UI**: Glass morphism design, animations, and responsive layout

## Component Architecture

The Schedule component has been modularized into separate files for better maintainability and flexibility:

1. **ScheduleContainer.tsx**: Contains all business logic, state management, and API calls
2. **CalendarView.tsx**: Pure UI component that receives props from the container
3. **index.tsx**: Main entry point that exports the components

This architecture allows for:
- Separation of concerns (logic vs. presentation)
- Easier testing (UI and logic can be tested separately)
- Flexibility to use components individually or together

## Usage Options

### Option 1: Use as a single component (recommended)

```jsx
import Schedule from '../components/Schedule';

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>My Calendar</h1>
      <Schedule />
    </div>
  );
}
```

### Option 2: Use container and view separately

```jsx
import { ScheduleContainer, CalendarView } from '../components/Schedule';

function CustomSchedule() {
  // You can add custom wrapper components or additional logic here
  return (
    <div className="custom-schedule-wrapper">
      <h1>Custom Schedule</h1>
      <ScheduleContainer />
    </div>
  );
}
```

### Option 3: Fully custom implementation

```jsx
import { CalendarView } from '../components/Schedule';
import { useState, useEffect } from 'react';
import axios from 'axios';

function FullyCustomSchedule() {
  // Implement your own state and data fetching
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  // ... other state variables and handlers
  
  useEffect(() => {
    // Your custom data fetching logic
    fetchEvents();
  }, []);
  
  return (
    <CalendarView
      events={events}
      loading={loading}
      // Pass all required props
      {...otherProps}
    />
  );
}
```

## Dependency Requirements

This component depends on:

- `react-big-calendar`: For calendar rendering
- `framer-motion`: For animations
- `styled-components`: For styling
- `moment`: For date manipulation
- `@mui/material`: For UI components (Tooltip, IconButton, etc.)
- `socket.io-client`: For real-time updates

Make sure these dependencies are installed in your project.

## API Integration

The component expects certain backend API endpoints to be available:

- `GET /api/sessions`: Get all sessions with optional filters
- `POST /api/sessions`: Create new session slots
- `POST /api/sessions/{id}/book`: Book a session
- `PATCH /api/sessions/{id}/assign`: Assign a trainer to a session
- `PATCH /api/sessions/{id}/cancel`: Cancel a session
- `PATCH /api/sessions/{id}/complete`: Mark a session as completed
- `PATCH /api/sessions/{id}/confirm`: Confirm a session
- `GET /api/users?role=trainer`: Get all trainers
- `GET /api/users?role=client`: Get all clients

The component also integrates with Socket.IO for real-time updates, listening for the `sessions:updated` event.

## Styling Customization

While the component comes with a premium design out of the box, you can customize its appearance:

1. **Via props**: Pass custom class names or style objects to the component
2. **Via styled-components**: Use the styled-components API to extend or override styles
3. **Via CSS variables**: The component uses CSS variables that can be overridden

## Merging Components

If you want to merge the `ScheduleContainer` and `CalendarView` into a single file, follow these steps:

1. Copy all imports from both files
2. Copy all interfaces from both files (remove duplicates)
3. Copy all styled components from `CalendarView.tsx`
4. Copy the state and functions from `ScheduleContainer.tsx`
5. Copy the JSX from `CalendarView.tsx` and replace all prop references with state/handlers directly
6. Export the merged component as the default export
