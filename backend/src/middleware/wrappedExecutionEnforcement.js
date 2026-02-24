/**
 * PHASE 9: Hard Fail Middleware
 * Globally enforce schemaVersion 2 wrapped execution
 * Prevent any access to legacy v1 problems
 */

import logger from '../utils/logger.js';

/**
 * Middleware: Reject any attempt to access non-v2 sessions
 * Applied to all practice endpoints
 */
export const enforceWrappedExecutionMiddleware = (req, res, next) => {
  // Only apply to practice endpoints
  if (!req.path.includes('/practice')) {
    return next();
  }

  // If session is already loaded (populated from DB), validate it
  if (req.session && req.session.schemaVersion !== 2) {
    logger.error(`❌ HARD FAIL: Session using non-v2 execution`);
    logger.error(`   Session ID: ${req.session._id}`);
    logger.error(`   Schema Version: ${req.session.schemaVersion}`);
    
    return res.status(400).json({
      success: false,
      error: 'Session not using wrapped execution (schemaVersion 2)',
      code: 'INVALID_SCHEMA_VERSION',
    });
  }

  next();
};

/**
 * Query filter: Only return active v2 questions to frontend
 * Prevents any legacy v1 problems from being suggested/displayed
 */
export const onlyWrappedQuestionsFilter = () => {
  return {
    isActive: true,
    schemaVersion: 2,
  };
};

/**
 * Validation: Check if question can be used for practice
 */
export const validateQuestionForPractice = (question) => {
  const errors = [];

  if (!question) {
    errors.push('Question not found');
    return errors;
  }

  const problemId = question.problemId || 'unknown';
  const title = question.title || question.problemTitle || problemId;
  const isActive = question.isActive !== false;

  logger.info(`🔍 Validating question: "${title}" (${problemId})`);

  if (!isActive) {
    errors.push('Question is not active');
  }

  if (question.schemaVersion !== 2) {
    errors.push(`Question using schemaVersion ${question.schemaVersion || 'undefined'}, only v2 supported`);
  }

  if (!question.wrapperTemplate) {
    errors.push('Question missing wrapperTemplate');
  } else {
    const languages = ['python', 'javascript', 'java', 'cpp', 'go'];
    const hasLanguage = languages.some(lang => question.wrapperTemplate[lang]);
    if (!hasLanguage) {
      errors.push('Question wrapperTemplate missing all languages');
    }
  }

  if (!question.starterCode) {
    errors.push('Question missing starterCode');
  } else {
    const languages = ['python', 'javascript', 'java', 'cpp', 'go'];
    const hasLanguage = languages.some(lang => question.starterCode[lang]);
    if (!hasLanguage) {
      errors.push('Question starterCode missing all languages');
    }
  }

  // Support both testCasesStructured and testCases for validation
  const testCases = question.testCasesStructured || question.testCases;
  
  if (!testCases || !Array.isArray(testCases)) {
    errors.push('Question missing test cases array (testCasesStructured or testCases)');
  } else if (testCases.length === 0) {
    errors.push('Question test cases array is empty');
  } else {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (tc.input === undefined || tc.input === null) {
        errors.push(`Test case [${i}] missing input`);
        break;
      }
      if (tc.expectedOutput === undefined && tc.output === undefined) {
        errors.push(`Test case [${i}] missing expectedOutput or output`);
        break;
      }
    }
  }

  if (!question.functionMetadata) {
    errors.push('Question missing functionMetadata');
  }

  if (errors.length > 0) {
    logger.error(`❌ Validation failed for "${title}": ${errors.join(', ')}`);
  } else {
    logger.info(`✅ Validation passed for "${title}"`);
  }

  return errors;
};

/**
 * Global error handler: Log any v1 access attempts
 */
export const logLegacyAccessAttempt = (req, question) => {
  if (question && question.schemaVersion !== 2) {
    logger.warn(`⚠️ LEGACY ACCESS ATTEMPT DETECTED`);
    logger.warn(`   Question: ${question.title || question.problemId}`);
    logger.warn(`   Schema Version: ${question.schemaVersion}`);
    logger.warn(`   User: ${req.user?.id || 'anonymous'}`);
    logger.warn(`   Endpoint: ${req.method} ${req.path}`);
  }
};

export default {
  enforceWrappedExecutionMiddleware,
  onlyWrappedQuestionsFilter,
  validateQuestionForPractice,
  logLegacyAccessAttempt,
};
