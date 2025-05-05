/**
 * Tech Analyzer Chrome Extension - Main Entry Point
 * Handles UI interactions, form handling, and integrates all modules
 */

import { initializeTheme, toggleTheme, showToast } from './utils.js';
import { findJavaScriptFiles, findCSSFiles } from './file-analyzer.js';

// ======== Main Application Logic ========
(function() {
  // Store detected files for generating AI prompts
  let clipboardData = {
    jsFiles: [],
    cssFiles: []
  };

  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize core functionality when DOM is ready
    initializeTheme();
    initializeClipboard();
    
    // Set up UI event listeners
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('copy-ai-prompt').addEventListener('click', copyAIPrompt);
    document.getElementById('analyze-form').addEventListener('submit', handleFormSubmit);
  });

  // Set initial clipboard button state (disabled until results available)
  function initializeClipboard() {
    const copyButton = document.getElementById('copy-ai-prompt');
    copyButton.disabled = true;
  }

  // Format and copy file data as an AI-friendly prompt
  function copyAIPrompt() {
    // Filter out placeholder "None found" entries
    const allFiles = [...clipboardData.jsFiles, ...clipboardData.cssFiles]
      .filter(file => file !== 'None found');
    
    if (allFiles.length === 0) {
      return;
    }
    
    // Create a prompt asking for explanation of the detected files
    const prompt = `Give me a brief idea what these files are: ${allFiles.join(', ')}`;
    
    // Copy to clipboard and show success notification
    navigator.clipboard.writeText(prompt).then(() => {
      showToast();
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  // Enable/disable copy button based on whether we have valid results
  function updateClipboardButton() {
    const hasFiles = (
      clipboardData.jsFiles.length > 0 && clipboardData.jsFiles[0] !== 'None found'
    ) || (
      clipboardData.cssFiles.length > 0 && clipboardData.cssFiles[0] !== 'None found'
    );
    
    const copyButton = document.getElementById('copy-ai-prompt');
    copyButton.disabled = !hasFiles;
  }

  // ======== Form Handling ========
  // Process form submission and trigger page analysis
  function handleFormSubmit(e) {
    e.preventDefault();
    
    // Collect selected analysis options
    const options = {
      jsFrameworks: document.querySelector('input[name="js-frameworks"]').checked,
      cssFrameworks: document.querySelector('input[name="css-frameworks"]').checked,
      listJS: document.querySelector('input[name="list-js"]').checked,
      listCSS: document.querySelector('input[name="list-css"]').checked,
      debugMode: document.querySelector('input[name="debug-mode"]').checked
    };
    
    // Reset UI state
    const reportEl = document.getElementById('report');
    reportEl.innerHTML = '';
    
    // Clear previous results
    clipboardData = {
      jsFiles: [],
      cssFiles: []
    };
    
    // Run analysis in the context of the active tab using Chrome API
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs && tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: analyzePage,
          args: [options]
        })
        .then(results => {
          if (results && results[0] && results[0].result) {
            const findings = results[0].result;
            
            // Update clipboard data for AI prompt
            if (findings.jsFiles) clipboardData.jsFiles = findings.jsFiles;
            if (findings.cssFiles) clipboardData.cssFiles = findings.cssFiles;
            
            // Display results in the UI
            displayResults(findings, options, reportEl);
          }
        })
        .catch(error => {
          console.error('Error during analysis:', error);
          reportEl.innerHTML = `<div class="result-group error">Error analyzing page: ${error.message}</div>`;
        });
      }
    });
  }

  // ======== Page Analysis ========
  // This function runs in the context of the analyzed web page
  function analyzePage(options) {
    try {
      // Set up debug logger
      const debugLog = options.debugMode 
        ? (message, data) => console.log(`%c[Tech Analyzer Debug] %c${message}`, 'color: #2b90d9; font-weight: bold;', 'color: inherit;', data || '')
        : () => {}; // No-op function when debug mode is off
      
      // Framework detection configuration copied here since this runs in page context
      const FRAMEWORK_DETECTION = {
        js: [
          {
            name: 'React',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['React', 'ReactDOM', '__REACT_DEVTOOLS_GLOBAL_HOOK__'], weight: 3 },
              { type: 'attribute', patterns: ['data-reactroot', 'data-reactid'], weight: 5 },
              { type: 'class', patterns: ['react-', '_react'], weight: 2 },
              { type: 'file', patterns: ['react.js', 'react.min.js', 'react-dom'], weight: 4 }
            ],
            minConfidence: 4 // Threshold required to confirm detection
          },
          {
            name: 'Angular',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['angular', 'ng'], weight: 3 },
              { type: 'attribute', patterns: ['ng-', 'data-ng-', 'ng:'], weight: 5 },
              { type: 'dom', test: () => !!document.querySelector('[ng-app],[data-ng-app]'), weight: 5 },
              { type: 'file', patterns: ['angular.js', 'angular.min.js', 'angular-route'], weight: 4 }
            ],
            minConfidence: 5
          },
          {
            name: 'Vue.js',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['Vue', 'VueRouter', 'Vuex'], weight: 3 },
              // Only match true Vue.js directives - specifically exclude data-v-* attributes
              { type: 'dom', test: () => {
                // Look for elements with true Vue.js directives (not data-v-* attributes)
                // These selectors specifically target attributes that start with v- but don't have data- prefix
                const hasDirectives = document.querySelector(
                  '[v-for]:not([data-v-for]),[v-if]:not([data-v-if]),[v-bind]:not([data-v-bind]),' +
                  '[v-model]:not([data-v-model]),[v-on]:not([data-v-on]),[v-show]:not([data-v-show]),' +
                  '[v-cloak]:not([data-v-cloak]),[v-html]:not([data-v-html]),[v-text]:not([data-v-text])'
                );
                return !!hasDirectives;
              }, weight: 5 },
              { type: 'file', patterns: ['vue.js', 'vue.min.js', 'vue-router'], weight: 4 },
              // Look for Vue instance mounting point
              { type: 'dom', test: () => !!document.querySelector('#app[data-v-app],#app[data-server-rendered]'), weight: 3 }
            ],
            minConfidence: 6 // Increased threshold to avoid false positives
          },
          {
            name: 'jQuery',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['$', 'jQuery'], weight: 5 },
              { type: 'dom', test: () => typeof window.jQuery === 'function' || typeof window.$ === 'function', weight: 5 },
              { type: 'file', patterns: ['jquery.min.js', 'jquery.js', 'jquery-'], weight: 3 }
            ],
            minConfidence: 5
          },
          {
            name: 'Alpine.js',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['Alpine'], weight: 5 },
              { type: 'attribute', patterns: ['x-data', 'x-bind', 'x-on', 'x-model'], weight: 5 },
              { type: 'file', patterns: ['alpine.js', 'alpine.min.js'], weight: 4 }
            ],
            minConfidence: 5
          },
          {
            name: 'Next.js',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['__NEXT_DATA__', '__NEXT_LOADED_PAGES__'], weight: 5 },
              { type: 'dom', test: () => !!document.getElementById('__next'), weight: 4 },
              { type: 'dom', test: () => !!document.querySelector('script#__NEXT_DATA__'), weight: 5 },
              { type: 'file', patterns: ['_next/static', '_next/'], weight: 4 }
            ],
            minConfidence: 5
          },
          {
            name: 'Nuxt.js',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['__NUXT__', '$nuxt'], weight: 5 },
              { type: 'dom', test: () => !!document.getElementById('__nuxt'), weight: 4 },
              { type: 'dom', test: () => !!document.querySelector('[data-n-head]'), weight: 4 },
              { type: 'file', patterns: ['/_nuxt/'], weight: 3 }
            ],
            minConfidence: 5
          },
          {
            name: 'Ember.js',
            confidence: 0,
            signals: [
              { type: 'global', patterns: ['Ember', 'Em'], weight: 4 },
              { type: 'dom', test: () => !!document.querySelector('[data-ember-action]'), weight: 5 },
              { type: 'class', patterns: ['ember-view', 'ember-application'], weight: 5 },
              { type: 'file', patterns: ['ember.js', 'ember.min.js'], weight: 3 }
            ],
            minConfidence: 5
          }
        ],
        css: [
          {
            name: 'Bootstrap',
            confidence: 0,
            signals: [
              // Look for very specific Bootstrap class combinations
              { type: 'dom', test: () => {
                // Check for distinctly Bootstrap class combinations
                const bootstrapSpecificSelectors = [
                  // Navbar with specific Bootstrap structure
                  '.navbar.navbar-expand-lg, .navbar.navbar-expand-md, .navbar.navbar-expand-sm',
                  // Button groups (very Bootstrap specific)
                  '.btn-group > .btn, .btn-group-vertical > .btn',
                  // Input groups (very Bootstrap specific)
                  '.input-group > .input-group-prepend, .input-group > .input-group-append',
                  // Card with Bootstrap structure
                  '.card > .card-header + .card-body',
                  // Bootstrap specific utilities (less generic than btn-primary)
                  '.d-flex.justify-content-between, .d-flex.align-items-center',
                  // Bootstrap accordion components
                  '.accordion > .accordion-item > .accordion-header',
                  // Bootstrap specific spacing classes in combination
                  '.mt-3.mb-3.pt-4, .my-3.py-4, .m-auto.p-3'
                ];
                
                let matchCount = 0;
                bootstrapSpecificSelectors.forEach(selector => {
                  try {
                    if (document.querySelector(selector)) {
                      matchCount++;
                      if (options.debugMode) {
                        debugLog(`Bootstrap specific pattern matched: ${selector}`);
                      }
                    }
                  } catch(e) {
                    // Ignore invalid selector errors
                  }
                });
                
                return matchCount >= 2; // Need at least 2 distinctive Bootstrap patterns
              }, weight: 5 },
              
              // Look for Bootstrap's JS components
              { type: 'dom', test: () => {
                // Check for Bootstrap's data attributes
                const bootstrapJSAttributes = [
                  '[data-bs-toggle="modal"]',
                  '[data-bs-toggle="collapse"]',
                  '[data-bs-toggle="dropdown"]',
                  '[data-bs-toggle="tooltip"]',
                  '[data-bs-toggle="popover"]',
                  '[data-bs-target]',
                  '[data-bs-ride="carousel"]'
                ];
                
                let attributeCount = 0;
                bootstrapJSAttributes.forEach(attr => {
                  try {
                    if (document.querySelector(attr)) {
                      attributeCount++;
                      if (options.debugMode) {
                        debugLog(`Bootstrap JS attribute found: ${attr}`);
                      }
                    }
                  } catch(e) {
                    // Ignore invalid selector errors
                  }
                });
                
                return attributeCount >= 1; // Need at least one Bootstrap JS component
              }, weight: 4 },
              
              // Check for Bootstrap CSS file patterns
              { type: 'file', patterns: ['bootstrap.min.css', 'bootstrap.bundle.min.js', 'bootstrap/5', 'bootstrap/4'], weight: 5 },
              
              // Examine CSS file contents for Bootstrap signatures
              { type: 'dom', test: () => {
                // Try to fetch and examine the content of CSS files
                try {
                  // Find all stylesheet links
                  const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
                  
                  if (options.debugMode) {
                    debugLog(`Examining ${styleLinks.length} stylesheet links for Bootstrap signatures`, 
                      styleLinks.map(link => link.href));
                  }
                  
                  // Look for Bootstrap comment signatures in stylesheets that are already loaded
                  const bootstrapSignatures = [
                    'Bootstrap',
                    'getbootstrap.com',
                    'twitter.com/bootstrap'
                  ];
                  
                  // Check if any loaded stylesheets have Bootstrap content
                  for (const sheet of document.styleSheets) {
                    try {
                      // Some cross-origin sheets cannot be accessed
                      if (sheet.cssRules) {
                        // Convert first few rules to text to check for comments
                        const firstRules = Array.from(sheet.cssRules).slice(0, 5);
                        const cssText = firstRules.map(rule => rule.cssText).join(' ');
                        
                        for (const signature of bootstrapSignatures) {
                          if (cssText.includes(signature)) {
                            if (options.debugMode) {
                              debugLog(`Found Bootstrap signature in CSS: ${signature}`, {
                                sheetHref: sheet.href,
                                sampleText: cssText.slice(0, 100)
                              });
                            }
                            return true;
                          }
                        }
                      }
                    } catch (e) {
                      // CORS errors when accessing cross-origin stylesheets - ignore
                    }
                  }
                  
                  return false;
                } catch (e) {
                  if (options.debugMode) {
                    debugLog('Error examining CSS file contents:', e);
                  }
                  return false;
                }
              }, weight: 5 },
              
              // Check for Bootstrap's global variable (Bootstrap 4+)
              { type: 'global', patterns: ['bootstrap', 'Bootstrap'], weight: 3 }
            ],
            minConfidence: 8 // Increased threshold to require multiple strong signals
          },
          {
            name: 'Tailwind CSS',
            confidence: 0,
            signals: [
              // More specific file patterns
              { type: 'file', patterns: ['tailwind.css', 'tailwind.min.css', '/tailwindcss/'], weight: 5 },
              
              // Comprehensive test for Tailwind's utility classes
              { type: 'dom', test: () => {
                // Elements to examine for Tailwind patterns
                const elements = Array.from(document.querySelectorAll('body *[class]')).slice(0, 100); // Limit to first 100 elements
                
                if (elements.length === 0) return false;
                
                // Count elements with Tailwind-like utility classes
                const tailwindPatterns = [
                  /\b(m|p)[xy]?-[0-9]+\b/, // Margin/padding utilities
                  /\btext-(xs|sm|base|lg|xl|2xl|gray-[0-9]+)\b/, // Text utilities
                  /\b(flex|grid|block|inline|hidden)\b/, // Display utilities
                  /\bg(ap|rid-cols)-[0-9]+\b/, // Grid utilities
                  /\b(bg|text|border)-(gray|blue|green|red|yellow)-[0-9]+\b/, // Color utilities
                  /\b(rounded|shadow|opacity)-[a-z0-9]+\b/ // Appearance utilities
                ];
                
                // Tailwind typically has multiple utilities per element, so check for density
                let tailwindElementCount = 0;
                let elementWithMultipleUtilitiesCount = 0;
                
                for (const el of elements) {
                  const classList = el.className.split(/\s+/);
                  
                  // Check how many Tailwind patterns this element matches
                  let matchedPatterns = 0;
                  for (const pattern of tailwindPatterns) {
                    if (classList.some(cls => pattern.test(cls))) {
                      matchedPatterns++;
                    }
                  }
                  
                  if (matchedPatterns > 0) {
                    tailwindElementCount++;
                  }
                  
                  if (matchedPatterns >= 3) {
                    elementWithMultipleUtilitiesCount++;
                  }
                }
                
                // Check density of Tailwind usage:
                // 1. At least 15% of elements should have Tailwind classes
                // 2. At least 5 elements should have multiple Tailwind utilities
                const tailwindDensity = tailwindElementCount / elements.length;
                
                if (options.debugMode) {
                  debugLog('Tailwind detection stats:', {
                    totalElementsChecked: elements.length,
                    elementsWithTailwindClasses: tailwindElementCount,
                    elementsWithMultipleUtilities: elementWithMultipleUtilitiesCount,
                    tailwindDensity: tailwindDensity
                  });
                }
                
                return tailwindDensity > 0.15 && elementWithMultipleUtilitiesCount >= 5;
              }, weight: 7 }
            ],
            minConfidence: 8
          },
          {
            name: 'Material UI',
            confidence: 0,
            signals: [
              { type: 'class', patterns: ['MuiButton-', 'MuiInput-', 'MuiTypography-', 'makeStyles-'], weight: 5 },
              { type: 'file', patterns: ['material-ui', 'mui'], weight: 3 },
              { type: 'dom', test: () => !!document.querySelector('[class*="MuiButton"],[class*="MuiInput"],[class*="MuiPaper"]'), weight: 5 }
            ],
            minConfidence: 5
          },
          {
            name: 'Semantic UI',
            confidence: 0,
            signals: [
              { type: 'class', patterns: ['ui segment', 'ui grid', 'ui button', 'ui menu'], weight: 5 },
              { type: 'file', patterns: ['semantic.min.css', 'semantic.css', 'semantic-ui'], weight: 4 },
              { type: 'dom', test: () => {
                const hasUIClasses = !!document.querySelector('.ui.button,.ui.grid,.ui.menu,.ui.form');
                return hasUIClasses;
              }, weight: 4 }
            ],
            minConfidence: 5
          },
          {
            name: 'Chakra UI',
            confidence: 0,
            signals: [
              { type: 'class', patterns: ['chakra-', 'css-'], weight: 3 },
              { type: 'dom', test: () => !!document.querySelector('[data-chakra-component]'), weight: 5 },
              { type: 'global', patterns: ['ChakraProvider'], weight: 5 }
            ],
            minConfidence: 5
          }
        ]
      };
      
      // Use local functions instead of imported ones
      // Detect frameworks on the page
      function detectFrameworks() {
        // Create the findings results object
        const frameworkFindings = {
          jsFrameworks: [],
          cssFrameworks: []
        };
        
        // Detect JS frameworks
        if (options.jsFrameworks) {
          frameworkFindings.jsFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.js);
          
          // Ensure we always return something even if no frameworks detected
          if (frameworkFindings.jsFrameworks.length === 0) {
            frameworkFindings.jsFrameworks.push('None detected');
          }
        }
        
        // Detect CSS frameworks
        if (options.cssFrameworks) {
          frameworkFindings.cssFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.css);
          
          // Ensure we always return something even if no frameworks detected
          if (frameworkFindings.cssFrameworks.length === 0) {
            frameworkFindings.cssFrameworks.push('None detected');
          }
        }
        
        return frameworkFindings;
      }
      
      // Helper for determining detected frameworks by threshold
      function getDetectedFrameworks(frameworkList) {
        // Create a fresh findings array
        const detectedFrameworks = [];
        
        // Process each framework
        frameworkList.forEach(framework => {
          // Reset confidence for this framework
          framework.confidence = 0;
          const detectionDetails = [];
          
          // Evaluate each signal for this framework
          framework.signals.forEach(signal => {
            // Track signal detection details
            const signalResults = { 
              type: signal.type, 
              weight: signal.weight,
              detected: false,
              details: []
            };
            
            // Check for global variables in window object
            if (signal.type === 'global' && signal.patterns) {
              signal.patterns.forEach(pattern => {
                if (window[pattern]) {
                  framework.confidence += signal.weight;
                  signalResults.detected = true;
                  signalResults.details.push(`Found global variable: ${pattern}`);
                  
                  // Add value type information for debugging
                  if (options.debugMode) {
                    const type = typeof window[pattern];
                    const isFunction = type === 'function';
                    const preview = isFunction ? 'function()' : 
                                 (type === 'object' ? (window[pattern] === null ? 'null' : '{}') : 
                                 String(window[pattern]).slice(0, 50));
                    signalResults.details.push(`Type: ${type}, Value: ${preview}`);
                  }
                }
              });
            }
            
            // Check for script sources and file patterns
            if (signal.type === 'file' && signal.patterns) {
              const scriptTags = Array.from(document.querySelectorAll('script[src]'));
              const scriptSrcs = scriptTags.map(tag => tag.src.toLowerCase());
              const pageSource = document.documentElement.outerHTML.toLowerCase();
              
              signal.patterns.forEach(pattern => {
                const patternLower = pattern.toLowerCase();
                const matchingSrc = scriptSrcs.find(src => src.includes(patternLower));
                
                if (matchingSrc) {
                  framework.confidence += signal.weight;
                  signalResults.detected = true;
                  signalResults.details.push(`Found script src: ${matchingSrc}`);
                  
                  // Add detailed source information for debugging
                  if (options.debugMode) {
                    // Find the actual script tag with this source
                    const matchingTag = scriptTags.find(tag => tag.src.toLowerCase().includes(patternLower));
                    if (matchingTag) {
                      debugLog(`Script file matching "${pattern}":`, {
                        fullUrl: matchingTag.src,
                        tag: matchingTag.outerHTML.slice(0, 150) + (matchingTag.outerHTML.length > 150 ? '...' : '')
                      });
                    }
                  }
                } else if (pageSource.includes(patternLower)) {
                  // Lower weight if just mentioned in source but not as a script
                  framework.confidence += 1;
                  signalResults.detected = true;
                  signalResults.details.push(`Found pattern in page source: ${pattern}`);
                  
                  // Show context of the match in page source
                  if (options.debugMode) {
                    const index = pageSource.indexOf(patternLower);
                    const start = Math.max(0, index - 50);
                    const end = Math.min(pageSource.length, index + patternLower.length + 50);
                    const context = pageSource.substring(start, end);
                    debugLog(`Source context containing "${pattern}":`, `...${context}...`);
                  }
                }
              });
            }
            
            // Check for DOM attributes (with error handling)
            if (signal.type === 'attribute' && signal.patterns) {
              signal.patterns.forEach(pattern => {
                const selector = `[${pattern}],[data-${pattern}]`;
                try {
                  const matchingElements = document.querySelectorAll(selector);
                  if (matchingElements.length > 0) {
                    framework.confidence += signal.weight;
                    signalResults.detected = true;
                    signalResults.details.push(`Found ${matchingElements.length} elements with attribute: ${pattern}`);
                    
                    // Add detailed element information for debugging
                    if (options.debugMode) {
                      debugLog(`Detected ${matchingElements.length} elements with attribute: ${pattern}`);
                      
                      const elementDetails = Array.from(matchingElements).slice(0, 3).map(el => {
                        // Get element tag and a sample of its HTML
                        const tagName = el.tagName.toLowerCase();
                        const snippet = el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : '');
                        return `<${tagName}...> ${snippet}`;
                      });
                      signalResults.details.push('Element samples:', elementDetails);
                    }
                  }
                } catch(e) {
                  // Ignore invalid selector errors
                }
              });
            }
            
            // Check for class name patterns
            if (signal.type === 'class' && signal.patterns) {
              signal.patterns.forEach(pattern => {
                const elements = Array.from(document.querySelectorAll('[class]'));
                const patternLower = pattern.toLowerCase();
                let foundElements = [];
                
                for (const el of elements) {
                  // Safely handle className which may not always be a string
                  const className = typeof el.className === 'string' 
                    ? el.className 
                    : (el.className.baseVal || ''); // Handle SVGAnimatedString and other cases
                  
                  if (className.toLowerCase().includes(patternLower)) {
                    foundElements.push(el);
                    framework.confidence += signal.weight;
                    signalResults.detected = true;
                    break; // Only count once per pattern
                  }
                }
                
                if (foundElements.length > 0) {
                  signalResults.details.push(`Found ${foundElements.length} elements with class matching: ${pattern}`);
                  // Log the first element's class for reference
                  if (foundElements[0]) {
                    const className = typeof foundElements[0].className === 'string' 
                      ? foundElements[0].className 
                      : (foundElements[0].className.baseVal || '');
                    signalResults.details.push(`Example class: ${className}`);
                    
                    // Add more detailed element information
                    if (options.debugMode) {
                      // Get element tag and a snippet of HTML for the first 3 elements
                      const elementDetails = foundElements.slice(0, 3).map(el => {
                        const tagName = el.tagName.toLowerCase();
                        const htmlSnippet = el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : '');
                        return `<${tagName} class="${typeof el.className === 'string' ? el.className : el.className.baseVal || ''}"...> ${htmlSnippet}`;
                      });
                      signalResults.details.push('Element samples with matching classes:', elementDetails);
                    }
                  }
                }
              });
            }
            
            // Run custom DOM structure tests
            if (signal.type === 'dom' && typeof signal.test === 'function') {
              try {
                if (signal.test()) {
                  framework.confidence += signal.weight;
                  signalResults.detected = true;
                  signalResults.details.push(`DOM structure test passed`);
                }
              } catch(e) {
                // Ignore test failures
              }
            }
            
            // Save detection details if this signal contributed to detection
            if (signalResults.detected) {
              detectionDetails.push(signalResults);
            }
          });
          
          // Only include frameworks that meet confidence threshold
          if (framework.confidence >= framework.minConfidence) {
            detectedFrameworks.push(framework.name);
            
            // Log detailed detection info in debug mode
            if (options.debugMode) {
              debugLog(`Detected ${framework.name} with confidence score: ${framework.confidence}/${framework.minConfidence}`);
              
              detectionDetails.forEach(signal => {
                debugLog(`Signal type: ${signal.type} (weight: ${signal.weight})`, signal.details);
              });
              
              // Visual separator for easier reading
              console.log('%c------------------------------------', 'color: #ccc');
            }
          }
        });
        
        return detectedFrameworks;
      }
      
      // Find CSS files
      function findCSSFiles() {
        // Collect debug information
        const debugInfo = {
          allStylesheets: [],
          filtered: [],
          errors: [],
          skipped: []
        };
        
        // Get all stylesheet links
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
        
        if (options.debugMode) {
          debugLog(`Found ${stylesheets.length} stylesheet links`, 
            stylesheets.map(link => link.getAttribute('href')));
        }
        
        // Common CSS filenames to always include, even if they'd be filtered
        const importantCssPatterns = [
          'style.min.css',
          'main.css',
          'styles.css',
          'bundle.css',
          'app.css',
          'theme.css'
        ];
        
        // Also look at all loaded stylesheets via document.styleSheets (captures inline styles too)
        const styleSheetUrls = new Set();
        for (const sheet of document.styleSheets) {
          try {
            if (sheet.href) {
              styleSheetUrls.add(sheet.href);
              if (options.debugMode) {
                debugInfo.allStylesheets.push(sheet.href);
              }
            }
          } catch (e) {
            if (options.debugMode) {
              debugInfo.errors.push(`Error accessing stylesheet: ${e.message}`);
            }
          }
        }
        
        // Create a set to track unique filenames
        const uniqueFilenames = new Set();
        
        const cssFiles = stylesheets
          .map(link => {
            try {
              const href = link.href.toLowerCase();
              
              // Always include important CSS files regardless of filters
              for (const pattern of importantCssPatterns) {
                if (href.includes(pattern)) {
                  const filename = pattern;
                  if (options.debugMode) {
                    debugLog(`Found important CSS file: ${filename}`, {
                      fullUrl: link.href,
                      reason: "Matched important pattern"
                    });
                  }
                  return filename;
                }
              }
              
              const url = new URL(link.href);
              const pathname = url.pathname;
              
              // More lenient filtering - only skip obvious API calls
              // Skip API calls and non-CSS URLs
              if (pathname.includes('/api/') || 
                  pathname.includes('/json') || 
                  (!pathname.toLowerCase().endsWith('.css') && !pathname.includes('.css'))) {
                if (options.debugMode) {
                  debugLog(`Skipping non-CSS resource: ${link.href}`);
                  debugInfo.skipped.push({url: link.href, reason: "Not a CSS file"});
                }
                return null;
              }
              
              // Extract just the filename - now handle paths without extensions better
              let filename = pathname.split('/').pop();
              
              // Handle URLs that might not have a proper filename
              if (!filename || !filename.includes('.')) {
                // Try to generate a meaningful name from the URL
                const domain = url.hostname.replace('www.', '');
                filename = `${domain}-stylesheet.css`;
              }
              
              if (options.debugMode) {
                debugLog(`Found CSS file: ${filename}`, {
                  fullUrl: link.href,
                  element: link.outerHTML.slice(0, 100)
                });
                debugInfo.filtered.push(filename);
              }
              return filename;
            } catch (e) {
              // Fallback for relative URLs
              let href = link.getAttribute('href');
              if (!href) return null;
              
              href = href.toLowerCase();
              
              // Always include important CSS files regardless of filters
              for (const pattern of importantCssPatterns) {
                if (href.includes(pattern)) {
                  const filename = pattern;
                  if (options.debugMode) {
                    debugLog(`Found important relative CSS file: ${filename}`, {
                      href: link.getAttribute('href'),
                      reason: "Matched important pattern"
                    });
                  }
                  return filename;
                }
              }
              
              const parts = href.split('/');
              let filename = parts.pop();
              
              // Handle endpoints without extensions
              if (!filename || !filename.includes('.css')) {
                if (options.debugMode) {
                  debugLog(`Skipping non-CSS relative URL: ${href}`);
                  debugInfo.skipped.push({url: href, reason: "Not a CSS file"});
                }
                return null;
              }
              
              if (options.debugMode) {
                debugLog(`Found relative CSS file: ${filename}`, {
                  relativePath: href
                });
                debugInfo.filtered.push(filename);
              }
              return filename;
            }
          })
          .filter(filename => {
            // Remove nulls and ensure uniqueness
            if (!filename) return false;
            if (uniqueFilenames.has(filename)) return false;
            uniqueFilenames.add(filename);
            return true;
          });

        // Output comprehensive debug information about stylesheet detection
        if (options.debugMode) {
          debugLog('CSS file detection summary:', {
            totalStylesheetLinks: stylesheets.length,
            totalLoadedStylesheets: styleSheetUrls.size,
            filteredResults: cssFiles.length,
            allStylesheets: debugInfo.allStylesheets,
            filteredFiles: debugInfo.filtered,
            skippedFiles: debugInfo.skipped,
            errors: debugInfo.errors
          });
        }
          
        // Ensure we always return something even if no files found
        if (cssFiles.length === 0) {
          return ['None found'];
        }
        
        return cssFiles;
      }
      
      // Find JS files 
      function findJavaScriptFiles() {
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
                if (options.debugMode) {
                  debugLog(`Skipping script: ${script.src}`);
                }
                return null;
              }
              
              // Extract just the filename
              const filename = pathname.split('/').pop();
              if (options.debugMode) {
                debugLog(`Found JS file: ${filename}`, {
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
                if (options.debugMode) {
                  debugLog(`Skipping relative script: ${script.src}`);
                }
                return null;
              }
              
              if (options.debugMode) {
                debugLog(`Found relative JS file: ${filename}`, {
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
      
      // Now run the detection functions and assemble findings
      const frameworkFindings = detectFrameworks();
      
      // Initialize results object
      const findings = {
        jsFrameworks: frameworkFindings.jsFrameworks,
        cssFrameworks: frameworkFindings.cssFrameworks,
        jsFiles: [],
        cssFiles: []
      };

      // Find JavaScript files if requested
      if (options.listJS) {
        findings.jsFiles = findJavaScriptFiles();
      }
      
      // Find CSS files if requested
      if (options.listCSS) {
        findings.cssFiles = findCSSFiles();
      }
      
      return findings;
    } catch (error) {
      console.error('Error in analyzePage:', error);
      return {
        jsFrameworks: ['Error in detection'],
        cssFrameworks: ['Error in detection'],
        jsFiles: [],
        cssFiles: []
      };
    }
  }

  // ======== Results Display ========
  // Format findings and update the UI with results
  function displayResults(findings, options, reportEl) {
    let output = '';
    let hasResults = false;
    
    // Update clipboard button state based on new results
    updateClipboardButton();
    
    // Helper function to create consistently formatted result sections
    function addResultSection(title, items, isListFormat = false) {
      hasResults = true;
      output += `<div class="result-group"><strong>${title}:</strong><br>`;
      
      // Handle empty or "None found" results
      if (!items || items.length === 0) {
        output += '<span class="result-item">No results</span>';
      } else if (items.length === 1 && (items[0] === 'None found' || items[0] === 'None detected')) {
        output += '<span class="result-item">No results</span>';
      } else if (isListFormat) {
        // Format file lists as bulleted lists
        output += '<ul>' + items.map(item => `<li class="result-item">${item}</li>`).join('') + '</ul>';
      } else {
        // Format frameworks as pill badges
        output += '<div class="framework-results">';
        output += items.map(item => `<div class="framework-item">${item}</div>`).join('');
        output += '</div>';
      }
      
      output += '</div>';
    }
    
    // Add sections based on selected options
    if (options.jsFrameworks) {
      addResultSection('JS Frameworks', findings.jsFrameworks);
    }
    
    if (options.cssFrameworks) {
      addResultSection('CSS Frameworks', findings.cssFrameworks);
    }
    
    if (options.listJS) {
      addResultSection('JavaScript files', findings.jsFiles, true);
    }
    
    if (options.listCSS) {
      addResultSection('CSS files', findings.cssFiles, true);
    }
    
    // Update the UI with formatted results or a fallback message
    reportEl.innerHTML = hasResults 
      ? output 
      : '<div class="result-group">No analysis options selected.</div>';
  }
})();
