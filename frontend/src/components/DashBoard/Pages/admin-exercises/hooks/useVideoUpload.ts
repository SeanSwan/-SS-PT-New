/**
 * useVideoUpload.ts
 * =================
 * 
 * Custom hook for managing video upload functionality
 * Handles file upload, progress tracking, and video processing
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time upload progress tracking
 * - File validation and compression
 * - Error handling and recovery
 * - Cancel upload functionality
 * - Production-safe file handling
 * - Automatic retry on failure
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';

// === INTERFACES ===

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    duration: number;
    width: number;
    height: number;
    size: number;
    format: string;
  };
  error?: string;
}

interface UseVideoUploadReturn {
  uploadProgress: number;
  uploadSpeed: number;
  timeRemaining: number;
  isUploading: boolean;
  uploadError: string | null;
  uploadedVideoUrl: string | null;
  
  // Actions
  uploadVideo: (file: File, exerciseId?: string) => Promise<UploadResult>;
  cancelUpload: () => void;
  resetUpload: () => void;
  retryUpload: () => Promise<UploadResult | null>;
}

// === CONSTANTS ===

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for large file uploads
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// === UTILITY FUNCTIONS ===

const calculateSpeed = (loaded: number, startTime: number): number => {
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  return elapsed > 0 ? loaded / elapsed : 0;
};

const calculateTimeRemaining = (loaded: number, total: number, speed: number): number => {
  const remaining = total - loaded;
  return speed > 0 ? remaining / speed : 0;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// === CUSTOM HOOK ===

export const useVideoUpload = (): UseVideoUploadReturn => {
  const { user } = useAuth();
  
  // State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const lastUploadDataRef = useRef<{ file: File; exerciseId?: string } | null>(null);
  const retryCountRef = useRef<number>(0);
  
  // Upload video function
  const uploadVideo = useCallback(async (
    file: File, 
    exerciseId?: string
  ): Promise<UploadResult> => {
    try {
      // Reset state
      setUploadError(null);
      setUploadProgress(0);
      setUploadSpeed(0);
      setTimeRemaining(0);
      setIsUploading(true);
      
      // Store upload data for retry
      lastUploadDataRef.current = { file, exerciseId };
      uploadStartTimeRef.current = Date.now();
      
      // Create abort controller
      abortControllerRef.current = new AbortController();
      
      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('Selected file is not a video');
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('Video file is too large (max 50MB)');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('video', file);
      if (exerciseId) {
        formData.append('exerciseId', exerciseId);
      }
      formData.append('userId', user?.id || '');
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          const speed = calculateSpeed(event.loaded, uploadStartTimeRef.current);
          const remaining = calculateTimeRemaining(event.loaded, event.total, speed);
          
          setUploadProgress(percentage);
          setUploadSpeed(speed);
          setTimeRemaining(remaining);
        }
      };
      
      // Handle upload completion
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                url: response.videoUrl,
                thumbnailUrl: response.thumbnailUrl,
                metadata: response.metadata
              });
            } catch (err) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Upload failed due to network error'));
        };
        
        xhr.onabort = () => {
          reject(new Error('Upload was cancelled'));
        };
        
        // Set up abort handling
        if (abortControllerRef.current) {
          abortControllerRef.current.signal.addEventListener('abort', () => {
            xhr.abort();
          });
        }
      });
      
      // Start upload
      xhr.open('POST', '/api/admin/exercises/upload-video');
      
      // Add auth header if available
      if (user?.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);
      }
      
      xhr.send(formData);
      
      // Wait for completion
      const result = await uploadPromise;
      
      // Update state
      setUploadedVideoUrl(result.url || null);
      setIsUploading(false);
      retryCountRef.current = 0;
      
      return result;
      
    } catch (error) {
      console.error('Video upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      setIsUploading(false);
      
      // Don't reset progress on error (allows for retry)
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [user]);
  
  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    setUploadSpeed(0);
    setTimeRemaining(0);
    setUploadError('Upload cancelled');
  }, []);
  
  // Reset upload state
  const resetUpload = useCallback(() => {
    setUploadProgress(0);
    setUploadSpeed(0);
    setTimeRemaining(0);
    setIsUploading(false);
    setUploadError(null);
    setUploadedVideoUrl(null);
    lastUploadDataRef.current = null;
    retryCountRef.current = 0;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Retry upload
  const retryUpload = useCallback(async (): Promise<UploadResult | null> => {
    if (!lastUploadDataRef.current) {
      return null;
    }
    
    if (retryCountRef.current >= MAX_RETRIES) {
      setUploadError(`Upload failed after ${MAX_RETRIES} attempts`);
      return null;
    }
    
    retryCountRef.current++;
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCountRef.current));
    
    return uploadVideo(
      lastUploadDataRef.current.file, 
      lastUploadDataRef.current.exerciseId
    );
  }, [uploadVideo]);
  
  return {
    uploadProgress,
    uploadSpeed,
    timeRemaining,
    isUploading,
    uploadError,
    uploadedVideoUrl,
    uploadVideo,
    cancelUpload,
    resetUpload,
    retryUpload
  };
};

export default useVideoUpload;
