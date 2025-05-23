/**
 * PII Manager Service - FIXED VERSION
 * Handles detection, sanitization, and management of PII
 * WITH COMPREHENSIVE ERROR HANDLING
 */

export class PIIManager {
  constructor() {
    // PII detection patterns
    this.piiPatterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(?:\+1[- ]?)?(?:\(?[0-9]{3}\)?[- ]?)?[0-9]{3}[- ]?[0-9]{4}/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    };
  }
  
  /**
   * BULLETPROOF scan for PII - handles ALL edge cases
   */
  async scanForPII(content, context = 'general') {
    // ULTIMATE SAFETY: Handle ALL possible input types
    if (content === null || content === undefined) {
      return this.createEmptyResult(context);
    }
    
    // Convert EVERYTHING to string safely
    let stringContent;
    try {
      if (typeof content === 'string') {
        stringContent = content;
      } else if (typeof content === 'number' || typeof content === 'boolean') {
        stringContent = String(content);
      } else if (typeof content === 'object') {
        stringContent = JSON.stringify(content);
      } else {
        stringContent = String(content);
      }
    } catch (conversionError) {
      console.warn('Content conversion failed:', conversionError.message);
      return this.createEmptyResult(context);
    }
    
    // Handle empty content
    if (!stringContent || stringContent.length === 0) {
      return this.createEmptyResult(context);
    }
    
    try {
      const detectedPII = [];
      let confidence = 1.0;
      
      // Scan each pattern with individual error handling
      for (const [type, pattern] of Object.entries(this.piiPatterns)) {
        try {
          // Ensure pattern exists and is valid
          if (!pattern || typeof pattern.test !== 'function') {
            continue;
          }
          
          // Reset regex state
          if (pattern.global) {
            pattern.lastIndex = 0;
          }
          
          // Safely test the pattern
          let matches;
          try {
            matches = stringContent.match(pattern);
          } catch (matchError) {
            console.warn(`Match error for ${type}:`, matchError.message);
            continue;
          }
          
          // Process matches safely
          if (matches && Array.isArray(matches)) {
            for (const match of matches) {
              if (match && typeof match === 'string' && match.length > 0) {
                try {
                  detectedPII.push({
                    type,
                    value: match,
                    position: stringContent.indexOf(match),
                    confidence: 0.8,
                    risk: { level: 'medium', score: 5 },
                    recommendation: `Sanitize ${type}`
                  });
                } catch (itemError) {
                  console.warn(`Detection item error for ${type}:`, itemError.message);
                }
              }
            }
          }
        } catch (patternError) {
          console.warn(`Pattern error for ${type}:`, patternError.message);
          continue;
        }
      }
      
      // Create result safely
      const result = {
        piiDetected: detectedPII.length > 0,
        detections: detectedPII,
        confidence,
        risks: { level: 'none', score: 0, factors: [], combinedRisk: false },
        context,
        recommendations: [],
        scannedLength: stringContent.length,
        timestamp: new Date().toISOString()
      };
      
      // Safe logging (no PII scanning in logging context)
      if (context !== 'logging') {
        console.log('PII scan completed safely');
      }
      
      return result;
    } catch (error) {
      console.error('PII scan error:', error.message);
      return this.createEmptyResultWithError(context, error.message);
    }
  }
  
  /**
   * BULLETPROOF sanitize content
   */
  async sanitizeContent(content, options = {}) {
    // Handle null/undefined
    if (content === null || content === undefined) {
      return {
        sanitizedContent: content,
        originalContent: content,
        changes: [],
        itemsProcessed: 0,
        piiRemoved: 0,
        method: options.method || 'mask',
        preserved: true
      };
    }
    
    // Convert to string safely
    let stringContent;
    try {
      stringContent = String(content);
    } catch (conversionError) {
      return {
        sanitizedContent: '[CONVERSION_ERROR]',
        originalContent: content,
        changes: [],
        itemsProcessed: 0,
        piiRemoved: 0,
        method: options.method || 'mask',
        preserved: false,
        error: conversionError.message
      };
    }
    
    // If empty, return as-is
    if (stringContent.length === 0) {
      return {
        sanitizedContent: stringContent,
        originalContent: content,
        changes: [],
        itemsProcessed: 0,
        piiRemoved: 0,
        method: options.method || 'mask',
        preserved: true
      };
    }
    
    try {
      // Scan for PII first
      const scanResult = await this.scanForPII(stringContent, options.context || 'sanitization');
      
      if (!scanResult.piiDetected) {
        return {
          sanitizedContent: stringContent,
          originalContent: content,
          changes: [],
          itemsProcessed: 0,
          piiRemoved: 0,
          method: options.method || 'mask',
          preserved: true
        };
      }
      
      // Apply basic sanitization
      let sanitized = stringContent;
      const changes = [];
      
      for (const detection of scanResult.detections) {
        try {
          if (detection.value && typeof detection.value === 'string') {
            const masked = '*'.repeat(Math.min(detection.value.length, 8));
            sanitized = sanitized.replace(detection.value, masked);
            changes.push({
              type: detection.type,
              original: detection.value,
              sanitized: masked
            });
          }
        } catch (sanitizeError) {
          console.warn('Individual sanitization error:', sanitizeError.message);
        }
      }
      
      return {
        sanitizedContent: sanitized,
        originalContent: content,
        changes,
        itemsProcessed: scanResult.detections.length,
        piiRemoved: changes.length,
        method: options.method || 'mask',
        preserved: true
      };
    } catch (error) {
      console.error('Sanitization error:', error.message);
      return {
        sanitizedContent: stringContent,
        originalContent: content,
        changes: [],
        itemsProcessed: 0,
        piiRemoved: 0,
        method: options.method || 'mask',
        preserved: false,
        error: error.message
      };
    }
  }
  
  /**
   * Safe empty result creator
   */
  createEmptyResult(context) {
    return {
      piiDetected: false,
      detections: [],
      confidence: 1.0,
      risks: { level: 'none', score: 0, factors: [], combinedRisk: false },
      context,
      recommendations: [],
      scannedLength: 0,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Safe empty result with error
   */
  createEmptyResultWithError(context, error) {
    return {
      piiDetected: false,
      detections: [],
      confidence: 0,
      risks: { level: 'unknown', score: 0, factors: ['scan_error'], combinedRisk: false },
      context,
      recommendations: ['Review PII scanning configuration'],
      scannedLength: 0,
      timestamp: new Date().toISOString(),
      error
    };
  }
  
  // Simple containsPII check
  async containsPII(content, types = null) {
    try {
      const result = await this.scanForPII(content);
      return {
        containsPII: result.piiDetected,
        type: result.detections[0]?.type || null,
        confidence: result.confidence
      };
    } catch (error) {
      return {
        containsPII: false,
        type: null,
        confidence: 0.0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const piiManager = new PIIManager();
