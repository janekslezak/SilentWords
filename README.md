# SilentWords

A Progressive Web App (PWA) for contemplative quotes from the Dhammapada, Zen Koans, and Daoist classics.

## Features
- Offline-first design with IndexedDB and Service Worker
- Dark/light theme toggle
- Copy and share quotes
- Keyboard shortcuts
- Installable as a PWA

## Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/janekslezak/SilentWords.git
   cd SilentWords
   ```
2. Serve the files using a local server (e.g., `python -m http.server` or `live-server`).
3. Open `index.html` in your browser.

## Architecture
- **constants.js**: Shared constants and configuration.
- **db.js**: IndexedDB setup and caching logic.
- **quotes.js**: Quote management and state.
- **utils.js**: Helper functions.
- **app.js**: Main application logic.
- **sw.js**: Service Worker for offline support.

## Development
- Use ES6 modules for modularity.
- Add new quote databases to the `/data` folder.
- Update `constants.js` to include new files.

## License
Public domain. See [LICENSE](LICENSE) for details.