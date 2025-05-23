# Schedule Component Integration

## Overview
The Schedule component is fully integrated with the SwanStudios application through:
1. Proper routing setup in `main-routes.tsx`
2. Navigation links in the Header component
3. A comprehensive wrapper system that maintains styling consistency

## Component Structure

```
components/Schedule/
├── schedule.tsx            - Main component with calendar functionality
├── ScheduleContainer.tsx   - Container component that manages state & API calls
├── ScheduleWrapper.tsx     - Wrapper that provides consistent styling
├── CustomToolbar.tsx       - Accessible toolbar for calendar navigation
├── AccessibleEvent.tsx     - Accessible event display component
├── HighContrastToggle.tsx  - Toggle for high-contrast mode
├── ScreenReaderAnnouncements.tsx - Screen reader support utilities
└── ACCESSIBILITY_IMPROVEMENTS.md - Documentation of accessibility features
```

## Integration Points

### Routing
The schedule component is registered in the main routes file:
```jsx
// In main-routes.tsx
{
  path: 'schedule',
  element: (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <ScheduleWrapper />
      </Suspense>
    </ProtectedRoute>
  )
}
```

### Navigation
The header component contains links to the schedule:
```jsx
// In header.tsx
<StyledNavLink 
  to="/schedule" 
  className={isActive('/schedule') ? "active" : ""}
  variants={itemVariants}
  aria-label="Access training schedule"
>
  <EventNoteIcon style={{ marginRight: '5px', fontSize: '1rem' }} />Schedule
</StyledNavLink>
```

## Accessibility Features
The Schedule component includes numerous accessibility improvements:
1. Screen reader support with ARIA live regions
2. High contrast mode toggle
3. Keyboard navigation support
4. Proper semantic structure
5. Clear status indicators

See `ACCESSIBILITY_IMPROVEMENTS.md` for full details.

## Usage
The schedule component is protected and only available to authenticated users. It provides different functionality based on user roles:
- **Admin**: Can create, modify, and manage all sessions
- **Trainer**: Can view and manage sessions assigned to them
- **Client**: Can book available sessions and manage their bookings