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

  if (!question.isActive) {
    errors.push('Question is not active');
  }

  if (question.schemaVersion !== 2) {
    errors.push(`Question using schemaVersion ${question.schemaVersion}, only v2 supported`);
  }

  if (!question.wrapperTemplate) {
    errors.push('Question missing wrapperTemplate');
  } else {
    // Check at least one language has wrapper
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

  if (!question.testCasesStructured || !Array.isArray(question.testCasesStructured)) {
    errors.push('Question missing testCasesStructured array');
  } else if (question.testCasesStructured.length === 0) {
    errors.push('Question testCasesStructured is empty');
  } else {
    // Validate each test case
    for (const tc of question.testCasesStructured) {
      if (tc.input === undefined || tc.input === null) {
        errors.push('Test case missing input');
        break;
      }
      if (tc.expectedOutput === undefined || tc.expectedOutput === null) {
        errors.push('Test case missing expectedOutput');
        break;
      }
      if (!['public', 'hidden'].includes(tc.visibility)) {
        errors.push(`Test case has invalid visibility: ${tc.visibility}`);
        break;
      }
    }
  }

  if (!question.functionMetadata) {
    errors.push('Question missing functionMetadata');
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
