/**
 * useFormAnalysisAPI Hook
 * =======================
 * Backend integration for form analysis endpoints.
 * Handles upload, history, single analysis fetch, and reprocessing.
 */
import { useState, useCallback } from 'react';

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

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function useFormAnalysisAPI() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

      const response = await fetch('/api/form-analysis/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `Upload failed (${response.status})`);
      }

      setUploadProgress(100);
      return await response.json();
    } finally {
      setIsUploading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (
    options?: { page?: number; limit?: number; exerciseName?: string; status?: string }
  ): Promise<AnalysisHistory> => {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.exerciseName) params.set('exerciseName', options.exerciseName);
    if (options?.status) params.set('status', options.status);

    const response = await fetch(`/api/form-analysis/history?${params}`, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch history');
    return await response.json();
  }, []);

  const fetchAnalysis = useCallback(async (id: number): Promise<FormAnalysisRecord> => {
    const response = await fetch(`/api/form-analysis/${id}`, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Analysis not found');
    return await response.json();
  }, []);

  const reprocessAnalysis = useCallback(async (id: number): Promise<{ id: number; status: string }> => {
    const response = await fetch(`/api/form-analysis/${id}/reprocess`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to reprocess');
    return await response.json();
  }, []);

  const fetchProfile = useCallback(async (userId?: number): Promise<MovementProfile | null> => {
    const url = userId ? `/api/form-analysis/profile/${userId}` : '/api/form-analysis/profile';
    const response = await fetch(url, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.message ? null : data;
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
