# 📱 Social Media Images & Open Graph Assets

Required social media and sharing images for Paperlyte launch.

> **Priority:** P1 (Required for proper social sharing)  
> **Status:** 🔄 Ready for Creation  
> **Dependencies:** Main screenshots and branding assets

---

## 🎯 Open Graph Images (Facebook, LinkedIn, Slack)

### Primary Open Graph Image (og-image.png)

**Specifications:**

- **Size:** 1200x630px (1.91:1 ratio)
- **Format:** PNG (with JPG fallback)
- **File size:** Under 8MB (ideally under 1MB)
- **Content:** Main Paperlyte interface with hero text overlay

**Design Requirements:**

- [ ] Feature main Paperlyte interface screenshot
- [ ] Include tagline: "Finally, note-taking that feels effortless"
- [ ] Paperlyte logo prominently displayed
- [ ] Clean, professional design matching brand
- [ ] Text readable at thumbnail sizes
- [ ] High contrast for accessibility

**Text Overlay Content:**

```
PAPERLYTE
Finally, note-taking that feels effortless

Lightning-fast • Privacy-first • No signup required
```

### Alternative OG Images

**Feature-Focused (1200x630px each):**

- [ ] **Speed Focus:** "Start writing in under 3 seconds"
- [ ] **Privacy Focus:** "Your notes stay completely private"
- [ ] **Simplicity Focus:** "No accounts, no complexity, no bloat"

---

## 🐦 Twitter Card Images

### Twitter Large Image Card (twitter-card.png)

**Specifications:**

- **Size:** 1200x628px (1.91:1 ratio)
- **Format:** PNG or JPG
- **File size:** Under 5MB
- **Content:** Similar to OG image but optimized for Twitter

**Design Considerations:**

- [ ] Twitter's image cropping (safe area consideration)
- [ ] Mobile-first design (most Twitter users on mobile)
- [ ] Clear, bold text that works in Twitter's dark mode
- [ ] Strong visual hierarchy

### Twitter Summary Card (twitter-summary.png)

**Specifications:**

- **Size:** 300x157px (1.91:1 ratio)
- **Format:** PNG or JPG
- **Content:** Simplified version of main card

---

## 📱 Social Media Profile Images

### Profile/Avatar Images

**Twitter Profile (400x400px):**

- [ ] Paperlyte logo on brand background
- [ ] Clear, simple design that works at small sizes
- [ ] Consistent with overall brand identity

**LinkedIn Profile (300x300px):**

- [ ] Professional version of logo
- [ ] High contrast for business context

**Facebook Profile (180x180px):**

- [ ] Logo variant optimized for circular crop
- [ ] Consider Facebook's automatic cropping

### Cover/Banner Images

**Twitter Header (1500x500px):**

- [ ] Brand message: "Note-taking, Lighter Than Ever"
- [ ] Website URL prominently displayed
- [ ] Clean, minimal design matching app aesthetic
- [ ] Call-to-action: "Try now at paperlyte.com"

**LinkedIn Banner (1584x396px):**

- [ ] Professional messaging focused on productivity
- [ ] "Lightning-fast note-taking for modern productivity"
- [ ] Subtle product screenshots or interface elements

---

## 🎨 Design Guidelines

### Brand Consistency

**Color Palette:**

- Primary: Use Paperlyte's brand colors from design system
- Background: Clean whites, light grays
- Accent: Consistent with application UI
- Text: High contrast for readability

**Typography:**

- Use brand fonts (fallback to system fonts if needed)
- Consistent hierarchy across all images
- Readable at small sizes (minimum 14px equivalent)

**Logo Usage:**

- Always use high-resolution logo
- Maintain proper spacing and proportions
- Consistent placement across all images

### Content Guidelines

**Messaging Hierarchy:**

1. **Primary:** "Finally, note-taking that feels effortless"
2. **Secondary:** Key benefits (fast, private, simple)
3. **Tertiary:** Call-to-action or website URL

**Visual Elements:**

- Screenshots of actual Paperlyte interface
- Minimal, clean design aesthetic
- Focus on the product, not decorative elements
- Professional yet approachable tone

---

## 📋 Asset Creation Checklist

### Design Phase

- [ ] Review brand guidelines and color palette
- [ ] Gather high-quality Paperlyte screenshots
- [ ] Create design templates for each size/platform
- [ ] Develop text hierarchy and layout

### Production Phase

- [ ] Create primary Open Graph image (1200x630)
- [ ] Create Twitter card image (1200x628)
- [ ] Generate profile images (multiple sizes)
- [ ] Design cover/banner images
- [ ] Create alternative versions for A/B testing

### Quality Assurance

