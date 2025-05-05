# CESiteAnalyzer

A Chrome extension for analyzing web technologies on the current page.

## Features

- **Detect JS Frameworks**: Identifies popular JavaScript frameworks like React, Angular, Vue, and Svelte
- **Detect CSS Frameworks**: Identifies CSS frameworks like Bootstrap, Tailwind CSS, Bulma, and Foundation
- **List JavaScript Files**: Shows all JavaScript files loaded on the page (excluding API calls)
- **List CSS Files**: Shows all CSS files loaded on the page (excluding API calls)
- **AI-Friendly Export**: Copy file lists formatted for AI tools to get insights about the technologies
- **Light/Dark Mode**: Toggle between light and dark themes, with system preference detection

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and ready to use

## Usage

1. Navigate to any website you want to analyze
2. Click the CESiteAnalyzer extension icon in your browser toolbar
3. Select the analysis options you want to run
4. Click "Run Analysis" to see the results
5. To get insights about the detected files, click "Copy for AI" and paste into your favorite AI assistant

## Development

### Project Structure

```
CESiteAnalyzer/
├── assets/           # Extension icons and images
├── manifest.json     # Extension configuration
├── popup.html        # Extension popup UI
├── popup.css         # Styles for the popup
├── popup.js          # Logic for the popup and page analysis
├── README.md         # Project documentation
└── .gitignore        # Git ignore rules
```

### Technologies Used

- HTML5, CSS3, and JavaScript
- Chrome Extensions API
- Mobile-first responsive design
- Accessibility-focused UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is available under the MIT License.
