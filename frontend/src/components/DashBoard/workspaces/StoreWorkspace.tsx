import React from 'react';
import { CreditCard, Package, Star } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'orders', label: 'Orders', icon: <CreditCard size={18} />, path: '/dashboard/store' },
  { id: 'packages', label: 'Packages', icon: <Package size={18} />, path: '/dashboard/store/packages' },
  { id: 'specials', label: 'Specials', icon: <Star size={18} />, path: '/dashboard/store/specials' },
];

const StoreWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Store & Revenue"
    subtitle="Orders, packages, and promotional specials"
    tabs={tabs}
  />
);

export default StoreWorkspace;
