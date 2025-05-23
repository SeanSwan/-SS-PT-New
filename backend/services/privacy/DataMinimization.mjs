/**
 * Data Minimization Service
 * Implements GDPR data minimization principles
 */

import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import { privacyCompliance } from './PrivacyCompliance.mjs';

export class DataMinimization {
  constructor() {
    // Data minimization rules
    this.minimizationRules = {
      retention: {
        user_logs: {
          period: '90d',
          action: 'delete',
          exceptions: ['security_incidents']
        },
        session_data: {
          period: '30d',
          action: 'anonymize',
          exceptions: ['active_sessions']
        },
        analytics_data: {
          period: '2y',
          action: 'aggregate',
          exceptions: []
        },
        audit_logs: {
          period: '7y',
          action: 'archive',
          exceptions: ['legal_holds']
        },
        temporary_files: {
          period: '24h',
          action: 'delete',
          exceptions: []
        }
      },
      collection: {
        location_data: {
          necessary: false,
          alternative: 'zip_code_only',
          justification: 'Service delivery requires general location'
        },
        device_info: {
          necessary: true,
          scope: 'limited',
          justification: 'Required for security and app functionality'
        },
        behavioral_tracking: {
          necessary: false,
          opt_in_required: true,
          justification: 'Service improvement and personalization'
        }
      },
      processing: {
        profiling: {
          allowed: true,
          scope: 'fitness_goals_only',
          opt_out_available: true
        },
        automated_decisions: {
          allowed: true,
          scope: 'workout_recommendations',
          human_review_required: false
        }
      }
    };
    
    // Categories to minimize
    this.minimizationCategories = {
      logs: {
        description: 'System and application logs',
        priority: 'high',
        defaultRetention: '90d'
      },
      analytics: {
        description: 'User behavior analytics',
        priority: 'medium',
        defaultRetention: '2y'
      },
      temporary_data: {
        description: 'Temporary files and cache',
        priority: 'high',
        defaultRetention: '24h'
      },
      inactive_accounts: {
        description: 'Accounts with no activity',
        priority: 'medium',
        defaultRetention: '2y'
      },
      session_data: {
        description: 'User session information',
        priority: 'high',
        defaultRetention: '30d'
      },
      test_data: {
        description: 'Development and testing data',
        priority: 'high',
        defaultRetention: '30d'
      }
    };
  }
  
  /**
   * Run data minimization process
   */
  async runMinimization(options = {}) {
    try {
      const {
        dryRun = false,
        categories = null,
        requestingUserId,
        force = false
      } = options;
      
      const minimizationResult = {
        timestamp: new Date().toISOString(),
        dryRun,
        requestingUserId,
        categories: {},
        summary: {
          itemsProcessed: 0,
          itemsDeleted: 0,
          itemsAnonymized: 0,
          itemsArchived: 0,
          itemsAggregated: 0,
          spaceSaved: 0,
          errors: []
        },
        recommendations: []
      };
      
      // Determine which categories to process
      const categoriesToProcess = categories || Object.keys(this.minimizationCategories);
      
      // Process each category
      for (const category of categoriesToProcess) {
        try {
          const categoryResult = await this.processCategory(category, { dryRun, force });
          minimizationResult.categories[category] = categoryResult;
          
          // Update summary
          minimizationResult.summary.itemsProcessed += categoryResult.itemsProcessed;
          minimizationResult.summary.itemsDeleted += categoryResult.itemsDeleted;
          minimizationResult.summary.itemsAnonymized += categoryResult.itemsAnonymized;
          minimizationResult.summary.itemsArchived += categoryResult.itemsArchived;
          minimizationResult.summary.itemsAggregated += categoryResult.itemsAggregated;
          minimizationResult.summary.spaceSaved += categoryResult.spaceSaved;
        } catch (error) {
          minimizationResult.summary.errors.push({
            category,
            error: error.message
          });
          
          minimizationResult.categories[category] = {
            status: 'failed',
            error: error.message,
            itemsProcessed: 0
          };
        }
      }
      
      // Generate recommendations
      minimizationResult.recommendations = await this.generateMinimizationRecommendations(
        minimizationResult
      );
      
      // Log the operation
      piiSafeLogger.trackPrivacyOperation('data_minimization', requestingUserId, {
        dryRun,
        categories: categoriesToProcess,
        itemsProcessed: minimizationResult.summary.itemsProcessed,
        itemsDeleted: minimizationResult.summary.itemsDeleted,
        spaceSaved: minimizationResult.summary.spaceSaved,
        errors: minimizationResult.summary.errors.length
      });
      
      return minimizationResult;
    } catch (error) {
      piiSafeLogger.error('Data minimization failed', {
        error: error.message,
        requestingUserId: options.requestingUserId
      });
      throw error;
    }
  }
  
