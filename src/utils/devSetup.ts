/**
 * Development utilities for testing
 * DISABLED: Use real login/signup instead of fake dev tokens
 * Fake tokens are not signed with backend secret and will be rejected
 */

export function setupDevToken() {
  // DEV TOKEN CREATION DISABLED
  // Users must login/signup to get valid tokens from backend
  // This ensures auth middleware works correctly
  if (import.meta.env.DEV) {
    console.log('[DEV MODE] Please use real login/signup - dev tokens disabled');
  }
}
