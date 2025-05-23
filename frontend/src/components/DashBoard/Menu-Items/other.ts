/**
 * other.ts
 * Configuration for sample pages and documentation menu items
 */
import { IconBrandChrome, IconHelp } from '@tabler/icons-react';
import { MenuGroup } from './menu-types';

// Other menu items definition
const other: MenuGroup = {
  id: 'sample-docs-roadmap',
  title: 'Other', // Added missing title property
  type: 'group',
  children: [
    {
      id: 'sample-page',
      title: 'Sample Page',
      type: 'item',
      url: '/sample-page',
      icon: IconBrandChrome,
      breadcrumbs: false
    },
    {
      id: 'documentation',
      title: 'Documentation',
      type: 'item',
      url: 'https://codedthemes.gitbook.io/berry/',
      icon: IconHelp,
      external: true,
      target: true
    }
  ]
};

export default other;