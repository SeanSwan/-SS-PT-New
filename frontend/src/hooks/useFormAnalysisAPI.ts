/**
 * useFormAnalysisAPI Hook
 * =======================
 * Backend integration for form analysis endpoints.
 * Handles upload, history, single analysis fetch, and reprocessing.
 */
import { useState, useCallback } from 'react';
import { usePaywall } from '../context/PaywallContext';
import apiService from '../services/api.service';

interface FormAnalysisRecord {
  id: number;
  exerciseName: string;
  analysisStatus: 'pending' | 'processing' | 'complete' | 'failed';
  overallScore: number | null;
  mediaType: 'video' | 'image';
  repCount: number | null;
  findings: any;
  recommendations: any;
  coachingFeedback: any;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisHistory {
  analyses: FormAnalysisRecord[];
  total: number;
  page: number;
  totalPages: number;
}

interface MovementProfile {
  mobilityScores: Record<string, number>;
  strengthBalance: Record<string, number>;
  commonCompensations: string[];
  improvementTrend: string;
  exerciseScores: Record<string, number>;
  nasmPhaseRecommendation: number;
  totalAnalyses: number;
}

interface UploadResult {
  id: number;
  status: string;
  message: string;
}

export function useFormAnalysisAPI() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { showPaywall } = usePaywall();

  const uploadMedia = useCallback(async (
    file: File,
    exerciseName: string,
    options?: { cameraAngle?: string; sessionId?: string; trainerId?: number }
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('exerciseName', exerciseName);
      if (options?.cameraAngle) formData.append('cameraAngle', options.cameraAngle);
      if (options?.sessionId) formData.append('sessionId', options.sessionId);
      if (options?.trainerId) formData.append('trainerId', String(options.trainerId));

      const response = await apiService.post('/api/form-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 402 Payment Required — trigger paywall for tier-gated upload
      setUploadProgress(100);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 402) {
        const data = err.response.data || {};
        showPaywall(data.featureName || 'Video Form Check', data);
        throw new Error('This feature requires a Crystalline Swan membership.');
      }

      const data = err?.response?.data || {};
      throw new Error(data.error || data.message || `Upload failed (${err?.response?.status || 'network'})`);
    } finally {
      setIsUploading(false);
    }
  }, [showPaywall]);

  const fetchHistory = useCallback(async (
    options?: { page?: number; limit?: number; exerciseName?: string; status?: string }
  ): Promise<AnalysisHistory> => {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.exerciseName) params.set('exerciseName', options.exerciseName);
    if (options?.status) params.set('status', options.status);

    const response = await apiService.get(`/api/form-analysis/history?${params}`);
    return response.data;
  }, []);

  const fetchAnalysis = useCallback(async (id: number): Promise<FormAnalysisRecord> => {
    const response = await apiService.get(`/api/form-analysis/${id}`);
    return response.data;
  }, []);

  const reprocessAnalysis = useCallback(async (id: number): Promise<{ id: number; status: string }> => {
    const response = await apiService.post(`/api/form-analysis/${id}/reprocess`);
    return response.data;
  }, []);

  const fetchProfile = useCallback(async (userId?: number): Promise<MovementProfile | null> => {
    const url = userId ? `/api/form-analysis/profile/${userId}` : '/api/form-analysis/profile';
    try {
      const response = await apiService.get(url);
      const data = response.data;
      return data.message ? null : data;
    } catch {
      return null;
    }
  }, []);

  const pollAnalysis = useCallback(async (
    id: number,
    onUpdate: (analysis: FormAnalysisRecord) => void,
    intervalMs = 3000,
    maxAttempts = 60
  ): Promise<FormAnalysisRecord> => {
    for (let i = 0; i < maxAttempts; i++) {
      const analysis = await fetchAnalysis(id);
      onUpdate(analysis);
      if (analysis.analysisStatus === 'complete' || analysis.analysisStatus === 'failed') {
        return analysis;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error('Analysis timed out');
  }, [fetchAnalysis]);

  return {
    uploadMedia,
    fetchHistory,
    fetchAnalysis,
    reprocessAnalysis,
    fetchProfile,
    pollAnalysis,
    isUploading,
    uploadProgress,
  };
}
