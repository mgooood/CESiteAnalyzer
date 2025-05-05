/**
 * Tech Analyzer Chrome Extension - File Analyzer
 * Handles scanning and filtering of JavaScript and CSS files
 */

/**
 * Find all JavaScript files in the document
 * @param {boolean} debugMode - Whether to enable debug logging
 * @returns {string[]} Array of JavaScript filenames
 */
export function findJavaScriptFiles(debugMode = false) {
  const jsFiles = Array.from(document.querySelectorAll('script[src]'))
    .map(script => {
      try {
        const url = new URL(script.src);
        const pathname = url.pathname;
        
        // Skip API calls and non-file URLs
        if (pathname.includes('/api/') || 
            pathname.includes('/json') || 
            url.search || // Has query parameters
            !pathname.includes('.')) {
          if (debugMode) {
            console.log(`%c[Tech Analyzer Debug] %cSkipping script: ${script.src}`, 
              'color: #2b90d9; font-weight: bold;', 'color: inherit;');
          }
          return null;
        }
        
        // Extract just the filename
        const filename = pathname.split('/').pop();
        if (debugMode) {
          console.log(`%c[Tech Analyzer Debug] %cFound JS file: ${filename}`, 
            'color: #2b90d9; font-weight: bold;', 'color: inherit;', {
              fullUrl: script.src,
              element: script.outerHTML.slice(0, 100)
            });
        }
        return filename;
      } catch (e) {
        // Fallback for relative URLs
        const parts = script.src.split('/');
        const filename = parts.pop();
        
        // Apply same filtering to relative URLs
        if (parts.some(part => part === 'api') || 
            !filename.includes('.') || 
            script.src.includes('?')) {
          if (debugMode) {
            console.log(`%c[Tech Analyzer Debug] %cSkipping relative script: ${script.src}`, 
              'color: #2b90d9; font-weight: bold;', 'color: inherit;');
          }
          return null;
        }
        
        if (debugMode) {
          console.log(`%c[Tech Analyzer Debug] %cFound relative JS file: ${filename}`, 
            'color: #2b90d9; font-weight: bold;', 'color: inherit;', {
              relativePath: script.src
            });
        }
        return filename;
      }
    })
    .filter(filename => filename); // Remove nulls and empty entries
    
  // Ensure we always return something even if no files found
  if (jsFiles.length === 0) {
    return ['None found'];
  }
  
  return jsFiles;
}

/**
 * Find all CSS files in the document
 * @param {boolean} debugMode - Whether to enable debug logging
 * @returns {string[]} Array of CSS filenames
 */
export function findCSSFiles(debugMode = false) {
  const cssFiles = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .map(link => {
      try {
        const url = new URL(link.href);
        const pathname = url.pathname;
        
        // Skip API calls and non-file URLs (same logic as JS files)
        if (pathname.includes('/api/') || 
            pathname.includes('/json') || 
            url.search || 
            !pathname.includes('.')) {
          if (debugMode) {
            console.log(`%c[Tech Analyzer Debug] %cSkipping stylesheet: ${link.href}`, 
              'color: #2b90d9; font-weight: bold;', 'color: inherit;');
          }
          return null;
        }
        
        // Extract just the filename
        const filename = pathname.split('/').pop();
        if (debugMode) {
          console.log(`%c[Tech Analyzer Debug] %cFound CSS file: ${filename}`, 
            'color: #2b90d9; font-weight: bold;', 'color: inherit;', {
              fullUrl: link.href,
              element: link.outerHTML.slice(0, 100)
            });
        }
        return filename;
      } catch (e) {
        // Fallback for relative URLs
        const parts = link.href.split('/');
        const filename = parts.pop();
        
        // Apply same filtering to relative URLs
        if (parts.some(part => part === 'api') || 
            !filename.includes('.') || 
            link.href.includes('?')) {
          if (debugMode) {
            console.log(`%c[Tech Analyzer Debug] %cSkipping relative stylesheet: ${link.href}`, 
              'color: #2b90d9; font-weight: bold;', 'color: inherit;');
          }
          return null;
        }
        
        if (debugMode) {
          console.log(`%c[Tech Analyzer Debug] %cFound relative CSS file: ${filename}`, 
            'color: #2b90d9; font-weight: bold;', 'color: inherit;', {
              relativePath: link.href
            });
        }
        return filename;
      }
    })
    .filter(filename => filename); // Remove nulls and empty entries
    
  // Ensure we always return something even if no files found
  if (cssFiles.length === 0) {
    return ['None found'];
  }
  
  return cssFiles;
}
