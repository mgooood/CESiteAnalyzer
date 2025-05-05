/**
 * Tech Analyzer Chrome Extension - Utilities
 * Shared utilities for toast notifications, clipboard handling, and debug logging
 */

/**
 * Display a temporary toast notification for user feedback
 * @param {string} message - Message to display in the toast
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message = 'Copied to clipboard!', duration = 2000) {
  const toast = document.getElementById('toast');
  
  // Set the toast message
  toast.textContent = message;
  
  // Show the toast
  toast.classList.add('visible');
  toast.setAttribute('aria-hidden', 'false');
  
  // Hide toast after specified duration
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.setAttribute('aria-hidden', 'true');
  }, duration);
}

/**
 * Create a debug logger that conditionally logs based on debug mode
 * @param {boolean} debugMode - Whether debug mode is enabled
 * @returns {Function} - A debug logging function
 */
export function createDebugLogger(debugMode) {
  return debugMode 
    ? (message, data) => console.log(
        `%c[Tech Analyzer Debug] %c${message}`, 
        'color: #2b90d9; font-weight: bold;', 
        'color: inherit;', 
        data || ''
      )
    : () => {}; // No-op function when debug mode is off
}

/**
 * Load and apply saved theme preference or use system preference as fallback
 */
export function initializeTheme() {
  chrome.storage.local.get('theme', ({ theme }) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // No saved preference, fall back to system preference
      document.body.classList.add('dark-theme');
    }
  });
}

/**
 * Switch between light/dark themes and save preference
 */
export function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    // Switch to light theme
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    chrome.storage.local.set({ theme: 'light' });
  } else {
    // Switch to dark theme
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    chrome.storage.local.set({ theme: 'dark' });
  }
}