  /**
   * Process a specific category for minimization
   */
  async processCategory(category, options = {}) {
    const { dryRun = false, force = false } = options;
    
    try {
      const categoryConfig = this.minimizationCategories[category];
      if (!categoryConfig) {
        throw new Error(`Unknown category: ${category}`);
      }
      
      const result = {
        category,
        description: categoryConfig.description,
        status: 'completed',
        startTime: new Date().toISOString(),
        itemsProcessed: 0,
        itemsDeleted: 0,
        itemsAnonymized: 0,
        itemsArchived: 0,
        itemsAggregated: 0,
        spaceSaved: 0,
        actions: [],
        endTime: null
      };
      
      // Get items to process
      const items = await this.getCategoryItems(category);
      result.itemsProcessed = items.length;
      
      // Apply minimization rules based on category
      switch (category) {
        case 'logs':
          await this.minimizeLogs(items, result, dryRun, force);
          break;
          
        case 'analytics':
          await this.minimizeAnalytics(items, result, dryRun, force);
          break;
          
        case 'temporary_data':
          await this.minimizeTemporaryData(items, result, dryRun, force);
          break;
          
        case 'inactive_accounts':
          await this.minimizeInactiveAccounts(items, result, dryRun, force);
          break;
          
        case 'session_data':
          await this.minimizeSessionData(items, result, dryRun, force);
          break;
          
        case 'test_data':
          await this.minimizeTestData(items, result, dryRun, force);
          break;
          
        default:
          await this.minimizeGeneric(items, result, dryRun, force);
      }
      
      result.endTime = new Date().toISOString();
      return result;
    } catch (error) {
      piiSafeLogger.error('Category minimization failed', {
        error: error.message,
        category
      });
      throw error;
    }
  }
  
  /**
   * Get items for a specific category
   */
  async getCategoryItems(category) {
    // Mock implementation - in reality, this would query databases
    switch (category) {
      case 'logs':
        return this.generateMockItems('log', 1000);
      case 'analytics':
        return this.generateMockItems('analytics', 5000);
      case 'temporary_data':
        return this.generateMockItems('temp', 200);
      case 'inactive_accounts':
        return this.generateMockItems('account', 150);
      case 'session_data':
        return this.generateMockItems('session', 800);
      case 'test_data':
        return this.generateMockItems('test', 100);
      default:
        return [];
    }
  }
  