- [ ] Test images in Facebook's sharing debugger
- [ ] Verify Twitter card preview
- [ ] Check LinkedIn post preview
- [ ] Test on mobile devices
- [ ] Verify file sizes and load times

### Optimization

- [ ] Compress images for web delivery
- [ ] Create WebP versions for modern browsers
- [ ] Generate different sizes for different use cases
- [ ] Add proper alt text for accessibility

---

## 🛠️ Technical Implementation

### File Structure

```
/public/
  og-image.png           (1200x630 - Primary OG image)
  twitter-card.png       (1200x628 - Twitter large card)
  twitter-summary.png    (300x157 - Twitter summary)
  favicon.ico           (Multiple sizes embedded)
  apple-touch-icon.png  (180x180 - iOS home screen)
  social-share.jpg      (1200x630 - JPG fallback)
```

### Meta Tag Updates

Current implementation in `index.html`:

```html
<!-- Open Graph -->
<meta property="og:image" content="https://paperlyte.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:image" content="https://paperlyte.com/twitter-card.png" />
<meta name="twitter:card" content="summary_large_image" />
```

### Testing URLs

**Facebook Sharing Debugger:**

- https://developers.facebook.com/tools/debug/

**Twitter Card Validator:**

- https://cards-dev.twitter.com/validator

**LinkedIn Post Inspector:**

- https://www.linkedin.com/post-inspector/

---

## 📊 Platform-Specific Requirements

### Facebook/Meta Platforms

**Image Requirements:**

- Minimum: 600x315px
- Recommended: 1200x630px
- Aspect ratio: 1.91:1
- Format: JPG or PNG
- File size: Under 8MB

**Best Practices:**

- Avoid text overlay exceeding 20% of image
- Use high-quality images
- Ensure important content is in center 1200x630 area

### Twitter

**Large Image Card:**

- Size: 1200x628px minimum
- Aspect ratio: 1.91:1
- File size: Under 5MB
- Format: JPG, PNG, WebP, GIF

**Summary Card:**

- Size: 300x157px minimum
- Aspect ratio: 1.91:1
- Best for simple logo/icon presentations

### LinkedIn

**Shared Content Image:**

- Size: 1200x627px
- Aspect ratio: 1.91:1
- Format: JPG or PNG
- Focus on professional, clean design

**Company Page Cover:**

- Size: 1128x191px
- Focus on brand messaging and professionalism

---

## 🎯 Content Variations for A/B Testing

### Message Variants

**Speed-Focused:**

- "Start writing in under 3 seconds"
- "The fastest note app ever built"
- "Lightning-fast note-taking"

**Privacy-Focused:**

- "Your notes stay completely private"
- "No tracking, no accounts, no surveillance"
- "Privacy-first note-taking"

**Simplicity-Focused:**

- "Note-taking without the bloat"
- "Just you and your ideas"
- "Beautifully minimal note-taking"

### Visual Variants

**Interface-Heavy:**

- Large screenshot of Paperlyte interface
- Minimal text overlay
- Focus on clean, modern design

**Text-Heavy:**

- Bold typography with key benefits
- Smaller interface elements
- Strong call-to-action

**Hybrid:**

- Balanced text and interface
- Key features highlighted
- Professional presentation

---

## 📅 Production Timeline

### Week 1: Design & Planning

- [ ] Finalize messaging and content strategy
- [ ] Create design templates and style guide
- [ ] Gather all necessary screenshots and assets

### Week 2: Asset Creation

- [ ] Design primary Open Graph image
- [ ] Create Twitter card variations
- [ ] Develop profile and cover images
- [ ] Generate alternative versions

### Week 3: Testing & Optimization

- [ ] Test all images across platforms
- [ ] Optimize file sizes and formats
- [ ] Create fallback versions
- [ ] Implement in website code

### Week 4: Launch Preparation

- [ ] Final quality assurance
- [ ] Upload to production servers
- [ ] Test sharing across all platforms
- [ ] Monitor performance and engagement

---

## 📞 Delivery Requirements

### File Naming Convention

```
paperlyte_social_[platform]_[type]_[size].png

Examples:
paperlyte_social_og_primary_1200x630.png
paperlyte_social_twitter_card_1200x628.png
paperlyte_social_profile_avatar_400x400.png
```

### Delivery Package

- [ ] All images in required sizes
- [ ] WebP and JPG versions for compatibility
- [ ] Updated meta tags code snippet
- [ ] Implementation instructions
- [ ] Testing checklist for each platform

---

**Next Steps:**

1. Create primary Open Graph image with main interface
2. Develop Twitter card with mobile-optimized messaging
3. Test sharing functionality across platforms
4. Implement and verify all meta tags

_Last updated: October 3, 2025_
