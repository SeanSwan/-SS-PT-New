/**
 * Schedule Component - Main Export File
 * 
 * This file serves as the main entry point for the Schedule component.
 * It exports the ScheduleContainer component by default, which handles all
 * the logic and renders the CalendarView component.
 * 
 * This approach allows for:
 * 1. Easy imports with `import Schedule from './components/Schedule'`
 * 2. Separation of concerns between logic and presentation
 * 3. Flexibility to use either the combined component or individual components
 */

import ScheduleContainer from './ScheduleContainer';
import CalendarView from './CalendarView';

// Export the container as the default
export default ScheduleContainer;

// Also export individual components for flexibility
export { ScheduleContainer, CalendarView };

/**
 * Usage Examples:
 * 
 * 1. Standard usage - Import the default (container with built-in UI):
 *    import Schedule from './components/Schedule';
 * 
 *    function App() {
 *      return <Schedule />;
 *    }
 * 
 * 2. Custom implementation - Import individual components:
 *    import { ScheduleContainer, CalendarView } from './components/Schedule';
 * 
 *    function CustomSchedule() {
 *      // Custom wrapper, styling, additional components, etc.
 *      return (
 *        <div className="custom-wrapper">
 *          <h1>My Custom Schedule</h1>
 *          <ScheduleContainer />
 *        </div>
 *      );
 *    }
 * 
 * 3. Deep customization - Import just the CalendarView:
 *    import { CalendarView } from './components/Schedule';
 * 
 *    function FullyCustomSchedule() {
 *      // Implement your own state management and data fetching
 *      const [events, setEvents] = useState([]);
 *      // ... other state and handlers
 * 
 *      return (
 *        <CalendarView
 *          events={events}
 *          // Pass all required props
 *        />
 *      );
 *    }
 */
