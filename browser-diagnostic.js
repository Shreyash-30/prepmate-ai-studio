/**
 * Browser Console Diagnostic Script
 * 
 * Copy this entire script and paste it into the browser console on the Practice page
 * Run it after clicking a topic to see detailed logging
 */

// Add detailed logging to localStorage for debugging
window.__questionDebugLog = [];

const logDebug = (msg, data) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { timestamp, msg, data };
  window.__questionDebugLog.push(entry);
  console.log(`[${timestamp}] ${msg}`, data || '');
};

// Intercept fetch/axios calls to log all API requests and responses
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  const method = options?.method || 'GET';
  
  if (url.includes('/practice/topics/') && url.includes('generate-questions')) {
    logDebug(`📤 API Request: ${method} ${url}`, options);
  }
  
  const response = await originalFetch.apply(this, args);
  
  if (url.includes('/practice/topics/') && url.includes('generate-questions')) {
    const clonedResponse = response.clone();
    const data = await clonedResponse.json();
    logDebug(`📥 API Response: ${response.status}`, data);
  }
  
  return response;
};

// Monitor state changes from the useQuestionSelection hook
const monitorHook = () => {
  logDebug('✅ Diagnostic monitor started', 'Watch the console and browser Network tab');
  logDebug('📝 Instructions:', [
    '1. Click on a topic in the Practice page',
    '2. Check the console output below',
    '3. Look at the "Network" tab in DevTools for HTTP requests',
    '4. Check the "Application" tab > "Local Storage" for auth_token'
  ]);
  
  // Check localStorage
  const authToken = localStorage.getItem('auth_token');
  logDebug('🔐 Auth Token Status:', authToken ? `Present (${authToken.substring(0, 20)}...)` : 'MISSING');
  
  // Log the debug log
  console.group('📊 Question Generation Debug Summary');
  window.__questionDebugLog.forEach(entry => {
    console.log(`[${entry.timestamp}] ${entry.msg}`, entry.data);
  });
  console.groupEnd();
};

// Export functions to window for console access
window.__questionDebug = {
  startMonitoring: monitorHook,
  getLog: () => window.__questionDebugLog,
  clearLog: () => {
    window.__questionDebugLog = [];
    console.log('Debug log cleared');
  },
};

console.log('%c🔍 Question Generation Diagnostic Tool Ready', 'color: blue; font-weight: bold; font-size: 14px');
console.log('Commands:');
console.log('  window.__questionDebug.startMonitoring() - Start monitoring');
console.log('  window.__questionDebug.getLog() - View debug log');
console.log('  window.__questionDebug.clearLog() - Clear debug log');
console.log('');
console.log('Now click on a topic and check the output:');

monitorHook();
