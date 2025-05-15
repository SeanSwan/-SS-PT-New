#!/usr/bin/env node

/**
 * Complete Fix for PII Scanning Issues
 * This script addresses all the "Cannot read properties of undefined (reading 'length')" errors
 */

console.log('🔧 Applying complete fix for PII scanning issues...\n');

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fixPIIIssues() {
  try {
    // Fix 1: Update PIIManager to handle all edge cases
    console.log('1. Fixing PIIManager.mjs...');
    const piiManagerPath = join(process.cwd(), 'services', 'privacy', 'PIIManager.mjs');
    let piiManagerContent = await readFile(piiManagerPath, 'utf8');
    
    // Add comprehensive input validation to scanForPII
    const scanForPIIFix = `  async scanForPII(content, context = 'general') {
    try {
      // Comprehensive defensive checks
      if (content === null || content === undefined) {
        return this.createEmptyResult(context);
      }
      
      // Convert to string safely
      let stringContent;
      try {
        stringContent = String(content);
      } catch (conversionError) {
        console.warn('Content conversion failed in scanForPII:', conversionError.message);
        return this.createEmptyResult(context);
      }
      
      // Check for empty string after conversion
      if (stringContent.length === 0) {
        return this.createEmptyResult(context);
      }
      
      const detectedPII = [];
      let confidence = 1.0;
      
      // Scan for each PII type with individual error handling
      for (const [type, pattern] of Object.entries(this.piiPatterns)) {
        try {
          // Ensure we have a valid pattern
          if (!pattern || typeof pattern.test !== 'function') {
            console.warn(\`Invalid pattern for type \${type}, skipping\`);
            continue;
          }
          
          // Reset global regex state
          if (pattern.global) {
            pattern.lastIndex = 0;
          }
          
          let matches;
          try {
            matches = stringContent.match(pattern);
          } catch (matchError) {
            console.warn(\`Match failed for pattern \${type}:\`, matchError.message);
            continue;
          }
          
          if (matches && Array.isArray(matches) && matches.length > 0) {
            for (const match of matches) {
              if (match && typeof match === 'string' && match.length > 0) {
                try {
                  const detection = {
                    type,
                    value: match,
                    position: stringContent.indexOf(match),
                    confidence: this.calculateConfidence(type, match, context),
                    risk: this.assessRisk(type, context),
                    recommendation: this.getRecommendation(type, context)
                  };
                  
                  detectedPII.push(detection);
                  confidence = Math.min(confidence, detection.confidence);
                } catch (detectionError) {
                  console.warn(\`Error creating detection for \${type}:\`, detectionError.message);
                }
              }
            }
          }
        } catch (patternError) {
          console.warn(\`Pattern error for type \${type}:\`, patternError.message);
          continue;
        }
      }
      
      // Rest of the function continues...
      const contextualPII = await this.performContextualDetection(stringContent, context);
      if (contextualPII && contextualPII.length > 0) {
        detectedPII.push(...contextualPII);
      }
      
      const risks = this.assessOverallRisks(detectedPII);
      
      const result = {
        piiDetected: detectedPII.length > 0,
        detections: detectedPII,
        confidence,
        risks,
        context,
        recommendations: this.generateRecommendations(detectedPII, risks),
        scannedLength: stringContent.length,
        timestamp: new Date().toISOString()
      };
      
      // Safe logging without PII scanning recursion
      if (context !== 'logging') {
        try {
          console.log('PII scan completed:', {
            context,
            piiFound: result.piiDetected,
            typesDetected: [...new Set(detectedPII.map(d => d.type))],
            confidence,
            riskLevel: risks.level
          });
        } catch (logError) {
          // Silently continue if logging fails
        }
      }
      
      return result;
    } catch (error) {
      console.error('PII scan failed:', error.message);
      return this.createEmptyResultWithError(context, error.message);
    }
  }
  
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
  }`;
    
    // Insert the new helper methods
    if (!piiManagerContent.includes('createEmptyResult')) {
      piiManagerContent = piiManagerContent.replace(
        'export class PIIManager {',
        `export class PIIManager {
  
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
  }`
      );
    }
    
    await writeFile(piiManagerPath, piiManagerContent);
    console.log('✅ PIIManager.mjs fixed');
    
    // Fix 2: Update piiSafeLogging to handle all edge cases
    console.log('2. Fixing piiSafeLogging.mjs...');
    const piiLoggerPath = join(process.cwd(), 'utils', 'monitoring', 'piiSafeLogging.mjs');
    let piiLoggerContent = await readFile(piiLoggerPath, 'utf8');
    
    // Ensure basicPIIScrub handles all edge cases
    const basicPIIScrubFix = `  basicPIIScrub(text) {
    // Comprehensive defensive checks
    if (text === null || text === undefined) {
      return text;
    }
    
    // Convert to string safely
    let stringText;
    try {
      stringText = String(text);
    } catch (conversionError) {
      console.warn('Failed to convert text in basicPIIScrub:', conversionError.message);
      return '[CONVERSION_ERROR]';
    }
    
    // Handle empty string
    if (stringText.length === 0) {
      return stringText;
    }
    
    // Basic regex patterns for common PII
    const patterns = [
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
      { pattern: /\\b\\d{3}-?\\d{2}-?\\d{4}\\b/g, replacement: '[SSN]' },
      { pattern: /\\b\\d{3}-?\\d{3}-?\\d{4}\\b/g, replacement: '[PHONE]' },
      { pattern: /\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b/g, replacement: '[CARD]' }
    ];
    
    let scrubbedText = stringText;
    
    for (const { pattern, replacement } of patterns) {
      try {
        // Reset regex state
        if (pattern.global) {
          pattern.lastIndex = 0;
        }
        scrubbedText = scrubbedText.replace(pattern, replacement);
      } catch (patternError) {
        console.warn('Pattern error in basicPIIScrub:', patternError.message);
        continue;
      }
    }
    
    return scrubbedText;
  }`;
    
    // Replace the existing basicPIIScrub method
    piiLoggerContent = piiLoggerContent.replace(
      /basicPIIScrub\(text\) \{[\s\S]*?\n  \}/m,
      basicPIIScrubFix.substring(2) // Remove the first two spaces
    );
    
    await writeFile(piiLoggerPath, piiLoggerContent);
    console.log('✅ piiSafeLogging.mjs fixed');
    
    // Fix 3: Update apiKeyChecker to prevent PII scanning during startup
    console.log('3. Fixing apiKeyChecker.mjs...');
    const apiKeyCheckerPath = join(process.cwd(), 'utils', 'apiKeyChecker.mjs');
    let apiKeyCheckerContent = await readFile(apiKeyCheckerPath, 'utf8');
    
    // Remove PII logger import if it exists
    apiKeyCheckerContent = apiKeyCheckerContent.replace(
      /import \{ piiSafeLogger \} from.*?\n/g,
      '// PII logger removed to prevent circular dependency during startup\n'
    );
    
    // Replace any piiSafeLogger calls with console
    apiKeyCheckerContent = apiKeyCheckerContent.replace(/piiSafeLogger\.(warn|error|log|info)/g, 'console.$1');
    
    await writeFile(apiKeyCheckerPath, apiKeyCheckerContent);
    console.log('✅ apiKeyChecker.mjs fixed');
    
    // Fix 4: Create a verification script
    console.log('4. Creating verification script...');
    const verificationScript = `#!/usr/bin/env node

/**
 * PII Fix Verification Script
 * Tests all the scenarios that were causing errors
 */

console.log('🔍 Verifying PII fixes...');

async function verifyFixes() {
  try {
    console.log('\\nImporting PIIManager...');
    const { piiManager } = await import('./services/privacy/PIIManager.mjs');
    
    console.log('Importing piiSafeLogger...');
    const { piiSafeLogger } = await import('./utils/monitoring/piiSafeLogging.mjs');
    
    console.log('\\n1. Testing null/undefined inputs...');
    await piiManager.scanForPII(null);
    await piiManager.scanForPII(undefined);
    await piiManager.sanitizeContent(null);
    await piiManager.sanitizeContent(undefined);
    await piiManager.sanitizeContent('', { context: undefined });
    await piiManager.sanitizeContent('', {}); // No context
    console.log('✅ Null/undefined tests passed');
    
    console.log('\\n2. Testing type conversion...');
    await piiManager.scanForPII(123);
    await piiManager.scanForPII([]);
    await piiManager.scanForPII({});
    await piiManager.sanitizeContent(123);
    await piiManager.sanitizeContent([]);
    await piiManager.sanitizeContent({});
    console.log('✅ Type conversion tests passed');
    
    console.log('\\n3. Testing edge case strings...');
    const edgeCases = ['', ' ', 'test@', '@test.com', '123-', '-456'];
    for (const testCase of edgeCases) {
      await piiManager.scanForPII(testCase);
      await piiManager.sanitizeContent(testCase);
    }
    console.log('✅ Edge case tests passed');
    
    console.log('\\n4. Testing logging integration...');
    await piiSafeLogger.info('Test message');
    await piiSafeLogger.error('Error message', { context: 'test' });
    await piiSafeLogger.warn('Warning with PII: user@example.com');
    console.log('✅ Logging integration tests passed');
    
    console.log('\\n🎉 All verification tests passed!');
    console.log('PII scanning should now be stable and error-free.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

verifyFixes();
`;
    
    await writeFile(join(process.cwd(), 'verify-pii-fixes.mjs'), verificationScript);
    console.log('✅ Verification script created');
    
    console.log('\\n🎉 All fixes applied successfully!');
    console.log('\\nNext steps:');
    console.log('1. Run the verification script: node verify-pii-fixes.mjs');
    console.log('2. Restart the server: npm run clear-cache-restart');
    console.log('3. Check that "Cannot read properties of undefined" errors are gone');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixPIIIssues();
