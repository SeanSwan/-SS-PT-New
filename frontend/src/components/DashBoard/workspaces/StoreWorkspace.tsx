import React from 'react';
import { CreditCard, Package, Star, Crown, Calculator, Settings } from 'lucide-react';
import WorkspaceContainer, { type WorkspaceTab } from '../WorkspaceContainer';

const tabs: WorkspaceTab[] = [
  { id: 'orders', label: 'Orders', icon: <CreditCard size={18} />, path: '/dashboard/store' },
  { id: 'packages', label: 'Packages', icon: <Package size={18} />, path: '/dashboard/store/packages' },
  { id: 'specials', label: 'Specials', icon: <Star size={18} />, path: '/dashboard/store/specials' },
  { id: 'custom-packages', label: 'VIP Packages', icon: <Crown size={18} />, path: '/dashboard/store/custom-packages' },
  { id: 'revenue', label: 'Revenue & Tax', icon: <Calculator size={18} />, path: '/dashboard/store/revenue' },
  { id: 'payment-settings', label: 'Payment Settings', icon: <Settings size={18} />, path: '/dashboard/store/payment-settings' },
];

const StoreWorkspace: React.FC = () => (
  <WorkspaceContainer
    title="Store & Revenue"
    subtitle="Orders, packages, and promotional specials"
    tabs={tabs}
  />
);

export default StoreWorkspace;
