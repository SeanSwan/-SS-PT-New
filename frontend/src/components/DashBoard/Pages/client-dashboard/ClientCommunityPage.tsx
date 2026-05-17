/**
 * FILE: ClientCommunityPage.tsx
 * PURPOSE: Canonical client community route wrapper.
 *
 * This route reuses ClientObservatoryHome so Community, Feed, Reels,
 * Friends, and Challenges have one dashboard-native source of truth.
 */
import React from 'react';
import ClientObservatoryHome from './observatory/ClientObservatoryHome';

const ClientCommunityPage: React.FC = () => <ClientObservatoryHome />;

export default ClientCommunityPage;
