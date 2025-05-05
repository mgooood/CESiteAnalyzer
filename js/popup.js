/**
 * Tech Analyzer Chrome Extension - Main Entry Point
 * Handles UI interactions, form handling, and integrates all modules
 */

import { initializeTheme, toggleTheme, showToast } from './utils.js';
import { detectFrameworks } from './framework-detection.js';
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
      // Create findings object with framework detection results
      const frameworkFindings = detectFrameworks(options);
      
      // Initialize results object
      const findings = {
        jsFrameworks: frameworkFindings.jsFrameworks,
        cssFrameworks: frameworkFindings.cssFrameworks,
        jsFiles: [],
        cssFiles: []
      };

      // Find JavaScript files if requested
      if (options.listJS) {
        findings.jsFiles = findJavaScriptFiles(options.debugMode);
      }
      
      // Find CSS files if requested
      if (options.listCSS) {
        findings.cssFiles = findCSSFiles(options.debugMode);
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
