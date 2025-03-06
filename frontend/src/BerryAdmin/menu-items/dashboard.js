/**
 * dashboard.js
 * Dashboard menu item configuration
 */
import { 
  IconDashboard, 
  IconCalendarEvent 
} from '@tabler/icons-react';

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
  id: 'dashboard',
  title: 'Dashboard',
  type: 'group',
  children: [
    {
      id: 'default',
      title: 'Dashboard',
      type: 'item',
      url: '/dashboard/default',
      icon: IconDashboard,
      breadcrumbs: false
    },
    {
      id: 'schedule',
      title: 'Schedule Management',
      type: 'item',
      url: '/schedule',
      icon: IconCalendarEvent,
      breadcrumbs: false
    }
  ]
};

export default dashboard;