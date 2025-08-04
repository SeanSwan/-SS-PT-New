/**
 * useNASMValidation.ts
 * ====================
 * 
 * Custom hook for NASM compliance validation
 * Provides real-time exercise validation against NASM standards
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time NASM compliance checking
 * - Visual validation feedback
 * - Detailed compliance scoring
 * - Improvement suggestions
 * - Professional standards enforcement
 * - Accessibility compliance
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// === INTERFACES ===

interface ValidationRule {
  id: string;
  category: 'safety' | 'form' | 'progression' | 'contraindication' | 'equipment';
  name: string;
  description: string;
  weight: number; // Impact on overall score (1-10)
  required: boolean;
  validator: (exerciseData: ExerciseFormData) => ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

interface ExerciseFormData {
  name: string;
  description: string;
  instructions: string[];
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentNeeded: string[];
  difficulty: number;
  contraindicationNotes: string;
  safetyTips: string;
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedDuration?: number;
  prerequisites: string[];
  progressionPath: string[];
}

interface ComplianceReport {
  overallScore: number;
  maxScore: number;
  percentage: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  passesCompliance: boolean;
  validationResults: {
    category: string;
    results: ValidationResult[];
    categoryScore: number;
    categoryWeight: number;
  }[];
  recommendations: string[];
  criticalIssues: ValidationResult[];
}

interface UseNASMValidationReturn {
  validationScore: number;
  validationErrors: ValidationResult[];
  validationWarnings: ValidationResult[];
  complianceReport: ComplianceReport | null;
  isValidating: boolean;
  
  // Actions
  validateExercise: (exerciseData: ExerciseFormData) => Promise<ComplianceReport>;
  validateField: (fieldName: keyof ExerciseFormData, value: any) => ValidationResult[];
  getFieldSuggestions: (fieldName: keyof ExerciseFormData, currentValue: any) => string[];
  exportReport: (format: 'pdf' | 'json') => void;
}

// === NASM VALIDATION RULES ===

const NASM_VALIDATION_RULES: ValidationRule[] = [
  // Safety Rules
  {
    id: 'safety_contraindications',
    category: 'safety',
    name: 'Contraindication Documentation',
    description: 'Exercise must document any contraindications or safety concerns',
    weight: 10,
    required: true,
    validator: (data) => {
      const hasContraindications = data.contraindicationNotes && data.contraindicationNotes.trim().length > 0;
      return {
        isValid: hasContraindications,
        score: hasContraindications ? 100 : 0,
        message: hasContraindications 
          ? 'Contraindications properly documented' 
          : 'Missing contraindication notes',
        suggestion: 'Add detailed contraindication notes including populations who should avoid this exercise',
        severity: hasContraindications ? 'info' : 'error'
      };
    }
  },
  {
    id: 'safety_tips',
    category: 'safety',
    name: 'Safety Guidelines',
    description: 'Exercise must include comprehensive safety tips',
    weight: 8,
    required: true,
    validator: (data) => {
      const hasSafetyTips = data.safetyTips && data.safetyTips.trim().length > 20;
      return {
        isValid: hasSafetyTips,
        score: hasSafetyTips ? 100 : 0,
        message: hasSafetyTips 
          ? 'Safety tips adequately provided' 
          : 'Safety tips missing or insufficient',
        suggestion: 'Include detailed safety tips covering proper form, common mistakes, and injury prevention',
        severity: hasSafetyTips ? 'info' : 'error'
      };
    }
  },
  
  // Form and Technique Rules
  {
    id: 'form_instructions',
    category: 'form',
    name: 'Detailed Instructions',
    description: 'Exercise must have step-by-step instructions following NASM guidelines',
    weight: 9,
    required: true,
    validator: (data) => {
      const instructionCount = data.instructions.length;
      const hasDetailedInstructions = instructionCount >= 3 && 
        data.instructions.every(inst => inst.trim().length > 10);
      
      const score = Math.min(100, (instructionCount / 5) * 100);
      
      return {
        isValid: hasDetailedInstructions,
        score: hasDetailedInstructions ? score : 0,
        message: hasDetailedInstructions 
          ? `${instructionCount} detailed steps provided` 
          : 'Instructions are insufficient or too brief',
        suggestion: 'Provide at least 3 detailed step-by-step instructions, each explaining proper form and technique',
        severity: hasDetailedInstructions ? 'info' : 'error'
      };
    }
  },
  {
    id: 'form_muscle_targeting',
    category: 'form',
    name: 'Muscle Group Specification',
    description: 'Exercise must clearly identify primary and secondary muscle groups',
    weight: 7,
    required: true,
    validator: (data) => {
      const hasPrimaryMuscles = data.primaryMuscles.length > 0;
      const hasRealisticTargeting = data.primaryMuscles.length <= 3; // Don't target too many primary muscles
      
      const score = hasPrimaryMuscles && hasRealisticTargeting ? 100 : 
                   hasPrimaryMuscles ? 70 : 0;
      
      return {
        isValid: hasPrimaryMuscles,
        score,
        message: hasPrimaryMuscles 
          ? hasRealisticTargeting 
            ? 'Muscle targeting appropriately specified' 
            : 'Too many primary muscle groups targeted'
          : 'Primary muscle groups not specified',
        suggestion: 'Specify 1-3 primary muscle groups that are the main focus of this exercise',
        severity: hasPrimaryMuscles ? hasRealisticTargeting ? 'info' : 'warning' : 'error'
      };
    }
  },
  
  // Progression Rules
  {
    id: 'progression_difficulty',
    category: 'progression',
    name: 'Appropriate Difficulty Level',
    description: 'Exercise difficulty must be appropriately rated on NASM scale',
    weight: 6,
    required: true,
    validator: (data) => {
      const isValidDifficulty = data.difficulty >= 0 && data.difficulty <= 1000;
      const hasReasonableDifficulty = data.difficulty > 0;
      
      return {
        isValid: isValidDifficulty && hasReasonableDifficulty,
        score: isValidDifficulty && hasReasonableDifficulty ? 100 : 0,
        message: isValidDifficulty && hasReasonableDifficulty 
          ? `Difficulty level ${data.difficulty}/1000 is appropriate` 
          : 'Difficulty level is not properly set',
        suggestion: 'Set difficulty between 1-1000, where 1-200 is beginner, 201-600 is intermediate, 601-1000 is advanced',
        severity: isValidDifficulty && hasReasonableDifficulty ? 'info' : 'error'
      };
    }
  },
  {
    id: 'progression_prerequisites',
    category: 'progression',
    name: 'Prerequisite Skills',
    description: 'Advanced exercises should list prerequisite movements or skills',
    weight: 5,
    required: false,
    validator: (data) => {
      const isAdvanced = data.difficulty > 400;
      const hasPrerequisites = data.prerequisites && data.prerequisites.length > 0;
      
      if (!isAdvanced) {
        return {
          isValid: true,
          score: 100,
          message: 'Prerequisites not required for this difficulty level',
          severity: 'info'
        };
      }
      
      return {
        isValid: hasPrerequisites,
        score: hasPrerequisites ? 100 : 70, // Not critical for advanced exercises
        message: hasPrerequisites 
          ? 'Prerequisites appropriately listed' 
          : 'Consider adding prerequisites for this advanced exercise',
        suggestion: 'List simpler exercises or skills that should be mastered before attempting this exercise',
        severity: hasPrerequisites ? 'info' : 'warning'
      };
    }
  },
  
  // Equipment and Environment Rules
  {
    id: 'equipment_specification',
    category: 'equipment',
    name: 'Equipment Requirements',
    description: 'Exercise must clearly specify all required equipment',
    weight: 4,
    required: true,
    validator: (data) => {
      const exerciseType = data.exerciseType.toLowerCase();
      const isBodyweight = exerciseType.includes('bodyweight') || exerciseType.includes('calisthenics');
      const hasEquipment = data.equipmentNeeded && data.equipmentNeeded.length > 0;
      const hasNoEquipmentFlag = data.equipmentNeeded && 
        data.equipmentNeeded.some(eq => eq.toLowerCase().includes('none'));
      
      if (isBodyweight || hasNoEquipmentFlag) {
        return {
          isValid: true,
          score: 100,
          message: 'Equipment requirements clearly specified (bodyweight/no equipment)',
          severity: 'info'
        };
      }
      
      return {
        isValid: hasEquipment,
        score: hasEquipment ? 100 : 0,
        message: hasEquipment 
          ? 'Equipment requirements specified' 
          : 'Equipment requirements not specified',
        suggestion: 'List all equipment needed or specify "None" for bodyweight exercises',
        severity: hasEquipment ? 'info' : 'error'
      };
    }
  },
  
  // Quality and Completeness Rules
  {
    id: 'quality_description',
    category: 'form',
    name: 'Comprehensive Description',
    description: 'Exercise description must be detailed and informative',
    weight: 6,
    required: true,
    validator: (data) => {
      const descriptionLength = data.description.trim().length;
      const isDetailed = descriptionLength >= 50;
      const score = Math.min(100, (descriptionLength / 200) * 100);
      
      return {
        isValid: isDetailed,
        score: isDetailed ? score : 0,
        message: isDetailed 
          ? 'Description is comprehensive' 
          : 'Description is too brief or missing',
        suggestion: 'Provide a detailed description explaining the exercise purpose, benefits, and key form points',
        severity: isDetailed ? 'info' : 'error'
      };
    }
  },
  {
    id: 'quality_naming',
    category: 'form',
    name: 'Clear Exercise Naming',
    description: 'Exercise name must be clear, descriptive, and follow NASM naming conventions',
    weight: 3,
    required: true,
    validator: (data) => {
      const name = data.name.trim();
      const isAppropriateLength = name.length >= 3 && name.length <= 80;
      const hasDescriptiveWords = /[a-zA-Z]/.test(name);
      const isNotAllCaps = name !== name.toUpperCase();
      
      const score = (isAppropriateLength ? 40 : 0) + 
                   (hasDescriptiveWords ? 40 : 0) + 
                   (isNotAllCaps ? 20 : 0);
      
      return {
        isValid: score >= 80,
        score,
        message: score >= 80 
          ? 'Exercise name is clear and appropriate' 
          : 'Exercise name needs improvement',
        suggestion: 'Use a clear, descriptive name that explains the movement (e.g., "Push-up - Knee Variation")',
        severity: score >= 80 ? 'info' : 'warning'
      };
    }
  }
];

// === UTILITY FUNCTIONS ===

const calculateGrade = (percentage: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' => {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'B+';
  if (percentage >= 87) return 'B';
  if (percentage >= 83) return 'C+';
  if (percentage >= 80) return 'C';
  if (percentage >= 70) return 'D';
  return 'F';
};

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A+':
    case 'A': return '#10b981'; // Green
    case 'B+':
    case 'B': return '#3b82f6'; // Blue
    case 'C+':
    case 'C': return '#f59e0b'; // Yellow
    case 'D': return '#f97316'; // Orange
    case 'F': return '#ef4444'; // Red
    default: return '#6b7280'; // Gray
  }
};

const groupResultsByCategory = (results: ValidationResult[], rules: ValidationRule[]) => {
  const categories = Array.from(new Set(rules.map(rule => rule.category)));
  
  return categories.map(category => {
    const categoryRules = rules.filter(rule => rule.category === category);
    const categoryResults = results.filter((_, index) => 
      categoryRules.some(rule => rules[index]?.id === rule.id)
    );
    
    const categoryScore = categoryResults.reduce((sum, result) => sum + result.score, 0);
    const maxCategoryScore = categoryRules.length * 100;
    const categoryWeight = categoryRules.reduce((sum, rule) => sum + rule.weight, 0);
    
    return {
      category: category.charAt(0).toUpperCase() + category.slice(1),
      results: categoryResults,
      categoryScore: Math.round((categoryScore / maxCategoryScore) * 100),
      categoryWeight
    };
  });
};

// === CUSTOM HOOK ===

export const useNASMValidation = (): UseNASMValidationReturn => {
  // State
  const [validationScore, setValidationScore] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationResult[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Refs
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Validate exercise
  const validateExercise = useCallback(async (exerciseData: ExerciseFormData): Promise<ComplianceReport> => {
    setIsValidating(true);
    
    try {
      // Run all validation rules
      const validationResults = NASM_VALIDATION_RULES.map(rule => ({
        rule,
        result: rule.validator(exerciseData)
      }));
      
      // Calculate overall score
      const totalWeight = NASM_VALIDATION_RULES.reduce((sum, rule) => sum + rule.weight, 0);
      const weightedScore = validationResults.reduce((sum, { rule, result }) => {
        return sum + (result.score * rule.weight);
      }, 0);
      
      const overallScore = Math.round(weightedScore / totalWeight);
      const percentage = Math.round((overallScore / 100) * 100);
      const grade = calculateGrade(percentage);
      const passesCompliance = percentage >= 80; // 80% minimum for NASM compliance
      
      // Separate errors and warnings
      const errors = validationResults
        .filter(({ result }) => result.severity === 'error')
        .map(({ result }) => result);
      
      const warnings = validationResults
        .filter(({ result }) => result.severity === 'warning')
        .map(({ result }) => result);
      
      // Generate recommendations
      const recommendations = validationResults
        .filter(({ result }) => result.suggestion && !result.isValid)
        .map(({ result }) => result.suggestion!);
      
      // Get critical issues
      const criticalIssues = validationResults
        .filter(({ rule, result }) => rule.required && !result.isValid)
        .map(({ result }) => result);
      
      // Group by category
      const categoryGroups = groupResultsByCategory(
        validationResults.map(({ result }) => result),
        NASM_VALIDATION_RULES
      );
      
      const report: ComplianceReport = {
        overallScore,
        maxScore: 100,
        percentage,
        grade,
        passesCompliance,
        validationResults: categoryGroups,
        recommendations,
        criticalIssues
      };
      
      // Update state
      setValidationScore(overallScore);
      setValidationErrors(errors);
      setValidationWarnings(warnings);
      setComplianceReport(report);
      
      return report;
      
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);
  
  // Validate single field
  const validateField = useCallback((
    fieldName: keyof ExerciseFormData, 
    value: any
  ): ValidationResult[] => {
    // Find rules that apply to this field
    const applicableRules = NASM_VALIDATION_RULES.filter(rule => {
      // Create a minimal exercise data object for testing
      const testData: Partial<ExerciseFormData> = {
        [fieldName]: value
      };
      
      // Only run rules that depend on this field
      switch (fieldName) {
        case 'contraindicationNotes':
          return rule.id === 'safety_contraindications';
        case 'safetyTips':
          return rule.id === 'safety_tips';
        case 'instructions':
          return rule.id === 'form_instructions';
        case 'primaryMuscles':
          return rule.id === 'form_muscle_targeting';
        case 'difficulty':
          return rule.id === 'progression_difficulty';
        case 'prerequisites':
          return rule.id === 'progression_prerequisites';
        case 'equipmentNeeded':
          return rule.id === 'equipment_specification';
        case 'description':
          return rule.id === 'quality_description';
        case 'name':
          return rule.id === 'quality_naming';
        default:
          return false;
      }
    });
    
    // Run applicable rules
    const results = applicableRules.map(rule => {
      try {
        return rule.validator(testData as ExerciseFormData);
      } catch {
        return {
          isValid: false,
          score: 0,
          message: 'Validation error',
          severity: 'error' as const
        };
      }
    });
    
    return results;
  }, []);
  
  // Get field suggestions
  const getFieldSuggestions = useCallback((
    fieldName: keyof ExerciseFormData, 
    currentValue: any
  ): string[] => {
    const suggestions: string[] = [];
    
    switch (fieldName) {
      case 'name':
        if (!currentValue || currentValue.length < 3) {
          suggestions.push('Exercise name should be at least 3 characters long');
        }
        if (currentValue && currentValue === currentValue.toUpperCase()) {
          suggestions.push('Avoid using ALL CAPS in exercise names');
        }
        suggestions.push('Include movement type and variations (e.g., "Push-up - Knee Variation")');
        break;
        
      case 'description':
        if (!currentValue || currentValue.length < 50) {
          suggestions.push('Description should be at least 50 characters long');
        }
        suggestions.push('Include exercise benefits and primary focus');
        suggestions.push('Mention what makes this exercise unique');
        break;
        
      case 'instructions':
        if (!currentValue || currentValue.length < 3) {
          suggestions.push('Include at least 3 step-by-step instructions');
        }
        suggestions.push('Start with setup and preparation');
        suggestions.push('Detail the movement execution');
        suggestions.push('Include breathing cues');
        break;
        
      case 'primaryMuscles':
        if (!currentValue || currentValue.length === 0) {
          suggestions.push('Specify at least one primary muscle group');
        }
        if (currentValue && currentValue.length > 3) {
          suggestions.push('Limit to 1-3 primary muscle groups for focus');
        }
        break;
        
      case 'difficulty':
        suggestions.push('1-200: Beginner level');
        suggestions.push('201-600: Intermediate level');
        suggestions.push('601-1000: Advanced level');
        break;
        
      case 'contraindicationNotes':
        if (!currentValue) {
          suggestions.push('List populations who should avoid this exercise');
          suggestions.push('Include injury-specific contraindications');
        }
        break;
        
      case 'safetyTips':
        if (!currentValue || currentValue.length < 20) {
          suggestions.push('Include form cues to prevent injury');
          suggestions.push('Mention common mistakes to avoid');
          suggestions.push('Add environmental safety considerations');
        }
        break;
    }
    
    return suggestions;
  }, []);
  
  // Export report
  const exportReport = useCallback((format: 'pdf' | 'json') => {
    if (!complianceReport) return;
    
    const reportData = {
      ...complianceReport,
      exportedAt: new Date().toISOString(),
      nasStandards: 'NASM-CPT Standards v2025',
      validatedBy: 'SwanStudios NASM Validation Engine'
    };
    
    let content: string;
    let mimeType: string;
    let filename: string;
    
    if (format === 'json') {
      content = JSON.stringify(reportData, null, 2);
      mimeType = 'application/json';
      filename = `nasm-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      // For PDF, we'd use a PDF generation library
      // For now, export as formatted text
      content = `NASM Compliance Report
Generated: ${reportData.exportedAt}

Overall Score: ${reportData.percentage}% (${reportData.grade})
Compliance Status: ${reportData.passesCompliance ? 'PASS' : 'FAIL'}

${reportData.criticalIssues.length > 0 ? `
Critical Issues:
${reportData.criticalIssues.map(issue => `- ${issue.message}`).join('\n')}
` : ''}

${reportData.recommendations.length > 0 ? `
Recommendations:
${reportData.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

Category Breakdown:
${reportData.validationResults.map(cat => 
  `${cat.category}: ${cat.categoryScore}%`
).join('\n')}
`;
      mimeType = 'text/plain';
      filename = `nasm-compliance-report-${new Date().toISOString().split('T')[0]}.txt`;
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [complianceReport]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    validationScore,
    validationErrors,
    validationWarnings,
    complianceReport,
    isValidating,
    validateExercise,
    validateField,
    getFieldSuggestions,
    exportReport
  };
};

export default useNASMValidation;
