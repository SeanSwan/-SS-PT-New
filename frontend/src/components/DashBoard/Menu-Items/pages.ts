/**
 * pages.ts
 * Configuration for pages menu items
 */
import { IconKey } from '@tabler/icons-react';
import { MenuGroup } from './menu-types';

// Pages menu items definition
const pages: MenuGroup = {
  id: 'pages',
  title: 'Pages',
  caption: 'Pages Caption',
  icon: IconKey,
  type: 'group',
  children: [
    {
      id: 'authentication',
      title: 'Authentication',
      type: 'collapse',
      icon: IconKey,
      children: [
        {
          id: 'login',
          title: 'login',
          type: 'item',
          url: '/pages/login',
          target: true
        },
        {
          id: 'register',
          title: 'register',
          type: 'item',
          url: '/pages/register',
          target: true
        }
      ]
    }
  ]
};

export default pages;