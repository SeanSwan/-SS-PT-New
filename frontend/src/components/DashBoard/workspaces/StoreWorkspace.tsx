import React from 'react';
import { CreditCard, Package, Star, Crown } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'orders', label: 'Orders', icon: <CreditCard size={18} />, path: '/dashboard/store' },
  { id: 'packages', label: 'Packages', icon: <Package size={18} />, path: '/dashboard/store/packages' },
  { id: 'specials', label: 'Specials', icon: <Star size={18} />, path: '/dashboard/store/specials' },
  { id: 'custom-packages', label: 'VIP Packages', icon: <Crown size={18} />, path: '/dashboard/store/custom-packages' },
];

const StoreWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Store & Revenue"
    subtitle="Orders, packages, and promotional specials"
    tabs={tabs}
  />
);

export default StoreWorkspace;
