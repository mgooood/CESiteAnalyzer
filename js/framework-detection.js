/**
 * Tech Analyzer Chrome Extension - Framework Detection
 * Handles detection of JavaScript and CSS frameworks with confidence scoring
 */

import { createDebugLogger } from './utils.js';

/**
 * Framework detection configuration with confidence scoring system
 */
export const FRAMEWORK_DETECTION = {
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
        // Fix: only match actual Vue directives (not data-v-*)
        { type: 'attribute', patterns: ['v-for', 'v-if', 'v-model', 'v-on', 'v-bind', 'v-show'], weight: 5 },
        { type: 'dom', test: () => !!document.querySelector('[v-cloak],[v-text],[v-html]'), weight: 4 },
        { type: 'file', patterns: ['vue.js', 'vue.min.js', 'vue-router'], weight: 4 }
      ],
      minConfidence: 5 // Increased threshold to avoid false positives
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
        { type: 'class', patterns: ['navbar-', 'btn-', 'col-md-', 'col-sm-', 'col-lg-'], weight: 4 },
        { type: 'file', patterns: ['bootstrap.css', 'bootstrap.min.css'], weight: 5 },
        { type: 'dom', test: () => !!document.querySelector('.navbar,.container-fluid,.row,.col-'), weight: 3 }
      ],
      minConfidence: 5
    },
    {
      name: 'Tailwind CSS',
      confidence: 0,
      signals: [
        { type: 'class', patterns: ['bg-blue-', 'text-', 'px-', 'py-', 'flex', 'grid-cols-'], weight: 4 },
        { type: 'file', patterns: ['tailwind.css', 'tailwind.min.css'], weight: 5 },
        { type: 'dom', test: () => {
          const classes = Array.from(document.querySelectorAll('[class]')).map(el => 
            typeof el.className === 'string' ? el.className : (el.className.baseVal || '')
          ).join(' ');
          // Check for multiple utility classes that are common in Tailwind
          return (/\b(flex|grid)\b/.test(classes) && 
                 /\b(px|py|mx|my)-[0-9]/.test(classes) && 
                 /\b(text|bg|border)-(gray|red|blue|green)-[0-9]/.test(classes));
        }, weight: 5 }
      ],
      minConfidence: 7
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

/**
 * Detects frameworks on the page based on confidence scoring
 * @param {Object} options - Detection options
 * @returns {Object} Object containing detected frameworks
 */
export function detectFrameworks(options = {}) {
  // Set up debug logger
  const debugLog = createDebugLogger(options.debugMode);
  
  // Create the findings results object
  const findings = {
    jsFrameworks: [],
    cssFrameworks: []
  };
  
  // Detect JS frameworks
  if (options.jsFrameworks) {
    findings.jsFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.js, options, debugLog);
    
    // Ensure we always return something even if no frameworks detected
    if (findings.jsFrameworks.length === 0) {
      findings.jsFrameworks.push('None detected');
    }
  }
  
  // Detect CSS frameworks
  if (options.cssFrameworks) {
    findings.cssFrameworks = getDetectedFrameworks(FRAMEWORK_DETECTION.css, options, debugLog);
    
    // Ensure we always return something even if no frameworks detected
    if (findings.cssFrameworks.length === 0) {
      findings.cssFrameworks.push('None detected');
    }
  }
  
  return findings;
}

/**
 * Helper for determining detected frameworks by threshold
 * @param {Array} frameworkList - List of frameworks to detect
 * @param {Object} options - Detection options
 * @param {Function} debugLog - Function for debug logging
 * @returns {Array} Array of detected framework names
 */
function getDetectedFrameworks(frameworkList, options, debugLog) {
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
