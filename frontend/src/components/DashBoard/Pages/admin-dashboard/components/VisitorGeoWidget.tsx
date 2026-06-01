/**
 * VisitorGeoWidget
 * Admin overview visitor intelligence surface.
 * Reads logged-in, gallery, anonymous, and persistent visitor history data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { VisitorDetailPanel, VisitorFullModal } from './VisitorGeoWidget.detail';
import {
  VisitorContent,
  VisitorSourceBar,
  VisitorTabs,
  VisitorWidgetHeader
} from './VisitorGeoWidget.sections';
import { WidgetCard } from './VisitorGeoWidget.styles';
import type { AnonData, GeoData, HistoryData, SelectedVisitor, TabKey } from './VisitorGeoWidget.types';

const VisitorGeoWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [anonData, setAnonData] = useState<AnonData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('live');
  const [showFullModal, setShowFullModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<SelectedVisitor | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [geoRes, anonRes] = await Promise.allSettled([
        authAxios.get('/api/admin/dashboard/visitor-geo'),
        authAxios.get('/api/admin/dashboard/anonymous-visitors'),
      ]);

      const geoOk = geoRes.status === 'fulfilled' && geoRes.value.data?.success;
      const anonOk = anonRes.status === 'fulfilled' && anonRes.value.data?.success;

      if (geoOk) setGeoData(geoRes.value.data);
      if (anonOk) setAnonData(anonRes.value.data);

      if (!geoOk && !anonOk) {
        console.error('Failed to fetch visitor intelligence:', { geoRes, anonRes });
        setGeoData(null);
        setAnonData(null);
        setLoadError('Visitor data unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch visitor intelligence:', err);
      setGeoData(null);
      setAnonData(null);
      setLoadError('Visitor data unavailable');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const res = await authAxios.get('/api/admin/dashboard/visitor-history', {
        params: { page, limit: 50 },
      });

      if (res.data?.success) {
        setHistoryData(res.data);
      } else {
        setHistoryData(null);
        setHistoryError('Visitor history unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch visitor history:', err);
      setHistoryData(null);
      setHistoryError('Visitor history unavailable');
    } finally {
      setHistoryLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (showFullModal) fetchHistory(1);
  }, [showFullModal, fetchHistory]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedVisitor) setSelectedVisitor(null);
      else if (showFullModal) setShowFullModal(false);
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [selectedVisitor, showFullModal]);

  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <WidgetCard>
      <VisitorWidgetHeader
        anonData={anonData}
        geoData={geoData}
        loading={loading}
        onRefresh={fetchAll}
        onViewAll={() => setShowFullModal(true)}
      />
      <VisitorSourceBar anonData={anonData} geoData={geoData} />
      <VisitorTabs activeTab={activeTab} onChange={setActiveTab} />
      <VisitorContent
        activeTab={activeTab}
        loading={loading}
        loadError={loadError}
        anonData={anonData}
        geoData={geoData}
        onSelectVisitor={setSelectedVisitor}
      />

      {selectedVisitor && (
        <VisitorDetailPanel
          selectedVisitor={selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
        />
      )}

      {showFullModal && (
        <VisitorFullModal
          anonData={anonData}
          geoData={geoData}
          historyData={historyData}
          historyLoading={historyLoading}
          historyError={historyError}
          onClose={() => setShowFullModal(false)}
          onFetchHistory={fetchHistory}
          onSelectVisitor={setSelectedVisitor}
        />
      )}
    </WidgetCard>
  );
};

export default VisitorGeoWidget;
