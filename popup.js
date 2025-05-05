// Tech Analyzer Chrome Extension
// Detects frameworks, libraries, and files on web pages with confidence-based scoring

(function() {
  // ======== Theme Management ========
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize core functionality when DOM is ready
    initializeTheme();
    initializeClipboard();
    
    // Set up UI event listeners
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('copy-ai-prompt').addEventListener('click', copyAIPrompt);
    document.getElementById('analyze-form').addEventListener('submit', handleFormSubmit);
  });

  // Load and apply saved theme preference or use system preference as fallback
  function initializeTheme() {
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

  // Switch between light/dark themes and save preference
  function toggleTheme() {
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

  // ======== Clipboard Support ========
  // Store detected files for generating AI prompts
  let clipboardData = {
    jsFiles: [],
    cssFiles: []
  };

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
  
  // Display temporary toast notification for user feedback
  function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('visible');
    toast.setAttribute('aria-hidden', 'false');
    
    // Hide toast after 2 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 2000);
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
    
    // Disable copy button until new results arrive
    document.getElementById('copy-ai-prompt').disabled = true;
    
    // Execute analysis script in the active tab's context
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: analyzePage,
        args: [options]
      }, (results) => {
        // Handle any runtime errors from the content script
        if (chrome.runtime.lastError) {
          reportEl.innerHTML = `<div class="result-group"><strong>Error:</strong> ${chrome.runtime.lastError.message}</div>`;
          return;
        }
        
        // Format and display results
        const findings = results?.[0]?.result || {};
        displayResults(findings, options, reportEl);
      });
    });
  }

  // ======== Page Analysis ========
  // This function runs in the context of the analyzed web page
  function analyzePage(options) {
    // 1. Set up a debug logger based on options
    const debugLog = options.debugMode 
      ? (message, data) => console.log(`%c[Tech Analyzer Debug] %c${message}`, 'color: #2b90d9; font-weight: bold;', 'color: inherit;', data || '')
      : () => {}; // No-op function when debug mode is off
    
    // Define framework detection configuration with scoring system
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
          name: 'AngularJS',
          confidence: 0,
          signals: [
            { type: 'attribute', patterns: ['ng-app', 'ng-controller', 'ng-model', 'ng-repeat'], weight: 5 },
            { type: 'global', patterns: ['angular.module', 'angular.bootstrap'], weight: 4 },
            { type: 'file', patterns: ['angular.js', 'angular.min.js'], weight: 4 },
            { type: 'dom', test: () => !!document.querySelector('[ng-app],[data-ng-app]'), weight: 5 }
          ],
          minConfidence: 5
        },
        {
          name: 'Vue.js',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['Vue', 'VueRouter', 'Vuex'], weight: 4 },
            { type: 'attribute', patterns: ['v-if', 'v-for', 'v-model', 'v-on', 'v-bind'], weight: 5 },
            { type: 'dom', test: () => !!document.querySelector('[v-cloak],[v-if],[v-for]'), weight: 5 },
            { type: 'file', patterns: ['vue.js', 'vue.min.js', 'vue-router'], weight: 3 }
          ],
          minConfidence: 4
        },
        {
          name: 'Svelte',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['Svelte', '__SVELTE'], weight: 4 },
            { type: 'attribute', patterns: ['svelte-'], weight: 5 },
            { type: 'dom', test: () => document.querySelectorAll('[svelte-]').length > 0, weight: 5 },
            { type: 'file', patterns: ['svelte.js', 'svelte.min.js', 'svelte-'], weight: 3 }
          ],
          minConfidence: 4
        },
        {
          name: 'jQuery',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['jQuery', '$'], weight: 3 },
            { type: 'dom', test: () => typeof window.$ === 'function' && window.$.fn && window.$.fn.jquery, weight: 5 },
            { type: 'file', patterns: ['jquery.js', 'jquery.min.js'], weight: 4 }
          ],
          minConfidence: 5
        },
        {
          name: 'Alpine.js',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['Alpine'], weight: 4 },
            { type: 'attribute', patterns: ['x-data', 'x-bind', 'x-on', 'x-show'], weight: 5 },
            { type: 'dom', test: () => !!document.querySelector('[x-data]'), weight: 5 },
            { type: 'file', patterns: ['alpine.js', 'alpine.min.js'], weight: 3 }
          ],
          minConfidence: 4
        },
        {
          name: 'Next.js',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['__NEXT_DATA__'], weight: 5 },
            { type: 'dom', test: () => !!document.getElementById('__next'), weight: 4 },
            { type: 'attribute', patterns: ['data-next-page', 'next-head'], weight: 4 },
            { type: 'file', patterns: ['_next/'], weight: 3 }
          ],
          minConfidence: 4
        },
        {
          name: 'Nuxt.js',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['__NUXT__'], weight: 5 },
            { type: 'dom', test: () => !!document.getElementById('__nuxt'), weight: 4 },
            { type: 'attribute', patterns: ['data-n-head', 'nuxt-link'], weight: 4 },
            { type: 'file', patterns: ['_nuxt/'], weight: 3 }
          ],
          minConfidence: 4
        },
        {
          name: 'Ember.js',
          confidence: 0,
          signals: [
            { type: 'global', patterns: ['Ember', 'EmberENV'], weight: 4 },
            { type: 'dom', test: () => !!document.querySelector('[data-ember-action]'), weight: 5 },
            { type: 'attribute', patterns: ['data-ember-action', 'ember-view'], weight: 4 },
            { type: 'file', patterns: ['ember.js', 'ember.min.js'], weight: 3 }
          ],
          minConfidence: 4
        }
      ],
      css: [
        {
          name: 'Bootstrap',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['navbar-expand-', 'col-md-', 'container-fluid', 'row', 'btn-primary'], weight: 4 },
            { type: 'file', patterns: ['bootstrap'], weight: 3 },
            { type: 'styleRule', test: () => {
              try {
                return !!getComputedStyle(document.body).getPropertyValue('--bs-primary');
              } catch (e) {
                return false;
              }
            }, weight: 5 }
          ],
          minConfidence: 5
        },
        {
          name: 'Tailwind CSS',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['text-', 'bg-', 'flex', 'grid', 'px-', 'py-', 'mx-', 'my-'], weight: 3 },
            { type: 'multiClass', test: () => {
              // Look for multiple Tailwind utility classes on elements
              const classes = Array.from(document.querySelectorAll('[class]')).map(el => el.getAttribute('class'));
              const tailwindPatterns = /\b(flex|grid|px-\d|py-\d|mx-\d|my-\d|text-\w+)\b/;
              // Only confirm if multiple elements have Tailwind patterns
              return classes.filter(cls => cls && tailwindPatterns.test(cls)).length > 5;
            }, weight: 5 },
            { type: 'file', patterns: ['tailwind'], weight: 3 }
          ],
          minConfidence: 5
        },
        {
          name: 'Bulma',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['is-primary', 'is-info', 'columns', 'navbar-burger'], weight: 4 },
            { type: 'file', patterns: ['bulma'], weight: 3 },
            { type: 'multiClass', test: () => {
              // Look for Bulma's distinctive modifiers
              return !!document.querySelector('.column.is-') || 
                     !!document.querySelector('.navbar.is-');
            }, weight: 5 }
          ],
          minConfidence: 4
        },
        {
          name: 'Foundation',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['button.', 'callout', 'small-', 'medium-', 'large-'], weight: 3 },
            { type: 'file', patterns: ['foundation'], weight: 3 },
            { type: 'dom', test: () => !!document.querySelector('.row .column, .row .columns'), weight: 5 }
          ],
          minConfidence: 4
        },
        {
          name: 'Material UI',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['MuiButton-', 'MuiInput-', 'MuiGrid-'], weight: 5 },
            { type: 'file', patterns: ['material-ui', '@material'], weight: 3 },
            { type: 'dom', test: () => document.querySelectorAll('[class*="Mui"]').length > 3, weight: 4 }
          ],
          minConfidence: 4
        },
        {
          name: 'Semantic UI',
          confidence: 0,
          signals: [
            { type: 'class', patterns: ['ui segment', 'ui button', 'ui grid', 'ui form'], weight: 4 },
            { type: 'file', patterns: ['semantic', 'semantic-ui'], weight: 3 },
            { type: 'dom', test: () => document.querySelectorAll('.ui.button, .ui.segment, .ui.grid').length > 2, weight: 5 }
          ],
          minConfidence: 4
        },
        {
          name: 'Chakra UI',
          confidence: 0,
          signals: [
            { type: 'attribute', patterns: ['data-chakra-'], weight: 5 },
            { type: 'class', patterns: ['chakra-'], weight: 4 },
            { type: 'file', patterns: ['chakra-ui', '@chakra'], weight: 3 }
          ],
          minConfidence: 4
        }
      ]
    };
    
    // Helper for determining detected frameworks by threshold
    const getDetectedFrameworks = (frameworkList) => {
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
          
          // Run computed style tests
          if (signal.type === 'styleRule' && typeof signal.test === 'function') {
            try {
              if (signal.test()) {
                framework.confidence += signal.weight;
                signalResults.detected = true;
                signalResults.details.push(`Style rule test passed`);
              }
            } catch(e) {
              // Ignore style test failures
            }
          }
          
          // Run multi-class pattern tests
          if (signal.type === 'multiClass' && typeof signal.test === 'function') {
            try {
              if (signal.test()) {
                framework.confidence += signal.weight;
                signalResults.detected = true;
                signalResults.details.push(`Multi-class pattern test passed`);
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
    };
    
    const findings = {
      jsFrameworks: [],
      cssFrameworks: [],
      jsFiles: [],
      cssFiles: []
    };
    
    // 1. Detect JS frameworks using multiple signals and confidence scoring
    if (options.jsFrameworks) {
      findings.jsFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.js);
      
      // Ensure we always return something even if no frameworks detected
      if (findings.jsFrameworks.length === 0) {
        findings.jsFrameworks.push('None detected');
      }
    }
    
    // 2. Detect CSS frameworks using similar confidence scoring approach
    if (options.cssFrameworks) {
      findings.cssFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.css);
      
      // Ensure we always return something even if no frameworks detected
      if (findings.cssFrameworks.length === 0) {
        findings.cssFrameworks.push('None detected');
      }
    }
    
    // 3. Find and filter JavaScript files
    if (options.listJS) {
      findings.jsFiles = Array.from(document.querySelectorAll('script[src]'))
        .map(script => {
          try {
            const url = new URL(script.src);
            const pathname = url.pathname;
            
            // Skip API calls and non-file URLs
            if (pathname.includes('/api/') || 
                pathname.includes('/json') || 
                url.search || // Has query parameters
                !pathname.includes('.')) {
              return null;
            }
            
            // Extract just the filename
            return pathname.split('/').pop();
          } catch (e) {
            // Fallback for relative URLs
            const parts = script.src.split('/');
            const filename = parts.pop();
            
            // Apply same filtering to relative URLs
            if (parts.some(part => part === 'api') || 
                !filename.includes('.') || 
                script.src.includes('?')) {
              return null;
            }
            
            return filename;
          }
        })
        .filter(filename => filename); // Remove nulls and empty entries
        
      // Ensure we always return something even if no files found
      if (findings.jsFiles.length === 0) {
        findings.jsFiles.push('None found');
      }
    }
    
    // 4. Find and filter CSS files
    if (options.listCSS) {
      findings.cssFiles = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
        .map(link => {
          try {
            const url = new URL(link.href);
            const pathname = url.pathname;
            
            // Skip API calls and non-file URLs (same logic as JS files)
            if (pathname.includes('/api/') || 
                pathname.includes('/json') || 
                url.search || 
                !pathname.includes('.')) {
              return null;
            }
            
            // Extract just the filename
            return pathname.split('/').pop();
          } catch (e) {
            // Fallback for relative URLs
            const parts = link.href.split('/');
            const filename = parts.pop();
            
            // Apply same filtering to relative URLs
            if (parts.some(part => part === 'api') || 
                !filename.includes('.') || 
                link.href.includes('?')) {
              return null;
            }
            
            return filename;
          }
        })
        .filter(filename => filename); // Remove nulls and empty entries
        
      // Ensure we always return something even if no files found
      if (findings.cssFiles.length === 0) {
        findings.cssFiles.push('None found');
      }
    }
    
    return findings;
  }

  // ======== Results Display ========
  // Format findings and update the UI with results
  function displayResults(findings, options, reportEl) {
    let output = '';
    let hasResults = false;
    
    // Save files to clipboard data for AI prompt generation
    if (findings.jsFiles) {
      clipboardData.jsFiles = findings.jsFiles;
    }
    
    if (findings.cssFiles) {
      clipboardData.cssFiles = findings.cssFiles;
    }
    
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
