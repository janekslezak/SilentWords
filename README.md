# SilentWords

A Progressive Web App (PWA) for contemplative quotes from the Dhammapada, Zen Koans, and Daoist classics.

## Features
- Offline-first design with IndexedDB and Service Worker
- Dark/light theme toggle
- Copy and share quotes
- Keyboard shortcuts
- Installable as a PWA

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
Public domain. See MIT [LICENSE](LICENSE) for details.

https://giyeon.netlify.app/