  /**
   * Generate mock items for testing
   */
  generateMockItems(type, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: `${type}_${i}`,
        type,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        size: Math.floor(Math.random() * 1024 * 1024), // Random size up to 1MB
        metadata: {
          source: `${type}_source`,
          category: type
        }
      });
    }
    return items;
  }
  
  /**
   * Minimize log data
   */
  async minimizeLogs(items, result, dryRun, force) {
    const retentionPeriod = this.minimizationRules.retention.user_logs.period;
    const cutoffDate = this.calculateCutoffDate(retentionPeriod);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate)) {
          // Check for exceptions
          if (!force && this.hasException(item, 'security_incidents')) {
            result.actions.push({
              item: item.id,
              action: 'skipped',
              reason: 'Security incident exception'
            });
            continue;
          }
          
          if (!dryRun) {
            await this.deleteItem(item);
            result.spaceSaved += item.size;
          }
          
          result.itemsDeleted++;
          result.actions.push({
            item: item.id,
            action: 'deleted',
            reason: `Exceeded retention period: ${retentionPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Minimize analytics data
   */
  async minimizeAnalytics(items, result, dryRun, force) {
    const retentionPeriod = this.minimizationRules.retention.analytics_data.period;
    const cutoffDate = this.calculateCutoffDate(retentionPeriod);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate)) {
          // Aggregate old analytics data instead of deleting
          if (!dryRun) {
            await this.aggregateItem(item);
            result.spaceSaved += item.size * 0.9; // Assume 90% space saving
          }
          
          result.itemsAggregated++;
          result.actions.push({
            item: item.id,
            action: 'aggregated',
            reason: `Data aggregated after ${retentionPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Minimize temporary data
   */
  async minimizeTemporaryData(items, result, dryRun, force) {
    const retentionPeriod = this.minimizationRules.retention.temporary_files.period;
    const cutoffDate = this.calculateCutoffDate(retentionPeriod);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate)) {
          if (!dryRun) {
            await this.deleteItem(item);
            result.spaceSaved += item.size;
          }
          
          result.itemsDeleted++;
          result.actions.push({
            item: item.id,
            action: 'deleted',
            reason: `Temporary file expired: ${retentionPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Minimize inactive account data
   */
  async minimizeInactiveAccounts(items, result, dryRun, force) {
    const inactivityPeriod = '2y';
    const cutoffDate = this.calculateCutoffDate(inactivityPeriod);
    
    for (const item of items) {
      try {
        // Check if account has been inactive
        if (this.isInactive(item, cutoffDate)) {
          // Anonymize instead of delete to preserve analytics
          if (!dryRun) {
            await this.anonymizeAccount(item);
            result.spaceSaved += item.size * 0.3; // Assume 30% space saving
          }
          
          result.itemsAnonymized++;
          result.actions.push({
            item: item.id,
            action: 'anonymized',
            reason: `Account inactive for ${inactivityPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Minimize session data
   */
  async minimizeSessionData(items, result, dryRun, force) {
    const retentionPeriod = this.minimizationRules.retention.session_data.period;
    const cutoffDate = this.calculateCutoffDate(retentionPeriod);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate)) {
          // Check if session is still active
          if (!force && this.isActiveSession(item)) {
            result.actions.push({
              item: item.id,
              action: 'skipped',
              reason: 'Active session exception'
            });
            continue;
          }
          
          // Anonymize session data
          if (!dryRun) {
            await this.anonymizeSession(item);
            result.spaceSaved += item.size * 0.5;
          }
          
          result.itemsAnonymized++;
          result.actions.push({
            item: item.id,
            action: 'anonymized',
            reason: `Session expired: ${retentionPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Minimize test data
   */
  async minimizeTestData(items, result, dryRun, force) {
    const retentionPeriod = '30d';
    const cutoffDate = this.calculateCutoffDate(retentionPeriod);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate) || force) {
          if (!dryRun) {
            await this.deleteItem(item);
            result.spaceSaved += item.size;
          }
          
          result.itemsDeleted++;
          result.actions.push({
            item: item.id,
            action: 'deleted',
            reason: `Test data cleanup: ${retentionPeriod}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Generic minimization for other categories
   */
  async minimizeGeneric(items, result, dryRun, force) {
    const defaultRetention = '1y';
    const cutoffDate = this.calculateCutoffDate(defaultRetention);
    
    for (const item of items) {
      try {
        if (this.isExpired(item.createdAt, cutoffDate)) {
          // Archive by default for unknown categories
          if (!dryRun) {
            await this.archiveItem(item);
            result.spaceSaved += item.size * 0.7;
          }
          
          result.itemsArchived++;
          result.actions.push({
            item: item.id,
            action: 'archived',
            reason: `Generic retention: ${defaultRetention}`
          });
        }
      } catch (error) {
        result.actions.push({
          item: item.id,
          action: 'error',
          error: error.message
        });
      }
    }
  }
  
  /**
   * Calculate cutoff date based on retention period
   */
  calculateCutoffDate(period) {
    const now = new Date();
    const periodMappings = {
      '24h': 1,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      '2y': 730,
      '7y': 2555
    };
    
    const days = periodMappings[period] || 365;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  
  /**
   * Check if item is expired
   */
  isExpired(createdAt, cutoffDate) {
    return new Date(createdAt) < cutoffDate;
  }
  
  /**
   * Check if item has retention exception
   */
  hasException(item, exceptionType) {
    // Mock exception checking
    switch (exceptionType) {
      case 'security_incidents':
        return item.metadata && item.metadata.securityIncident;
      case 'legal_holds':
        return item.metadata && item.metadata.legalHold;
      case 'active_sessions':
        return item.metadata && item.metadata.active;
      default:
        return false;
    }
  }
  
  /**
   * Check if account is inactive
   */
  isInactive(item, cutoffDate) {
    const lastActivity = item.metadata?.lastActivity || item.createdAt;
    return new Date(lastActivity) < cutoffDate;
  }
  
  /**
   * Check if session is still active
   */
  isActiveSession(item) {
    return item.metadata && item.metadata.active === true;
  }
  
  /**
   * Generate minimization recommendations
   */
  async generateMinimizationRecommendations(result) {
    const recommendations = [];
    
    // Check if any categories had errors
    if (result.summary.errors.length > 0) {
      recommendations.push('Review and fix errors in data minimization process');
      recommendations.push('Consider increasing error handling for category: ' + 
        result.summary.errors[0].category);
    }
    
    // Check space savings
    if (result.summary.spaceSaved < 1024 * 1024) { // Less than 1MB saved
      recommendations.push('Review retention policies - minimal space savings achieved');
    }
    
    // Check processing efficiency
    const totalProcessed = result.summary.itemsProcessed;
    const totalActioned = result.summary.itemsDeleted + 
                         result.summary.itemsAnonymized + 
                         result.summary.itemsArchived + 
                         result.summary.itemsAggregated;
    
    if (totalActioned / totalProcessed < 0.1) {
      recommendations.push('Consider adjusting retention periods - few items processed');
    }
    
    // Category-specific recommendations
    for (const [category, categoryResult] of Object.entries(result.categories)) {
      if (categoryResult.status === 'failed') {
        recommendations.push(`Fix issues with ${category} minimization process`);
      }
      
      if (categoryResult.itemsProcessed > 0 && 
          (categoryResult.itemsDeleted + categoryResult.itemsAnonymized + 
           categoryResult.itemsArchived + categoryResult.itemsAggregated) === 0) {
        recommendations.push(`Review retention policy for ${category} - no items processed`);
      }
    }
    
    // General recommendations
    recommendations.push('Schedule regular data minimization runs');
    recommendations.push('Monitor data growth patterns to optimize retention policies');
    recommendations.push('Review and update exceptions to ensure they remain necessary');
    
    return recommendations;
  }
  
  /**
   * Check data collection necessity
   */
  async checkCollectionNecessity(dataType, purpose) {
    try {
      const collectionRule = this.minimizationRules.collection[dataType];
      
      if (!collectionRule) {
        return {
          necessary: false,
          reason: 'No collection rule defined',
          recommendation: 'Define collection necessity rule for this data type'
        };
      }
      
      const result = {
        dataType,
        purpose,
        necessary: collectionRule.necessary,
        alternative: collectionRule.alternative,
        justification: collectionRule.justification,
        optInRequired: collectionRule.opt_in_required || false,
        recommendation: null
      };
      
      // Generate recommendations based on necessity
      if (!result.necessary && !result.optInRequired) {
        result.recommendation = 'Consider making this data collection opt-in only';
      } else if (result.necessary && result.alternative) {
        result.recommendation = `Consider using alternative: ${result.alternative}`;
      }
      
      return result;
    } catch (error) {
      piiSafeLogger.error('Collection necessity check failed', {
        error: error.message,
        dataType,
        purpose
      });
      throw error;
    }
  }
  
  /**
   * Analyze data usage patterns for minimization opportunities
   */
  async analyzeDataUsage(options = {}) {
    try {
      const { timeframe = '30d', categories = null } = options;
      
      const analysis = {
        timestamp: new Date().toISOString(),
        timeframe,
        categories: {},
        recommendations: [],
        summary: {
          totalDataAnalyzed: 0,
          unusedDataPercent: 0,
          potentialSavings: 0
        }
      };
      
      const categoriesToAnalyze = categories || Object.keys(this.minimizationCategories);
      
      for (const category of categoriesToAnalyze) {
        const categoryAnalysis = await this.analyzeCategoryUsage(category, timeframe);
        analysis.categories[category] = categoryAnalysis;
        
        analysis.summary.totalDataAnalyzed += categoryAnalysis.totalItems;
        analysis.summary.unusedDataPercent += categoryAnalysis.unusedPercent / categoriesToAnalyze.length;
        analysis.summary.potentialSavings += categoryAnalysis.potentialSavings;
      }
      
      // Generate recommendations based on analysis
      analysis.recommendations = this.generateUsageRecommendations(analysis.categories);
      
      return analysis;
    } catch (error) {
      piiSafeLogger.error('Data usage analysis failed', {
        error: error.message,
        options
      });
      throw error;
    }
  }
  
  /**
   * Analyze usage for a specific category
   */
  async analyzeCategoryUsage(category, timeframe) {
    // Mock analysis - in reality would query access logs and usage patterns
    const totalItems = Math.floor(Math.random() * 1000) + 500;
    const accessedItems = Math.floor(totalItems * (0.3 + Math.random() * 0.4)); // 30-70% accessed
    const unusedItems = totalItems - accessedItems;
    
    return {
      category,
      totalItems,
      accessedItems,
      unusedItems,
      unusedPercent: (unusedItems / totalItems) * 100,
      avgAccessFrequency: Math.random() * 10,
      potentialSavings: unusedItems * 1024 * Math.random(), // Mock size calculations
      recommendations: this.generateCategoryUsageRecommendations(category, unusedItems / totalItems)
    };
  }
  
  /**
   * Generate usage-based recommendations
   */
  generateUsageRecommendations(categoryAnalyses) {
    const recommendations = [];
    
    for (const [category, analysis] of Object.entries(categoryAnalyses)) {
      if (analysis.unusedPercent > 70) {
        recommendations.push(`High unused data in ${category} (${analysis.unusedPercent.toFixed(1)}%) - consider shorter retention`);
      }
      
      if (analysis.avgAccessFrequency < 0.1) {
        recommendations.push(`${category} data rarely accessed - evaluate collection necessity`);
      }
    }
    
    // Global recommendations
    const avgUnused = Object.values(categoryAnalyses)
      .reduce((sum, analysis) => sum + analysis.unusedPercent, 0) / Object.keys(categoryAnalyses).length;
    
    if (avgUnused > 50) {
      recommendations.push('Overall high unused data - review global retention policies');
    }
    
    return recommendations;
  }
  
  /**
   * Generate category-specific usage recommendations
   */
  generateCategoryUsageRecommendations(category, unusedRatio) {
    const recommendations = [];
    
    if (unusedRatio > 0.8) {
      recommendations.push(`Very high unused ratio - consider immediate cleanup`);
    } else if (unusedRatio > 0.5) {
      recommendations.push(`Significant unused data - review retention policy`);
    }
    
    // Category-specific recommendations
    switch (category) {
      case 'logs':
        if (unusedRatio > 0.7) {
          recommendations.push('Consider reducing log retention period');
        }
        break;
      case 'analytics':
        if (unusedRatio > 0.6) {
          recommendations.push('Consider aggregating older analytics data');
        }
        break;
      case 'session_data':
        if (unusedRatio > 0.5) {
          recommendations.push('Review session cleanup frequency');
        }
        break;
    }
    
    return recommendations;
  }
  
  // Mock implementation methods for data operations
  
  async deleteItem(item) {
    // Mock deletion - in reality would delete from database/storage
    return true;
  }
  
  async aggregateItem(item) {
    // Mock aggregation - in reality would combine data points
    return true;
  }
  
  async anonymizeAccount(item) {
    // Mock anonymization - in reality would remove PII
    return true;
  }
  
  async anonymizeSession(item) {
    // Mock session anonymization
    return true;
  }
  
  async archiveItem(item) {
    // Mock archiving - in reality would move to cold storage
    return true;
  }
}

// Export singleton instance
export const dataMinimization = new DataMinimization();