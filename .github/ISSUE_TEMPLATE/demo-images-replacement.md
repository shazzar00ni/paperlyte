---
title: '[ENHANCEMENT] Replace SVG placeholders with actual product screenshots in demo carousel'
labels: ['enhancement', 'design', 'demo', 'low-priority']
assignees: ''
---

## Feature Description

The `DemoCarousel` component currently uses SVG placeholders for demo images. We need to create and integrate actual product screenshots to showcase real functionality.

## Current Implementation

**File**: `src/components/DemoCarousel.tsx`  
**Current approach**: Programmatically generated SVG placeholders

```typescript
const generatePlaceholderSVG = (title: string, color: string) => {
  // Creates colored SVG with text
}
```

## Required Demo Screenshots

### 1. Editor Screenshot (`editor-screenshot.jpg`)

**Content to capture:**

- Clean, minimal note editor interface
- Sample note content showing typography
- Toolbar with formatting options
- Sidebar with note list
- Light theme, professional appearance

**Specifications:**

- Resolution: 1200x800px (aspect ratio 3:2)
- Format: WebP with JPG fallback
- File size: <200KB optimized
- Show realistic content, not lorem ipsum

### 2. Search Screenshot (`search-screenshot.jpg`)

**Content to capture:**

- Search interface with query entered
- Search results highlighting matches
- Tag filtering in action
- Multiple notes visible in results
- Search suggestions or auto-complete

**Specifications:**

- Resolution: 1200x800px
- Format: WebP with JPG fallback
- Show search functionality clearly
- Include tag system demonstration

### 3. Sync Screenshot (`sync-screenshot.jpg`)

**Content to capture:**

- Multi-device sync visualization
- Same note open on desktop and mobile
- Sync status indicators
- Cloud connection icons
- "Coming Soon" overlay if needed

**Specifications:**

- Resolution: 1200x800px
- Format: WebP with JPG fallback
- Device mockups (laptop + phone)
- Clear sync concept illustration

### 4. Privacy Screenshot (`privacy-screenshot.jpg`)

**Content to capture:**

- Privacy dashboard or settings
- Encryption indicators
- Data security features
- "No ads/tracking" messaging
- Privacy-focused UI elements

**Specifications:**

- Resolution: 1200x800px
- Format: WebP with JPG fallback
- Trust and security focused design
- Clear privacy messaging

## Implementation Tasks

### Phase 1: Content Creation

- [ ] Create realistic note content for screenshots
- [ ] Set up clean demo environment
- [ ] Take high-quality screenshots of each feature
- [ ] Edit and optimize images for web use

### Phase 2: Asset Optimization

- [ ] Convert to WebP format for performance
- [ ] Create JPG fallbacks for compatibility
- [ ] Optimize file sizes (<200KB each)
- [ ] Generate responsive sizes if needed
- [ ] Add proper alt text descriptions

### Phase 3: Integration

- [ ] Replace SVG generation code with static images
- [ ] Update image paths in `demoSlides` array
- [ ] Implement error handling for failed image loads
- [ ] Test on various devices and connections
- [ ] Add loading states for images

### Phase 4: Enhancement

- [ ] Consider lazy loading for performance
- [ ] Add hover effects or animations
- [ ] Implement progressive image loading
- [ ] Add analytics tracking for image interactions

## Code Changes Required

### Update DemoCarousel.tsx

```typescript
const demoSlides: DemoSlide[] = [
  {
    id: 'editor',
    title: 'Lightning Fast Editor',
    description:
      'Start writing instantly with our distraction-free interface. No loading screens, no delays.',
    image: '/demo/editor-screenshot.webp',
    fallback: '/demo/editor-screenshot.jpg',
    alt: 'Paperlyte editor interface showing clean, minimal design with sample note content',
  },
  // ... other slides
]
```

### Add Image Error Handling

```typescript
const handleImageError = (
  slideId: string,
  e: React.SyntheticEvent<HTMLImageElement>
) => {
  const img = e.target as HTMLImageElement

  // Try fallback format
  if (img.src.includes('.webp')) {
    img.src = img.src.replace('.webp', '.jpg')
  } else {
    // Ultimate fallback to SVG placeholder
    img.src = generatePlaceholderSVG(slideId)
  }

  // Track image loading issues
  monitoring.addBreadcrumb('Demo image load failed', 'error', {
    slideId,
    originalSrc: img.src,
  })
}
```

## Design Guidelines

### Visual Consistency

- Match current app branding and colors
- Use consistent typography and spacing
- Maintain professional, clean aesthetic
- Ensure readability at carousel size

### Content Strategy

- Show real, useful note content
- Demonstrate key features clearly
- Avoid cluttered or complex examples
- Focus on user benefits, not technical details

### Technical Requirements

- Responsive design compatible
- Accessibility compliant (proper alt text)
- Performance optimized
- Cross-browser compatibility tested

## Success Criteria

- [ ] All 4 demo screenshots created and optimized
- [ ] Images load quickly (<2s on 3G connection)
- [ ] Visual quality is professional and appealing
- [ ] Features are clearly demonstrated
- [ ] No accessibility issues with screen readers
- [ ] Performance impact is minimal
- [ ] Analytics show improved user engagement

## Priority

**Low** - Improves user experience and conversion but not blocking core functionality.

## Additional Context

Quality demo images are important for:

- Building user trust and credibility
- Demonstrating product value clearly
- Improving conversion rates on landing page
- Professional brand appearance

Consider A/B testing different image styles to optimize for conversion rates.

## Assets Delivery

**Location**: `public/demo/` directory  
**Naming convention**: `{feature}-screenshot.{format}`  
**Formats**: WebP primary, JPG fallback  
**Documentation**: Include image specifications and creation process
