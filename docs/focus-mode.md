# Focus Mode Feature

## Overview

Focus Mode provides a distraction-free writing experience by hiding all UI elements except the note editor, allowing users to concentrate fully on their writing.

## Features

- **Fullscreen Writing**: Hides sidebar, search, and non-essential UI elements
- **Minimal Interface**: Shows only title, content editor, save status, and exit button
- **Large Text**: Enhanced text size for better readability (title: text-3xl, content: text-lg)
- **Multiple Exit Options**: ESC key, click outside overlay, or click exit button
- **Keyboard Support**: ESC key to exit Focus Mode
- **Auto-save**: All changes are automatically saved while in Focus Mode

## Usage

### Entering Focus Mode

1. Open any note in the editor
2. Click the "Focus" button in the editor header (next to Tags and Save buttons)
3. The Focus Mode overlay appears with your note content

### Exiting Focus Mode

You can exit Focus Mode in three ways:

1. Press the `ESC` key
2. Click the X button in the top-right corner
3. Click outside the Focus Mode overlay

### Editing in Focus Mode

- Edit the title using the large title input at the top
- Edit content in the main editor area
- Changes are automatically saved
- Save status is displayed at the bottom ("Auto-saved" or "Saving...")

## Implementation Details

### State Management

- `focusMode`: Boolean state to track whether Focus Mode is active
- `focusModeRef`: Ref to detect clicks outside the overlay

### Event Handlers

- ESC key listener for keyboard exit
- Click outside listener for mouse exit
- Proper cleanup of event listeners on component unmount

### UI Components

- **Overlay**: Fixed position, centered, max-width 4xl, full viewport height
- **Title Input**: text-3xl, font-bold for enhanced readability
- **Content Editor**: RichTextEditor with text-lg for comfortable writing
- **Exit Button**: X icon in top-right with hover effects
- **Save Status**: Footer showing auto-save status

### Accessibility

- Exit button has `title` attribute: "Exit Focus Mode (ESC)"
- Exit button has `aria-label`: "Exit Focus Mode"
- Focus button has `title` attribute: "Enter Focus Mode"
- Keyboard navigation supported via ESC key
- Icons paired with text labels

## Analytics Tracking

- Entry: `trackFeatureUsage('focus_mode', 'enter')`
- Exit: `trackFeatureUsage('focus_mode', 'exit')`
- Monitoring breadcrumbs added for user actions

## Testing

Comprehensive test coverage includes:

- Focus Mode button visibility
- Entering Focus Mode via button click
- Exiting via ESC key
- Exiting via exit button
- Editing title in Focus Mode
- Save status display
- Multiple toggle cycles
- No Focus Mode when no note selected

## Future Enhancements

- Keyboard shortcut toggle (e.g., Ctrl/Cmd+Shift+F)
- Customizable background/theme options
- Font size controls
- Word count display
- Animation/transition effects on enter/exit
- Remember Focus Mode preference per note
- Timer/pomodoro integration
