# CESiteAnalyzer Roadmap

This document outlines the planned improvements and future direction for the CESiteAnalyzer Chrome extension.

## Upcoming Improvements

### Short-Term (Next Release)
- [ ] Add version detection for frameworks
- [ ] Improve UI responsiveness on smaller screens
- [ ] Add more detailed explanations of detected frameworks
- [ ] Better error handling for sites with Content Security Policy restrictions
- [ ] Add option to disable console logs in production mode

### Medium-Term
- [ ] Add detection for more frontend frameworks
- [ ] Implement result history (store previous analyses)
- [ ] Add option to export results as JSON or CSV
- [ ] Optimize performance for faster analysis
- [ ] Add favicon and metadata analysis for websites

### Enhanced Content Inspection
- [ ] Implement deep content inspection of CSS files for framework signatures
- [ ] Add ability to identify minified frameworks by examining file contents
- [ ] Create signature database for common frameworks and their identifiers
- [ ] Add detection of framework version numbers from file comments
- [ ] Implement CSS preprocessor detection (SASS, LESS, etc.)
- [ ] Parse HTML comments for framework-related information
- [ ] Add support for downloading and analyzing remote stylesheets
- [ ] Build pattern recognition for obfuscated framework files
- [ ] Add support for examining imported JavaScript modules for framework clues

### Mobile Support Enhancement
- [ ] Optimize popup interface for mobile Chrome
- [ ] Create responsive mode for analyzing mobile-specific frameworks
- [ ] Add detection for mobile-specific libraries (React Native Web, Ionic, etc.)
- [ ] Create compact view option for small screens
- [ ] Add touch-friendly UI controls and gestures
- [ ] Implement portrait/landscape optimization

### Code Organization & Refactoring
- [ ] Complete modularization of codebase into ES Modules
- [ ] Move framework detection configurations to separate JSON files
- [ ] Create a proper configuration management system
- [ ] Implement dependency injection for better testability
- [ ] Add JSDoc comments throughout the codebase
- [ ] Create a build system with minification and bundling
- [ ] Implement proper error boundaries and error handling

### Testing Strategy
- [ ] Set up Jest for unit testing
- [ ] Create mock objects for Chrome API testing
- [ ] Add snapshot tests for UI components
- [ ] Implement integration tests using Puppeteer or Playwright
- [ ] Create a testing harness for framework detection accuracy
- [ ] Build a test suite with sample pages for each framework
- [ ] Add automated tests for CSS file detection
- [ ] Implement automated Chrome extension E2E testing
- [ ] Set up GitHub Actions for CI/CD pipeline

### AI Integration
- [ ] Add API key management for connecting to AI services
- [ ] Implement basic AI analysis of detected technologies
- [ ] Create specialized AI prompts for different analysis scenarios
- [ ] Add local model support for offline framework detection
- [ ] Implement framework relationship visualization with AI
- [ ] Add security analysis of detected technologies
- [ ] Create performance recommendations based on detected stack

### Accessibility Improvements
- [ ] Add keyboard shortcut support for all functions
- [ ] Improve screen reader compatibility
- [ ] Add high contrast theme option
- [ ] Implement focus indicators for keyboard navigation
- [ ] Add voice command support

### Performance & Security
- [ ] Implement caching for faster repeated analysis
- [ ] Add sandboxed execution for safer script analysis
- [ ] Reduce memory footprint for large sites
- [ ] Add option to analyze site over time (track changes)
- [ ] Implement privacy-focused analysis mode that doesn't store data

### Long-Term Vision
- [ ] Add complete website technology stack detection
- [ ] Create a dashboard for comparing multiple sites
- [ ] Browser plugin versions for Firefox and Edge
- [ ] Build recommendation engine for alternative technologies
- [ ] Develop API for programmatic access to analysis results
- [ ] Create developer mode with debugging tools integration

## Known Issues
- [ ] Framework detection sometimes misses frameworks loaded dynamically
- [ ] UI rendering issues at certain browser zoom levels
- [ ] Analysis fails on sites with strict CSP headers
- [ ] Large site analysis can cause performance issues

## Completed Improvements
- [x] Fixed AngularJS false positive detection
- [x] Improved framework detection with confidence scoring
- [x] Added light/dark theme toggle
- [x] Added AI prompt export feature
- [x] Fixed Vue.js detection false positives with more specific detection rules
- [x] Improved Bootstrap detection with content analysis and specific component checks
- [x] Enhanced Tailwind CSS detection with comprehensive utility pattern analysis
- [x] Added debug mode with detailed logging of detection process
- [x] Improved CSS file detection including commonly named files (e.g., style.min.css)
- [x] Refactored code into ES modules for better maintainability

## How To Contribute
If you'd like to help with any of these items, please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.
