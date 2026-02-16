/**
 * Logger utility
 * 
 * Simple logging wrapper for consistent formatting across the application
 */

const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
  },

  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  debug: (message, ...args) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  success: (message, ...args) => {
    console.log(`[SUCCESS] ${message}`, ...args);
  },
};

export default logger;
