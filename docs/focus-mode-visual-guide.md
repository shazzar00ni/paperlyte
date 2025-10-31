# Focus Mode - Visual Guide

## Normal Editor View

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar          │ Editor Header                            │
│ ┌──────────┐     │ ┌──────────────────────────────────────┐ │
│ │ Search   │     │ │ Title: [Note Title...]               │ │
│ └──────────┘     │ │ [Tags] [Focus] [Save]                │ │
│                  │ └──────────────────────────────────────┘ │
│ [New Note]       │                                          │
│                  │ Editor Content:                          │
│ ┌──────────┐     │ ┌──────────────────────────────────────┐ │
│ │ Note 1   │     │ │ [B] [I] [List]                       │ │
│ │ Preview  │     │ │                                      │ │
│ └──────────┘     │ │ Your note content here...            │ │
│                  │ │                                      │ │
│ ┌──────────┐     │ │                                      │ │
│ │ Note 2   │     │ └──────────────────────────────────────┘ │
│ │ Preview  │     │                                          │
│ └──────────┘     │                                          │
└─────────────────────────────────────────────────────────────┘
```

## Focus Mode View (After Clicking "Focus" Button)

```
┌─────────────────────────────────────────────────────────────┐
│                    FULLSCREEN OVERLAY                        │
│                                                              │
│       ┌──────────────────────────────────────────┐          │
│       │  ╔════════════════════════════════════╗  │          │
│       │  ║  Note Title (Large & Bold)      [X]║  │          │
│       │  ╚════════════════════════════════════╝  │          │
│       │                                          │          │
│       │  ┌────────────────────────────────────┐  │          │
│       │  │                                    │  │          │
│       │  │  Your note content here...         │  │          │
│       │  │  (Large text for easy reading)     │  │          │
│       │  │                                    │  │          │
│       │  │                                    │  │          │
│       │  │                                    │  │          │
│       │  │                                    │  │          │
│       │  │                                    │  │          │
│       │  │                                    │  │          │
│       │  └────────────────────────────────────┘  │          │
│       │                                          │          │
│       │         ✓ Auto-saved                     │          │
│       └──────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Exit Options:
• Press ESC key
• Click X button (top-right)
• Click outside the white box
```

## Key Differences

### Normal Mode

- Sidebar visible with note list and search
- Full toolbar with Tags, Focus, and Save buttons
- Standard text size
- All UI elements visible

### Focus Mode

- **Sidebar hidden** - no distractions
- **Toolbar hidden** - only essential elements
- **Large title** (text-3xl) - easy to read
- **Large content** (text-lg) - comfortable writing
- **Centered overlay** - max-width 4xl for optimal reading width
- **Minimal UI** - just title, content, exit button, save status
- **Dark background** - draws attention to the white writing area

## Visual Elements

### Focus Mode Overlay

- **Position**: Fixed, covers entire viewport
- **Background**: Gray background (bg-background)
- **Z-index**: 50 (appears above all other content)
- **Padding**: 4 units (p-4)

### Writing Area

- **Width**: Full width, max-width 4xl (56rem / 896px)
- **Height**: Full viewport height
- **Background**: White (bg-white)
- **Padding**: 8 units (p-8) for spacious feel
- **Border Radius**: Large (rounded-lg)
- **Shadow**: Large shadow for depth (shadow-lg)

### Title Input

- **Font Size**: 3xl (1.875rem / 30px)
- **Font Weight**: Bold
- **Color**: Dark text (text-dark)
- **Background**: Transparent
- **Border**: None
- **Outline**: None (clean appearance)

### Content Editor

- **Font Size**: lg (1.125rem / 18px)
- **Flex**: 1 (takes remaining space)
- **Overflow**: Hidden (scrolls internally)

### Exit Button

- **Position**: Top-right of writing area
- **Icon**: X from lucide-react
- **Size**: 6x6 (24px)
- **Padding**: 2 units
- **Background**: Gray on hover
- **Shape**: Rounded full (circular)
- **Transition**: Smooth color transitions

### Save Status

- **Position**: Bottom center
- **Font Size**: Small (text-sm)
- **Color**: Gray (text-gray-500)
- **Icon**: Save icon from lucide-react
- **Animation**: Pulse animation when saving

## User Flow

```
1. User opens note in editor
   ↓
2. User clicks "Focus" button
   ↓
3. Focus Mode overlay appears
   ↓
4. User writes with large, comfortable text
   ↓
5. Changes auto-save (status shown at bottom)
   ↓
6. User exits via ESC/button/click-outside
   ↓
7. Returns to normal editor view
```

## Accessibility Features

### Keyboard Navigation

- **ESC**: Exit Focus Mode instantly
- **Tab**: Navigate between title and content
- **All standard text editing shortcuts work**

### Screen Readers

- Exit button labeled: "Exit Focus Mode"
- Focus button labeled: "Enter Focus Mode"
- Save status announces: "Auto-saved" or "Saving..."

### Visual Indicators

- Hover effects on exit button
- Clear visual separation of writing area
- High contrast for readability
- No distracting colors or animations
