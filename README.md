# PR Enhancer

A Chrome extension that enhances your GitHub pull request workflow with smart comment sorting, unresolved conversation tracking, and seamless navigation. Built with [GitHub's Primer design system](https://primer.style/) for native integration.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen?logo=google-chrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Primer Design](https://img.shields.io/badge/Primer-Design%20System-6e5494)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

### Smart Comment Sorting
- **Newest First** (default) - Latest comments appear on top
- **Oldest First** - Original chronological order
- **Persistent Preferences** - Remembers your choice across sessions
- **Smooth Animations** - Comments reorder with fluid FLIP transitions

### Unresolved Conversations Tracking
- **Quick Access Dropdown** - Click to see all unresolved conversations
- **Live Counter** - Shows how many conversations need attention
- **Jump to Conversation** - Click any item to scroll directly to it
- **Visual States** - Green checkmark when all resolved, orange indicator when pending

### Customizable Settings
- **Merge Status Positioning** - Toggle to move merge/status box to top of conversation
- **Settings Sync** - Preferences sync across devices via Chrome storage

### User Experience
- **Keyboard Shortcut** - Quick access with `Alt+S` to toggle sorting
- **Dark Mode Support** - Matches GitHub's dark theme automatically
- **Accessible UI** - Full ARIA support and keyboard navigation
- **First-Run Onboarding** - Helpful tips for new users

## Installation

### From Source (Developer Mode)

1. **Clone or download this repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pr-enhancer.git
   cd pr-enhancer
   ```

2. **Install dependencies (for icon generation):**
   ```bash
   npm install
   ```

3. **Generate icons:**
   ```bash
   npm run generate-icons
   ```

4. **Load in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension directory

### From Chrome Web Store

_Coming soon..._

## Usage

### On GitHub PR Pages

Once installed, the extension automatically enhances GitHub PR pages:

1. **Sort Controls** - At the top of the conversation tab:
   - Click "Newest" or "Oldest" to sort comments
   - Default is "Newest First"

2. **Unresolved Conversations**:
   - View the counter (e.g., "5 Unresolved")
   - Click to see dropdown with all unresolved threads
   - Click any item to jump to that conversation

3. **Merge Status** (if enabled in settings):
   - Merge/status box appears at top for quick access

### Via Popup

Click the extension icon to:
- Change sort preference
- Access settings
- Toggle merge status positioning

### Keyboard Shortcuts

- `Alt+S` - Toggle between sort modes

## Settings

Access settings via the popup:

- **Move merge status to top** - When enabled, shows the merge/status box at the top of the conversation for quick access

## Design System

Built with [GitHub's Primer design system](https://primer.style/):

### Components
- **Buttons** - Primary and secondary variants
- **Dropdowns** - Native-looking menus
- **Toggle Switches** - For settings
- **Badges** - Counter indicators
- **Notifications** - Toast messages

### Design Tokens
- Uses Primer CSS custom properties
- 4px base unit spacing scale
- Proper border radius and shadows
- Accessible color pairings

### Icons
All icons from [Octicons](https://primer.style/octicons/):
- `history` - Newest first
- `clock` - Oldest first
- `issue-opened` - Unresolved
- `check-circle` - Resolved
- `chevron-down` - Dropdown indicator

## Accessibility

- **ARIA Labels** - All interactive elements properly labeled
- **Keyboard Navigation** - Full keyboard support
- **Focus Management** - Clear focus indicators
- **Screen Readers** - Semantic HTML and live regions

## Development

### Project Structure

```
pr-enhancer/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker
├── content/               # Content scripts
│   ├── core.js           # State management, utilities
│   ├── comments.js       # Comment detection and parsing
│   ├── sorting.js        # Sorting logic
│   ├── ui.js             # UI components
│   ├── content.js        # Main content script
│   └── content.css       # Styles
├── popup/                # Extension popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/                # Extension icons
└── scripts/              # Build scripts
    └── generate-icons.js
```

### Building

```bash
# Generate icons
npm run generate-icons

# Lint (if configured)
npm run lint

# Build (copy files, generate icons)
npm run build
```

### Tech Stack

- **Manifest V3** - Latest Chrome extension format
- **Vanilla JavaScript** - No frameworks, just ES6+
- **CSS Custom Properties** - Primer design tokens
- **Chrome Storage API** - Sync preferences
- **Chrome Tabs API** - Communicate with content scripts

## Browser Support

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)

## Privacy

This extension:
- ✅ Only runs on `github.com/*/pull/*` pages
- ✅ Stores preferences locally (Chrome Sync)
- ✅ No external API calls
- ✅ No tracking or analytics
- ✅ Open source code

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Changelog

### Version 2.0.0
- Added unresolved conversations tracking
- Added configurable merge status positioning
- Changed default sort to "Newest First"
- Improved dropdown z-index handling
- Added settings panel
- Enhanced accessibility
- Fixed stacking context issues

### Version 1.0.0
- Initial release
- Basic comment sorting
- Keyboard shortcuts
- Dark mode support

## Credits

Built with:
- [GitHub Primer](https://primer.style/) - Design system
- [Octicons](https://primer.style/octicons/) - Icon set
- Chrome Extension APIs

## Support

Found a bug or have a suggestion? [Open an issue](https://github.com/YOUR_USERNAME/pr-enhancer/issues)
