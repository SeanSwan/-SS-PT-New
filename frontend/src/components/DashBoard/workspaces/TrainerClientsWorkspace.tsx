/**
 * COMPONENT: TrainerClientsWorkspace
 * PURPOSE: Trainer mount of the shared selected-client command workspace.
 *          Same Today/Plan training workflow, upgraded progress charts,
 *          nutrition timeline, and biometrics tools as the admin Client Hub,
 *          scoped to the trainer's ASSIGNED clients with every admin
 *          account-control affordance hidden (clientHubAudience 'trainer').
 * ROUTE: /dashboard/trainer/clients (UniversalDashboardLayout trainer block).
 */

import React from 'react';
import ClientsWorkspace from './ClientsWorkspace';

const TrainerClientsWorkspace: React.FC = () => <ClientsWorkspace audience="trainer" />;

export default TrainerClientsWorkspace;
