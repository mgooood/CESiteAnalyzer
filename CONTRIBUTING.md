# Contributing to CESiteAnalyzer

Thank you for your interest in contributing to CESiteAnalyzer! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. **Fork the Repository**: Create your own fork of the project on GitHub
2. **Clone your Fork**: `git clone https://github.com/YOUR-USERNAME/CESiteAnalyzer.git`
3. **Create a Branch**: `git checkout -b feature/your-feature-name`

## Development Guidelines

### Code Style

- Follow existing code style patterns
- Use descriptive variable names
- Include comments for complex logic
- Create reusable functions when appropriate
- Use ES6+ JavaScript features

### Mobile-First Approach

- Always design CSS with mobile-first principles
- Test on various screen sizes before submitting changes

### Accessibility

- Maintain proper ARIA attributes
- Ensure keyboard navigation works
- Keep contrast ratios accessible
- Test with screen readers when possible

### Testing

Before submitting a pull request, please test your changes:

1. Load the extension in Chrome's developer mode
2. Test on various websites
3. Verify both light and dark modes work
4. Check for any console errors

## Submitting Changes

1. **Commit your Changes**: `git commit -m "Brief description of changes"`
2. **Push to GitHub**: `git push origin feature/your-feature-name`
3. **Create a Pull Request**: Submit a PR from your branch to the main repository

## How to Report Issues

If you find a bug or have a feature request:

1. Check existing issues to avoid duplicates
2. Use the issue template if available
3. Include clear steps to reproduce for bugs
4. For feature requests, explain the use case

## Development Setup

### Loading the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension directory
4. Any changes to files require reloading the extension

Thank you for contributing to CESiteAnalyzer!
