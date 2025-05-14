/**
 * PII Manager Service
 * Handles detection, sanitization, and management of PII
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';

export class PIIManager {
  constructor() {
    // PII detection patterns
    this.piiPatterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(?:\+1[- ]?)?(?:\(?[0-9]{3}\)?[- ]?)?[0-9]{3}[- ]?[0-9]{4}/g,
      ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      address: /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
      date: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:19|20)\d{2}\b/g,
      
      // Additional sensitive patterns
      passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
      drivingLicense: /\b[A-Z]{1,2}\d{4,8}\b/g,
      bankAccount: /\b\d{8,17}\b/g,
      
      // Health-specific PII
      medicalId: /\b[A-Z]{2,3}\d{6,10}\b/g,
      
      // Custom patterns for fitness app
      membershipId: /\bMEM\d{6,8}\b/g,
      trainerId: /\bTR\d{4,6}\b/g
    };
    
    // Confidence thresholds for detection
    this.confidenceThresholds = {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    };
    
    // Sanitization methods
    this.sanitizationMethods = {
      mask: this.maskPII.bind(this),
      hash: this.hashPII.bind(this),
      remove: this.removePII.bind(this),
      tokenize: this.tokenizePII.bind(this),
      redact: this.redactPII.bind(this)
    };
  }
  
  /**
   * Scan content for PII
   */
  async scanForPII(content, context = 'general') {
    try {
      const detectedPII = [];
      let confidence = 1.0;
      
      // Scan for each PII type
      for (const [type, pattern] of Object.entries(this.piiPatterns)) {
        const matches = content.match(pattern);
        
        if (matches) {
          matches.forEach(match => {
            const detection = {
              type,
              value: match,
              position: content.indexOf(match),
              confidence: this.calculateConfidence(type, match, context),
              risk: this.assessRisk(type, context),
              recommendation: this.getRecommendation(type, context)
            };
            
            detectedPII.push(detection);
            confidence = Math.min(confidence, detection.confidence);
          });
        }
      }
      
      // Additional context-specific checks
      const contextualPII = await this.performContextualDetection(content, context);
      detectedPII.push(...contextualPII);
      
      // Calculate risks
      const risks = this.assessOverallRisks(detectedPII);
      
      const result = {
        piiDetected: detectedPII.length > 0,
        detections: detectedPII,
        confidence,
        risks,
        context,
        recommendations: this.generateRecommendations(detectedPII, risks),
        scannedLength: content.length,
        timestamp: new Date().toISOString()
      };
      
      // Log scan (without logging the actual content)
      piiSafeLogger.trackPrivacyOperation('pii_scan', 'system', {
        context,
        piiFound: result.piiDetected,
        typesDetected: [...new Set(detectedPII.map(d => d.type))],
        confidence,
        riskLevel: risks.level
      });
      
      return result;
    } catch (error) {
      piiSafeLogger.error('PII scan failed', {
        error: error.message,
        context
      });
      throw error;
    }
  }
  
  /**
   * Sanitize content by removing/masking PII
   */
  async sanitizeContent(content, options = {}) {
    try {
      const { 
        method = 'mask', 
        preserveFormat = true,
        allowedTypes = [],
        customRules = {}
      } = options;
      
      // First scan for PII
      const scanResult = await this.scanForPII(content, options.context);
      
      if (!scanResult.piiDetected) {
        return {
          sanitizedContent: content,
          originalContent: content,
          changes: [],
          itemsProcessed: 0,
          piiRemoved: 0,
          method,
          preserved: true
        };
      }
      
      let sanitizedContent = content;
      const changes = [];
      let itemsProcessed = 0;
      let piiRemoved = 0;
      
      // Sort detections by position (descending) to maintain correct indices
      const sortedDetections = scanResult.detections.sort((a, b) => b.position - a.position);
      
      for (const detection of sortedDetections) {
        // Skip if type is in allowed list
        if (allowedTypes.includes(detection.type)) {
          continue;
        }
        
        itemsProcessed++;
        
        // Apply sanitization method
        const sanitizationMethod = customRules[detection.type] || method;
        const sanitized = await this.applySanitization(
          detection.value,
          sanitizationMethod,
          detection.type,
          preserveFormat
        );
        
        // Replace in content
        const before = sanitizedContent.substring(0, detection.position);
        const after = sanitizedContent.substring(detection.position + detection.value.length);
        sanitizedContent = before + sanitized + after;
        
        changes.push({
          type: detection.type,
          original: detection.value,
          sanitized,
          position: detection.position,
          method: sanitizationMethod,
          risk: detection.risk
        });
        
        piiRemoved++;
      }
      
      const result = {
        sanitizedContent,
        originalContent: content,
        changes,
        itemsProcessed,
        piiRemoved,
        method,
        preserveFormat,
        statistics: {
          totalPII: scanResult.detections.length,
          typesFound: [...new Set(scanResult.detections.map(d => d.type))],
          riskLevel: scanResult.risks.level
        },
        timestamp: new Date().toISOString()
      };
      
      // Log sanitization (without logging actual content)
      piiSafeLogger.trackPrivacyOperation('content_sanitized', 'system', {
        method,
        itemsProcessed,
        piiRemoved,
        typesProcessed: [...new Set(changes.map(c => c.type))],
        preserveFormat
      });
      
      return result;
    } catch (error) {
      piiSafeLogger.error('Content sanitization failed', {
        error: error.message,
        method: options.method
      });
      throw error;
    }
  }
  
  /**
   * Check if content contains PII (quick check)
   */
  async containsPII(content, types = null) {
    try {
      const patternsToCheck = types 
        ? Object.fromEntries(Object.entries(this.piiPatterns).filter(([key]) => types.includes(key)))
        : this.piiPatterns;
      
      for (const [type, pattern] of Object.entries(patternsToCheck)) {
        if (pattern.test(content)) {
          return {
            containsPII: true,
            type,
            confidence: this.calculateConfidence(type, content.match(pattern)[0])
          };
        }
      }
      
      return {
        containsPII: false,
        type: null,
        confidence: 1.0
      };
    } catch (error) {
      piiSafeLogger.error('PII check failed', {
        error: error.message
      });
      return {
        containsPII: false,
        type: null,
        confidence: 0.0,
        error: error.message
      };
    }
  }
  
  /**
   * Validate sanitized content
   */
  async validateSanitization(originalContent, sanitizedContent, expectedChanges) {
    try {
      // Re-scan sanitized content for any remaining PII
      const scanResult = await this.scanForPII(sanitizedContent);
      
      const validation = {
        passed: !scanResult.piiDetected,
        remainingPII: scanResult.detections,
        changesApplied: expectedChanges.length,
        contentLength: {
          original: originalContent.length,
          sanitized: sanitizedContent.length,
          difference: sanitizedContent.length - originalContent.length
        },
        issues: [],
        recommendations: []
      };
      
      // Check for validation issues
      if (scanResult.piiDetected) {
        validation.issues.push('PII still detected after sanitization');
        validation.recommendations.push('Review sanitization methods');
        validation.recommendations.push('Check for new PII patterns');
      }
      
      // Verify expected changes were applied
      for (const change of expectedChanges) {
        if (!sanitizedContent.includes(change.sanitized)) {
          validation.issues.push(`Expected change not found: ${change.type}`);
        }
      }
      
      return validation;
    } catch (error) {
      piiSafeLogger.error('Sanitization validation failed', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Calculate confidence for PII detection
   */
  calculateConfidence(type, match, context = 'general') {
    let baseConfidence = 0.8;
    
    // Type-specific confidence adjustments
    switch (type) {
      case 'email':
        baseConfidence = 0.95;
        break;
      case 'phone':
        baseConfidence = 0.9;
        break;
      case 'ssn':
        baseConfidence = 0.98;
        break;
      case 'creditCard':
        baseConfidence = 0.95;
        break;
      case 'name':
        baseConfidence = 0.6; // Names can be ambiguous
        break;
      case 'address':
        baseConfidence = 0.7;
        break;
      default:
        baseConfidence = 0.75;
    }
    
    // Context adjustments
    if (context === 'user_profile' || context === 'registration') {
      baseConfidence *= 1.1; // More likely to contain PII
    } else if (context === 'public' || context === 'marketing') {
      baseConfidence *= 0.9; // Less likely to contain sensitive PII
    }
    
    // Match quality adjustments
    if (type === 'email' && match.includes('@')) {
      baseConfidence = Math.min(baseConfidence * 1.05, 1.0);
    }
    
    if (type === 'phone' && /^\+1/.test(match)) {
      baseConfidence = Math.min(baseConfidence * 1.02, 1.0);
    }
    
    return Math.max(0, Math.min(1, baseConfidence));
  }
  
  /**
   * Assess risk for detected PII
   */
  assessRisk(type, context) {
    const riskMatrix = {
      ssn: { level: 'critical', score: 10 },
      creditCard: { level: 'critical', score: 10 },
      passport: { level: 'high', score: 8 },
      bankAccount: { level: 'high', score: 8 },
      medicalId: { level: 'high', score: 7 },
      drivingLicense: { level: 'medium', score: 6 },
      email: { level: 'medium', score: 5 },
      phone: { level: 'medium', score: 5 },
      name: { level: 'low', score: 3 },
      address: { level: 'medium', score: 4 },
      ip: { level: 'low', score: 2 },
      date: { level: 'low', score: 2 }
    };
    
    const baseRisk = riskMatrix[type] || { level: 'low', score: 2 };
    
    // Context adjustments
    let adjustedScore = baseRisk.score;
    
    if (context === 'public' || context === 'marketing') {
      adjustedScore *= 1.5; // Higher risk in public contexts
    } else if (context === 'internal' || context === 'admin') {
      adjustedScore *= 0.8; // Lower risk in internal contexts
    }
    
    // Determine adjusted level
    let adjustedLevel = baseRisk.level;
    if (adjustedScore >= 9) adjustedLevel = 'critical';
    else if (adjustedScore >= 7) adjustedLevel = 'high';
    else if (adjustedScore >= 4) adjustedLevel = 'medium';
    else adjustedLevel = 'low';
    
    return {
      level: adjustedLevel,
      score: Math.min(10, Math.max(1, Math.round(adjustedScore))),
      context,
      recommendation: this.getRiskRecommendation(adjustedLevel, type)
    };
  }
  
  /**
   * Get recommendation for PII type
   */
  getRecommendation(type, context) {
    const recommendations = {
      ssn: 'Immediately mask or encrypt. Never store in plain text.',
      creditCard: 'Tokenize immediately. Comply with PCI DSS requirements.',
      passport: 'Encrypt and limit access. Log all access attempts.',
      bankAccount: 'Hash with strong salt. Implement additional access controls.',
      medicalId: 'Encrypt according to HIPAA requirements.',
      email: 'Consider masking for non-essential use cases.',
      phone: 'Mask or encrypt for privacy protection.',
      name: 'Consider masking in logs and analytics.',
      address: 'Partial masking recommended (show only city/state).',
      ip: 'Hash IP addresses for privacy compliance.',
      date: 'Consider if full date precision is necessary.'
    };
    
    return recommendations[type] || 'Review necessity and apply appropriate protection.';
  }
  
  /**
   * Assess overall risks from multiple PII detections
   */
  assessOverallRisks(detections) {
    if (detections.length === 0) {
      return {
        level: 'none',
        score: 0,
        factors: [],
        combinedRisk: false
      };
    }
    
    const maxScore = Math.max(...detections.map(d => d.risk.score));
    const typesDetected = [...new Set(detections.map(d => d.type))];
    const criticalTypes = detections.filter(d => d.risk.level === 'critical').length;
    
    let overallLevel = 'low';
    let overallScore = maxScore;
    const factors = [];
    
    // Adjust for multiple PII types
    if (typesDetected.length > 3) {
      overallScore += 1;
      factors.push('Multiple PII types detected');
    }
    
    // Adjust for critical PII
    if (criticalTypes > 0) {
      overallScore += 2;
      factors.push(`${criticalTypes} critical PII types detected`);
    }
    
    // Combined risk assessment
    const combinedRisk = this.assessCombinedRisk(detections);
    if (combinedRisk.elevated) {
      overallScore += 1;
      factors.push(combinedRisk.reason);
    }
    
    // Determine overall level
    if (overallScore >= 9) overallLevel = 'critical';
    else if (overallScore >= 7) overallLevel = 'high';
    else if (overallScore >= 4) overallLevel = 'medium';
    
    return {
      level: overallLevel,
      score: Math.min(10, overallScore),
      factors,
      combinedRisk: combinedRisk.elevated,
      typesDetected,
      criticalCount: criticalTypes
    };
  }
  
  /**
   * Assess combined risk from multiple PII types
   */
  assessCombinedRisk(detections) {
    // Check for identity-revealing combinations
    const types = detections.map(d => d.type);
    
    // High-risk combinations
    if (types.includes('name') && types.includes('address') && types.includes('phone')) {
      return {
        elevated: true,
        reason: 'Full identity information detected (name + address + phone)'
      };
    }
    
    if (types.includes('name') && types.includes('ssn')) {
      return {
        elevated: true,
        reason: 'Identity theft risk (name + SSN)'
      };
    }
    
    if (types.includes('creditCard') && types.includes('address')) {
      return {
        elevated: true,
        reason: 'Financial fraud risk (credit card + address)'
      };
    }
    
    if (types.includes('medicalId') && types.includes('name')) {
      return {
        elevated: true,
        reason: 'Healthcare privacy risk (medical ID + name)'
      };
    }
    
    return {
      elevated: false,
      reason: null
    };
  }
  
  /**
   * Generate recommendations based on detected PII and risks
   */
  generateRecommendations(detections, risks) {
    const recommendations = [];
    
    if (risks.level === 'critical') {
      recommendations.push('Immediate action required - critical PII detected');
      recommendations.push('Implement encryption for all detected PII');
      recommendations.push('Review data retention and access policies');
    }
    
    if (risks.combinedRisk) {
      recommendations.push('Identity protection measures required');
      recommendations.push('Consider data segmentation strategies');
    }
    
    // Type-specific recommendations
    const criticalTypes = detections.filter(d => d.risk.level === 'critical');
    if (criticalTypes.length > 0) {
      recommendations.push('Prioritize protection of: ' + 
        criticalTypes.map(d => d.type).join(', '));
    }
    
    // Context-specific recommendations
    if (risks.typesDetected.length > 5) {
      recommendations.push('Consider data minimization strategies');
      recommendations.push('Implement role-based access controls');
    }
    
    return recommendations;
  }
  
  /**
   * Get risk recommendation for specific level and type
   */
  getRiskRecommendation(level, type) {
    const levelRecommendations = {
      critical: 'Encrypt immediately, restrict access, audit all usage',
      high: 'Apply strong encryption, implement access controls',
      medium: 'Consider masking or tokenization',
      low: 'Monitor and apply basic protection measures'
    };
    
    return levelRecommendations[level] || 'Apply appropriate protection measures';
  }
  
  /**
   * Perform contextual PII detection
   */
  async performContextualDetection(content, context) {
    const contextualPII = [];
    
    // Context-specific patterns
    if (context === 'workout' || context === 'fitness') {
      // Look for fitness-specific identifiers
      const membershipPattern = /\b(?:membership|member)\s*(?:id|number|#)?\s*:?\s*([A-Z0-9]+)\b/gi;
      const matches = content.match(membershipPattern);
      
      if (matches) {
        matches.forEach(match => {
          contextualPII.push({
            type: 'membershipId',
            value: match,
            position: content.indexOf(match),
            confidence: 0.8,
            risk: { level: 'low', score: 2 },
            recommendation: 'Consider masking membership identifiers'
          });
        });
      }
    }
    
    if (context === 'medical' || context === 'health') {
      // Look for health-specific identifiers
      const healthIdPattern = /\b(?:patient|health)\s*(?:id|number|#)?\s*:?\s*([A-Z0-9]+)\b/gi;
      const matches = content.match(healthIdPattern);
      
      if (matches) {
        matches.forEach(match => {
          contextualPII.push({
            type: 'healthId',
            value: match,
            position: content.indexOf(match),
            confidence: 0.9,
            risk: { level: 'high', score: 7 },
            recommendation: 'Encrypt health identifiers according to HIPAA'
          });
        });
      }
    }
    
    return contextualPII;
  }
  
  /**
   * Apply specific sanitization method
   */
  async applySanitization(value, method, type, preserveFormat = true) {
    const sanitizationMethod = this.sanitizationMethods[method];
    
    if (!sanitizationMethod) {
      throw new Error(`Unknown sanitization method: ${method}`);
    }
    
    return sanitizationMethod(value, type, preserveFormat);
  }
  
  /**
   * Mask PII with asterisks or similar characters
   */
  maskPII(value, type, preserveFormat = true) {
    if (!preserveFormat) {
      return '*'.repeat(value.length);
    }
    
    switch (type) {
      case 'email':
        const [localPart, domain] = value.split('@');
        const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(0, localPart.length - 2)) + 
                          (localPart.length > 1 ? localPart.charAt(localPart.length - 1) : '');
        return `${maskedLocal}@${domain}`;
        
      case 'phone':
        // Keep area code and last 4 digits
        return value.replace(/(\d{3})\d{3}(\d{4})/, '$1-***-$2');
        
      case 'ssn':
        return value.replace(/\d{3}-?\d{2}-?(\d{4})/, 'XXX-XX-$1');
        
      case 'creditCard':
        // Show only last 4 digits
        return '*'.repeat(value.length - 4) + value.slice(-4);
        
      case 'name':
        const nameParts = value.split(' ');
        return nameParts.map(part => 
          part.charAt(0) + '*'.repeat(Math.max(0, part.length - 1))
        ).join(' ');
        
      case 'address':
        // Keep city, mask street details
        const addressParts = value.split(' ');
        return '*'.repeat(6) + ' ' + addressParts.slice(-2).join(' ');
        
      default:
        // Generic masking - show first and last character
        if (value.length <= 2) return '*'.repeat(value.length);
        return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
    }
  }
  
  /**
   * Hash PII using a secure hashing algorithm
   */
  async hashPII(value, type, preserveFormat = true) {
    // Note: In a real implementation, use a cryptographically secure hash
    // with a proper salt. This is a simplified example.
    
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(value + 'app-specific-salt');
    const hashed = hash.digest('hex');
    
    if (preserveFormat && type === 'email') {
      return `${hashed.substring(0, 8)}@hashed.local`;
    }
    
    return `HASH_${hashed.substring(0, 16)}`;
  }
  
  /**
   * Remove PII entirely
   */
  removePII(value, type, preserveFormat = true) {
    if (preserveFormat) {
      switch (type) {
        case 'email':
          return '[EMAIL_REMOVED]';
        case 'phone':
          return '[PHONE_REMOVED]';
        case 'ssn':
          return '[SSN_REMOVED]';
        case 'name':
          return '[NAME_REMOVED]';
        case 'address':
          return '[ADDRESS_REMOVED]';
        default:
          return `[${type.toUpperCase()}_REMOVED]`;
      }
    }
    
    return '';
  }
  
  /**
   * Tokenize PII with a reversible token
   */
  async tokenizePII(value, type, preserveFormat = true) {
    // Generate a unique token for this value
    const tokenId = Math.random().toString(36).substring(2, 15);
    const token = `TOKEN_${type.toUpperCase()}_${tokenId}`;
    
    // In a real implementation, store the mapping securely
    // This is just a demonstration
    return token;
  }
  
  /**
   * Redact PII with a standard redaction marker
   */
  redactPII(value, type, preserveFormat = true) {
    const redactionLength = Math.max(5, Math.min(value.length, 15));
    return '█'.repeat(redactionLength);
  }
}

// Export singleton instance
export const piiManager = new PIIManager();