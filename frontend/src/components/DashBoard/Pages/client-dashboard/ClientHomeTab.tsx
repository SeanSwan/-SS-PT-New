/**
 * FILE: ClientHomeTab.tsx
 * PURPOSE: Canonical /dashboard/client/overview wrapper.
 *
 * The rendered surface lives in observatory modules so the redesigned client
 * dashboard stays under the project line cap and can share theme-safe styles.
 */

import React from 'react';
import ClientObservatoryHome from './observatory/ClientObservatoryHome';

const ClientHomeTab: React.FC = () => <ClientObservatoryHome />;

export default ClientHomeTab;
