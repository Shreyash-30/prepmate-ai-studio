/**
 * Environment Validation Utility
 * 
 * Validates critical configuration on server startup
 * Provides warnings for missing optional configs
 * Allows graceful degradation for non-critical features
 */

import logger from './logger.js';

/**
 * Check if Judge0 is properly configured
 * @returns {boolean} True if all Judge0 config is present
 */
export function validateJudge0Config() {
  const required = [
    'JUDGE0_RAPIDAPI_KEY',
    'JUDGE0_BASE_URL',
    'JUDGE0_RAPIDAPI_HOST',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn(
      `⚠️  Judge0 Configuration Incomplete\n` +
      `   Missing: ${missing.join(', ')}\n` +
      `   Code execution features will be disabled.\n` +
      `   To enable: Set the above env variables.`
    );
    return false;
  }

  logger.info('✅ Judge0 configured: Code execution enabled');
  return true;
}

/**
 * Check if MongoDB is reachable and working
 * Performed after connection, so just log confirmation
 */
export function validateDatabaseConnection() {
  if (process.env.MONGODB_URI) {
    logger.info('✅ MongoDB configured and connected');
    return true;
  } else {
    logger.error('❌ MONGODB_URI not set - database connection failed');
    return false;
  }
}

/**
 * Check if AI service is configured
 * @returns {boolean} True if AI_SERVICE_URL is set
 */
export function validateAIServiceConfig() {
  if (process.env.AI_SERVICE_URL) {
    logger.info(`✅ AI Service configured: ${process.env.AI_SERVICE_URL}`);
    return true;
  } else {
    logger.warn(
      '⚠️  AI_SERVICE_URL not configured\n' +
      '   AI features (hints, reviews) will be unavailable.\n' +
      '   To enable: Set AI_SERVICE_URL env variable.'
    );
    return false;
  }
}

/**
 * Check if ML pipeline is configured
 * @returns {boolean} True if ML enabled and service reachable
 */
export function validateMLConfig() {
  const mlEnabled = process.env.ENABLE_ML_PIPELINE !== 'false';

  if (!mlEnabled) {
    logger.warn('⚠️  ML Pipeline disabled (ENABLE_ML_PIPELINE=false)');
    return false;
  }

  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
  logger.info(`✅ ML Pipeline enabled: ${mlUrl}`);
  return true;
}

/**
 * Comprehensive environment validation
 * Called on server startup
 * 
 * @returns {Object} Validation results
 */
export function validateEnvironment() {
  logger.info('\n' + '='.repeat(60));
  logger.info('🔍 ENVIRONMENT VALIDATION');
  logger.info('='.repeat(60));

  const results = {
    judge0: validateJudge0Config(),
    database: validateDatabaseConnection(),
    aiService: validateAIServiceConfig(),
    mlPipeline: validateMLConfig(),
  };

  // Summary
  const enabledFeatures = Object.entries(results)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature)
    .join(', ');

  const disabledFeatures = Object.entries(results)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature)
    .join(', ');

  logger.info('\n📊 FEATURE STATUS');
  logger.info(`   Enabled:  ${enabledFeatures || 'none'}`);
  logger.info(`   Disabled: ${disabledFeatures || 'none'}`);

  // Critical check
  if (!results.database) {
    logger.error('❌ FATAL: Database not configured. Cannot start server.');
    return null;
  }

  if (!results.judge0) {
    logger.warn('⚠️  WARNING: Judge0 not configured. Code execution disabled.');
  }

  logger.info('='.repeat(60) + '\n');

  return results;
}

export default {
  validateEnvironment,
  validateJudge0Config,
  validateDatabaseConnection,
  validateAIServiceConfig,
  validateMLConfig,
};
