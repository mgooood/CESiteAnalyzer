// Tech Analyzer Extension for Chrome
// Analyzes web technologies and provides clipboard support for AI prompts

(function() {
  // ======== Theme Management ========
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize app state
    initializeTheme();
    initializeClipboard();
    
    // Add event listeners
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('copy-ai-prompt').addEventListener('click', copyAIPrompt);
    document.getElementById('analyze-form').addEventListener('submit', handleFormSubmit);
  });

  // Initialize theme from storage or system preference
  function initializeTheme() {
    chrome.storage.local.get('theme', ({ theme }) => {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else if (theme === 'light') {
        document.body.classList.add('light-theme');
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-theme');
      }
    });
  }

  // Toggle between light and dark theme
  function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      chrome.storage.local.set({ theme: 'light' });
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      chrome.storage.local.set({ theme: 'dark' });
    }
  }

  // ======== Clipboard Support ========
  // Store detected files for clipboard access
  let clipboardData = {
    jsFiles: [],
    cssFiles: []
  };

  // Initialize clipboard button state
  function initializeClipboard() {
    const copyButton = document.getElementById('copy-ai-prompt');
    copyButton.disabled = true;
  }

  // Copy formatted data to clipboard
  function copyAIPrompt() {
    const allFiles = [...clipboardData.jsFiles, ...clipboardData.cssFiles]
      .filter(file => file !== 'None found');
    
    if (allFiles.length === 0) {
      return;
    }
    
    const prompt = `Give me a brief idea what these files are: ${allFiles.join(', ')}`;
    
    navigator.clipboard.writeText(prompt).then(() => {
      showToast();
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }
  
  // Show the toast notification
  function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('visible');
    toast.setAttribute('aria-hidden', 'false');
    
    setTimeout(() => {
      toast.classList.remove('visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 2000);
  }

  // Update clipboard button state based on results
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
  // Handle form submission
  function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get selected options
    const options = {
      jsFrameworks: document.querySelector('input[name="js-frameworks"]').checked,
      cssFrameworks: document.querySelector('input[name="css-frameworks"]').checked,
      listJS: document.querySelector('input[name="list-js"]').checked,
      listCSS: document.querySelector('input[name="list-css"]').checked
    };
    
    // Clear previous results
    const reportEl = document.getElementById('report');
    reportEl.innerHTML = '';
    
    // Reset clipboard data
    clipboardData = {
      jsFiles: [],
      cssFiles: []
    };
    
    // Disable copy button until we have results
    document.getElementById('copy-ai-prompt').disabled = true;
    
    // Run the analysis
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: analyzePage,
        args: [options]
      }, (results) => {
        // Handle errors
        if (chrome.runtime.lastError) {
          reportEl.innerHTML = `<div class="result-group"><strong>Error:</strong> ${chrome.runtime.lastError.message}</div>`;
          return;
        }
        
        // Display results
        const findings = results?.[0]?.result || {};
        displayResults(findings, options, reportEl);
      });
    });
  }

  // ======== Page Analysis ========
  // This function is injected into the page context
  function analyzePage(options) {
    // Framework detection patterns
    const JS_FRAMEWORKS = [
      { name: 'React', patterns: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'react.js', 'react.min.js', 'react-dom'] },
      { name: 'AngularJS', patterns: ['ngApp', 'angular.module', 'angular.js', 'angular.min.js', 'ng-app', 'ng-controller'] },
      { name: 'Vue.js', patterns: ['Vue', 'vue.js', 'vue.min.js'] },
      { name: 'Svelte', patterns: ['Svelte', 'svelte'] }
    ];

    const CSS_FRAMEWORKS = [
      { name: 'Bootstrap', patterns: ['bootstrap'] },
      { name: 'Tailwind CSS', patterns: ['tailwind', 'tw-'] },
      { name: 'Bulma', patterns: ['bulma'] },
      { name: 'Foundation', patterns: ['foundation'] }
    ];
    
    const findings = {};
    
    // 1. Detect JS frameworks
    if (options.jsFrameworks) {
      findings.jsFrameworks = [];
      
      const pageSource = document.documentElement.outerHTML.toLowerCase();
      const scriptTags = Array.from(document.querySelectorAll('script[src]'));
      const scriptSrcs = scriptTags.map(tag => tag.src.toLowerCase());
      
      JS_FRAMEWORKS.forEach(fw => {
        const hasMatch = fw.patterns.some(pattern => {
          const lcPattern = pattern.toLowerCase();
          return (
            window[pattern] || 
            scriptSrcs.some(src => src.includes(lcPattern)) || 
            pageSource.includes(lcPattern)
          );
        });
        
        if (hasMatch) findings.jsFrameworks.push(fw.name);
      });
      
      if (findings.jsFrameworks.length === 0) {
        findings.jsFrameworks.push('None detected');
      }
    }
    
    // 2. Detect CSS frameworks
    if (options.cssFrameworks) {
      findings.cssFrameworks = [];
      
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
      const styleSrcs = styleLinks.map(link => link.href.toLowerCase());
      const pageClasses = document.body.className.toLowerCase();
      
      CSS_FRAMEWORKS.forEach(fw => {
        const hasMatch = fw.patterns.some(pattern => {
          const lcPattern = pattern.toLowerCase();
          return (
            styleSrcs.some(src => src.includes(lcPattern)) || 
            pageClasses.includes(lcPattern)
          );
        });
        
        if (hasMatch) findings.cssFrameworks.push(fw.name);
      });
      
      if (findings.cssFrameworks.length === 0) {
        findings.cssFrameworks.push('None detected');
      }
    }
    
    // 3. List JS files
    if (options.listJS) {
      findings.jsFiles = Array.from(document.querySelectorAll('script[src]'))
        .map(script => {
          try {
            const url = new URL(script.src);
            const pathname = url.pathname;
            
            // Skip if it looks like an API call
            if (pathname.includes('/api/') || 
                pathname.includes('/json') || 
                url.search || 
                !pathname.includes('.')) {
              return null;
            }
            
            return pathname.split('/').pop();
          } catch (e) {
            // Fallback for relative URLs
            const parts = script.src.split('/');
            const filename = parts.pop();
            
            // Skip if it looks like an API call
            if (parts.some(part => part === 'api') || 
                !filename.includes('.') || 
                script.src.includes('?')) {
              return null;
            }
            
            return filename;
          }
        })
        .filter(filename => filename);
        
      if (findings.jsFiles.length === 0) {
        findings.jsFiles.push('None found');
      }
    }
    
    // 4. List CSS files
    if (options.listCSS) {
      findings.cssFiles = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
        .map(link => {
          try {
            const url = new URL(link.href);
            const pathname = url.pathname;
            
            // Skip if it looks like an API call
            if (pathname.includes('/api/') || 
                pathname.includes('/json') || 
                url.search || 
                !pathname.includes('.')) {
              return null;
            }
            
            return pathname.split('/').pop();
          } catch (e) {
            // Fallback for relative URLs
            const parts = link.href.split('/');
            const filename = parts.pop();
            
            // Skip if it looks like an API call
            if (parts.some(part => part === 'api') || 
                !filename.includes('.') || 
                link.href.includes('?')) {
              return null;
            }
            
            return filename;
          }
        })
        .filter(filename => filename);
        
      if (findings.cssFiles.length === 0) {
        findings.cssFiles.push('None found');
      }
    }
    
    return findings;
  }

  // ======== Results Display ========
  // Format and display results
  function displayResults(findings, options, reportEl) {
    let output = '';
    let hasResults = false;
    
    // Update clipboard data for global access
    if (findings.jsFiles) {
      clipboardData.jsFiles = findings.jsFiles;
    }
    
    if (findings.cssFiles) {
      clipboardData.cssFiles = findings.cssFiles;
    }
    
    // Update clipboard button state based on results
    updateClipboardButton();
    
    // Helper for creating result sections
    function addResultSection(title, items, isListFormat = false) {
      hasResults = true;
      output += `<div class="result-group"><strong>${title}:</strong><br>`;
      
      if (!items || items.length === 0) {
        output += '<span class="result-item">No results</span>';
      } else if (items.length === 1 && (items[0] === 'None found' || items[0] === 'None detected')) {
        output += '<span class="result-item">No results</span>';
      } else if (isListFormat) {
        output += '<ul>' + items.map(item => `<li class="result-item">${item}</li>`).join('') + '</ul>';
      } else {
        // Framework results: Better spacing and styling
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
    
    // Display results
    reportEl.innerHTML = hasResults 
      ? output 
      : '<div class="result-group">No analysis options selected.</div>';
  }
})();
