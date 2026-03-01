/**
 * yolo-analysis-service.ts
 * Service for communicating with the YOLO AI Form/Posture Analysis MCP Server
 */

interface AnalysisSessionResponse {
  session_id: string;
  success: boolean;
  message: string;
  data?: any;
}

interface AnalysisResult {
  type: 'form_issue' | 'movement_pattern' | 'joint_angle';
  title: string;
  description: string;
  confidence: number;
  timeRange: string;
}

export interface AnalysisData {
  contentId: number;
  timestamp: string;
  analyzed: boolean;
  results: AnalysisResult[];
  overallAssessment: string;
  detectedExercise: string;
  repCount: number;
  averageRangeOfMotion: string;
}

// Default to localhost for development, override in production
const YOLO_API_URL = (import.meta as any).env?.VITE_YOLO_API_URL || 'http://localhost:8005';

export const YoloAnalysisService = {
  /**
   * Start a new form analysis session with the YOLO MCP server
   * @param userId - The ID of the user (trainer) starting the session
   * @param exerciseName - Optional exercise name to guide the analysis
   * @returns Session response with session_id if successful
   */
  startAnalysisSession: async (userId: string, exerciseName?: string): Promise<AnalysisSessionResponse> => {
    try {
      const response = await fetch(`${YOLO_API_URL}/tools/StartFormAnalysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          exercise_name: exerciseName
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting YOLO analysis session:', error);
      // Provide fallback response for error cases
      return {
        session_id: `error-${Date.now()}`,
        success: false,
        message: `Failed to start analysis session: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  /**
   * Stop an active form analysis session
   * @param sessionId - The ID of the session to stop
   * @returns Session response with summary data
   */
  stopAnalysisSession: async (sessionId: string): Promise<AnalysisSessionResponse> => {
    try {
      // Don't attempt to stop error sessions
      if (sessionId.startsWith('error-')) {
        return {
          session_id: sessionId,
          success: true,
          message: 'Error session closed'
        };
      }
      
      const response = await fetch(`${YOLO_API_URL}/tools/StopFormAnalysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping YOLO analysis session:', error);
      return {
        session_id: sessionId,
        success: false,
        message: `Failed to stop analysis session: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  /**
   * Get real-time feedback for an active analysis session
   * @param sessionId - The ID of the session
   * @returns Current feedback data
   */
  getFeedback: async (sessionId: string): Promise<any> => {
    try {
      // Don't attempt to get feedback for error sessions
      if (sessionId.startsWith('error-')) {
        throw new Error('Cannot get feedback for an error session');
      }
      
      const response = await fetch(`${YOLO_API_URL}/tools/GetRealTimeFeedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting YOLO feedback:', error);
      throw error;
    }
  },
  
  /**
   * Create a WebSocket connection for real-time video analysis
   * @param sessionId - The ID of the analysis session
   * @param onMessage - Callback function for handling incoming messages
   * @returns WebSocket connection object
   */
  createWebSocketConnection: (sessionId: string, onMessage: (data: any) => void): WebSocket => {
    // Don't attempt to create WebSocket for error sessions
    if (sessionId.startsWith('error-')) {
      throw new Error('Cannot create WebSocket for an error session');
    }
    
    const wsUrl = `${YOLO_API_URL.replace('http', 'ws')}/ws/form-analysis/${sessionId}`;
    console.log(`Creating WebSocket connection to: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    
    // Set up all WebSocket event handlers
    socket.onopen = (event) => {
      console.log(`WebSocket connection opened for session: ${sessionId}`);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data.type || 'unknown type');
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
    };
    
    socket.onclose = (event) => {
      console.log(`WebSocket connection closed for session ${sessionId}. Code: ${event.code}, Reason: ${event.reason}`);
    };
    
    return socket;
  },
  
  /**
   * Send a video frame to the YOLO MCP server for analysis
   * @param socket - WebSocket connection
   * @param frameData - Base64 encoded frame data or raw frame bytes
   * @param includeAnnotated - Whether to include annotated frame in response
   */
  sendVideoFrame: (socket: WebSocket, frameData: string, includeAnnotated: boolean = false): void => {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'frame',
          data: frameData,
          include_annotated: includeAnnotated
        }));
      } catch (error) {
        console.error('Error sending video frame:', error);
      }
    } else {
      console.warn(`Cannot send video frame: WebSocket is not open (state: ${socket.readyState})`);
    }
  },
  
  /**
   * Send a ping message to keep the WebSocket connection alive
   * @param socket - WebSocket connection
   */
  sendPing: (socket: WebSocket): void => {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending ping:', error);
      }
    }
  },
  
  /**
   * Transform YOLO metrics into analysis data for UI display
   * @param metrics - Metrics from YOLO MCP server
   * @param contentId - ID of the content being analyzed
   * @returns Formatted analysis data for UI
   */
  transformYoloMetrics: (metrics: any, contentId: number): AnalysisData => {
    if (!metrics) {
      console.error('No metrics provided to transform');
      return {
        contentId,
        timestamp: new Date().toISOString(),
        analyzed: false,
        results: [],
        overallAssessment: 'Analysis error: No data received',
        detectedExercise: 'Unknown',
        repCount: 0,
        averageRangeOfMotion: '0%'
      };
    }
    
    try {
      // Extract issues and improvements
      const issues = metrics.issues || [];
      const improvements = metrics.improvements || [];
      
      // Create results array from issues and improvements
      const results: AnalysisResult[] = [];
      
      // Add form issues
      issues.forEach((issue: string, index: number) => {
        results.push({
          type: 'form_issue',
          title: `Issue: ${issue.split('.')[0] || issue}`,
          description: issue,
          confidence: 0.85 - (index * 0.05), // Slightly decrease confidence for each subsequent issue
          timeRange: '0:10-0:30' // This would be determined from the actual video
        });
      });
      
      // Add movement pattern analysis
      if (metrics.key_angles && Object.keys(metrics.key_angles).length > 0) {
        const angleKeys = Object.keys(metrics.key_angles);
        angleKeys.forEach((key, index) => {
          results.push({
            type: 'joint_angle',
            title: `${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Angle`,
            description: `${key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} measured at ${metrics.key_angles[key].toFixed(1)}°`,
            confidence: 0.95 - (index * 0.02),
            timeRange: '0:05-0:45'
          });
        });
      }
      
      // Add improvement suggestions
      improvements.forEach((improvement: string, index: number) => {
        results.push({
          type: 'movement_pattern',
          title: `Suggestion: ${improvement.split('.')[0] || improvement}`,
          description: improvement,
          confidence: 0.90 - (index * 0.03),
          timeRange: '0:15-0:40'
        });
      });
      
      // Safely get exercise name
      const exerciseName = metrics.exercise_name || 'unknown';
      const formattedExerciseName = exerciseName.charAt(0).toUpperCase() + 
        exerciseName.slice(1).replace('_', ' ');
      
      return {
        contentId,
        timestamp: new Date().toISOString(),
        analyzed: true,
        results,
        overallAssessment: issues.length > 0 
          ? `${issues.join('. ')}. ${improvements.join('. ')}`
          : 'Good form overall. ' + improvements.join('. '),
        detectedExercise: formattedExerciseName,
        repCount: metrics.rep_count || 0,
        averageRangeOfMotion: `${Math.round(metrics.movement_quality || 0)}%`
      };
    } catch (error) {
      console.error('Error transforming YOLO metrics:', error);
      return {
        contentId,
        timestamp: new Date().toISOString(),
        analyzed: false,
        results: [{
          type: 'form_issue',
          title: 'Analysis Error',
          description: `Error processing analysis data: ${error instanceof Error ? error.message : String(error)}`,
          confidence: 1.0,
          timeRange: '0:00-0:00'
        }],
        overallAssessment: 'Analysis error occurred',
        detectedExercise: metrics.exercise_name || 'Unknown',
        repCount: 0,
        averageRangeOfMotion: '0%'
      };
    }
  },
  
  /**
   * Extract exercise name from video title for YOLO analysis
   * @param title - Video title
   * @returns Exercise name recognized by YOLO
   */
  extractExerciseName: (title: string): string => {
    if (!title) return 'default';
    
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('squat')) return 'squat';
    if (lowerTitle.includes('deadlift')) return 'deadlift';
    if (lowerTitle.includes('bench press') || lowerTitle.includes('bench')) return 'bench_press';
    if (lowerTitle.includes('overhead press') || lowerTitle.includes('shoulder press')) return 'overhead_press';
    if (lowerTitle.includes('plank')) return 'plank';
    
    // Default if no specific exercise is detected
    return 'default';
  }
};

export default YoloAnalysisService;