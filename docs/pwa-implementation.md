# PWA Implementation Guide

## Overview

Paperlyte is now a Progressive Web App (PWA), providing offline access, installability, and an app-like experience.

## Features

### 1. Web App Manifest

**Location:** `public/manifest.json`

The manifest defines how Paperlyte appears when installed:

- **App Name**: "Paperlyte - Lightning Fast Notes"
- **Short Name**: "Paperlyte"
- **Display Mode**: Standalone (no browser UI)
- **Theme Color**: #6C63FF (primary purple)
- **Background Color**: #F9FAFB (light gray)
- **Start URL**: `/`

**Icons:**

- 8 sizes from 72x72 to 512x512 pixels
- SVG format with purple gradient branding
- Maskable icons for Android adaptive icons

**App Shortcuts:**

- "New Note" - Quick action to create a note

### 2. Service Worker

**Implementation:** `vite-plugin-pwa` with Workbox

**Caching Strategies:**

1. **Static Assets** (Precached)
   - HTML, CSS, JavaScript files
   - Icons and images
   - Instant offline access

2. **Google Fonts** (Cache-First)
   - 1-year expiration
   - Maximum 10 entries
   - Loads even when offline

3. **Analytics (PostHog)** (Network-First)
   - 3-second network timeout
   - Falls back to cache if offline
   - 1-day cache expiration

**Auto-Update:**

- Service worker checks for updates automatically
- Seamless updates without user intervention
- Refresh prompt can be added for immediate updates

### 3. Offline Support

**Components:**

**OfflineIndicator** (`src/components/OfflineIndicator.tsx`)

- Detects when user goes offline
- Shows yellow banner at top of screen
- Informs user that changes will sync when back online
- Uses browser's `online`/`offline` events

**Features:**

- Static assets work completely offline
- localStorage persists notes locally
- Future: Will sync with cloud when back online

### 4. Install Prompt

**InstallPrompt** (`src/components/InstallPrompt.tsx`)

**Behavior:**

- Shows after 3 seconds on first visit
- Bottom-right corner of screen
- Dismissible with "Not now" or X button
- Remembers dismissal in localStorage
- Tracks install/dismiss actions via analytics

**Installation Methods:**

**Desktop (Chrome/Edge):**

- Install icon in address bar
- Or wait for automatic prompt

**Mobile (Chrome/Safari):**

- "Add to Home Screen" in browser menu
- Or automatic install prompt

**What Happens When Installed:**

- App icon added to home screen/app list
- Opens in standalone window (no browser UI)
- Splash screen shows Paperlyte branding
- Works offline after installation

## Testing PWA Features

### 1. Lighthouse Audit

```bash
npm run build
npm run preview
```

Then in Chrome DevTools:

1. Open DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"

**Expected Scores:**

- Installable: ✓
- PWA Optimized: ✓
- Service Worker: ✓
- Offline: ✓

### 2. Manual Testing

**Test Installability:**

1. Visit app in Chrome/Edge
2. Look for install icon (⊕) in address bar
3. Click to install
4. Verify app opens in standalone window

**Test Offline:**

1. Open app and let it load
2. Open DevTools > Network tab
3. Check "Offline" checkbox
4. Refresh page
5. Verify app still loads and functions
6. Check that offline indicator appears

**Test Caching:**

1. Visit app (loads from network)
2. Refresh page
3. Check Network tab shows "(from ServiceWorker)"
4. Assets load instantly from cache

**Test Install Prompt:**

1. Visit app on new device/incognito
2. Wait 3 seconds
3. Verify install prompt appears
4. Click "Not now"
5. Verify prompt doesn't reappear on refresh

## Browser Support

### Full Support

- Chrome 80+ (Desktop & Mobile)
- Edge 80+ (Desktop & Mobile)
- Opera 67+
- Samsung Internet 11+

### Partial Support

- Safari 16.4+ (iOS/macOS) - Limited service worker support
- Firefox 97+ - No install prompt support

### Fallback Behavior

- Browsers without PWA support simply use the web app
- Service worker doesn't register on unsupported browsers
- Install prompt only shows on supported browsers

## Configuration

### Vite Configuration

`vite.config.ts` includes VitePWA plugin:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['vite.svg', 'icons/*.svg'],
  manifest: false, // Use custom manifest.json
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
    runtimeCaching: [
      // Custom caching strategies
    ],
  },
})
```

### Service Worker Registration

`src/main.tsx` registers the service worker:

```typescript
registerSW({
  immediate: true,
  onNeedRefresh() {
    /* Handle updates */
  },
  onOfflineReady() {
    /* Log offline ready */
  },
  onRegistered(registration) {
    /* Log registration */
  },
  onRegisterError(error) {
    /* Handle errors */
  },
})
```

## Development vs Production

### Development Mode

- Service worker disabled by default for faster reload
- Can enable with `devOptions.enabled: true` in config
- Console logs show registration status

### Production Mode

- Service worker automatically generated during build
- All assets precached
- Updates check automatically
- No console logs in production

## Future Enhancements

### Planned Features

- [ ] Background sync for note updates
- [ ] Push notifications for reminders
- [ ] More granular cache management
- [ ] Offline editing queue
- [ ] Service worker update prompt UI
- [ ] PNG icon generation for better compatibility

### API Migration (Q4 2025)

When migrating to API backend:

- Update caching strategies for API calls
- Implement background sync for note syncing
- Add conflict resolution for offline edits
- Enable real-time sync when online

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Verify HTTPS (service workers require secure context)
3. Check `navigator.serviceWorker` is available
4. Clear browser cache and hard refresh

### Install Prompt Not Showing

1. Verify browser supports PWA install
2. Check manifest.json is accessible
3. Ensure all required manifest fields present
4. Check for HTTPS
5. Clear localStorage item `pwa-install-prompt-dismissed`

### Assets Not Caching

1. Check service worker is registered
2. Verify Workbox precache manifest in sw.js
3. Check Network tab for service worker responses
4. Clear service worker cache and re-register

### Offline Mode Not Working

1. Verify service worker is active
2. Check precache includes all required assets
3. Test with DevTools offline mode
4. Check for console errors

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Lighthouse PWA Checklist

✓ Provides a valid `manifest.json`  
✓ Has a registered service worker  
✓ Works offline  
✓ Uses HTTPS  
✓ Redirects HTTP to HTTPS (production)  
✓ Has viewport meta tag  
✓ Content sized correctly for viewport  
✓ Has themed address bar  
✓ Provides custom splash screen (via manifest)  
✓ Sets an address-bar theme color  
✓ Fast load time (< 3s)  
✓ Page works without JavaScript (base HTML)  
✓ Configured for custom install prompt

## Maintenance

### Updating Service Worker

When making changes to caching strategies:

1. Update `vite.config.ts` workbox config
2. Rebuild app: `npm run build`
3. Test with `npm run preview`
4. Service worker will auto-update on deploy

### Updating Manifest

When changing app metadata:

1. Edit `public/manifest.json`
2. Update corresponding meta tags in `index.html`
3. Rebuild and test
4. Users may need to reinstall for changes to take effect

### Cache Invalidation

Service worker automatically invalidates cache on new deployments via versioned asset names from Vite build.
