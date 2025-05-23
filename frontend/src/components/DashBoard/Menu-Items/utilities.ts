/**
 * utilities.ts
 * Configuration for utilities menu items
 */
import { IconTypography, IconPalette, IconShadow, IconWindmill } from '@tabler/icons-react';
import { MenuGroup } from './menu-types';

// Utilities menu items definition
const utilities: MenuGroup = {
  id: 'utilities',
  title: 'Utilities',
  type: 'group',
  children: [
    {
      id: 'util-typography',
      title: 'Typography',
      type: 'item',
      url: '/typography',
      icon: IconTypography,
      breadcrumbs: false
    },
    {
      id: 'util-color',
      title: 'Color',
      type: 'item',
      url: '/color',
      icon: IconPalette,
      breadcrumbs: false
    },
    {
      id: 'util-shadow',
      title: 'Shadow',
      type: 'item',
      url: '/shadow',
      icon: IconShadow,
      breadcrumbs: false
    }
  ]
};

export default utilities;