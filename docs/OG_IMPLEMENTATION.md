# OpenGraph Link Preview Implementation

This document describes the implementation of rich link-preview embeds for Landie landing-page URLs, similar to how Linktree shows branded cards when pasted into Slack, iMessage, Twitter, etc.

## 🎯 Overview

The implementation provides:
- **Dynamic OpenGraph images** generated for each user profile
- **Proper meta tags** for social media sharing 
- **Caching layer** with 60-day TTL in Supabase Storage
- **Cache busting** when profile data changes
- **Copy embed snippet** functionality in the dashboard
- **Fallback handling** for non-existent profiles

## 📁 File Structure

```
src/
├── app/[username]/
│   ├── opengraph-image.tsx    # Next.js OG image API route
│   └── page.tsx               # Updated with proper meta tags
├── lib/
│   ├── og/
│   │   ├── renderOg.ts        # Reusable OG image generator
│   │   └── storage.ts         # Supabase Storage cache service
│   └── clipboard.ts           # Clipboard utilities
├── components/dashboard/sections/
│   └── ProfileSection.tsx     # Updated with share snippet feature
tests/
├── unit/
│   └── og-render.test.ts      # Unit tests for OG functionality
└── e2e/
    └── og-image.spec.ts       # Playwright tests
scripts/
└── setup-og-cache.ts         # Storage bucket initialization
```

## 🚀 Features

### 1. Dynamic OpenGraph Images

**Route:** `app/[username]/opengraph-image.tsx`

- **Canvas:** 1200 × 630 px (OG standard)
- **Background:** Gradient using Landie primary color
- **Layout:** Center-aligned circle avatar (320px diameter)
- **Typography:** User's display name (72px, font-weight 700, white)
- **Tagline:** Optional subheadline (28px, weight 500, 80% opacity)
- **Fallback:** Default Landie logo for missing avatars
- **Content-Type:** `image/png`

### 2. Meta Tags

Updated `[username]/page.tsx` includes:

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="{name} | Landie" />
<meta property="og:description" content="{tagline or 'Personal coaching page'}" />
<meta property="og:image" content="https://landie.co/{username}/opengraph-image" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{name} | Landie" />
<meta name="twitter:description" content="{tagline ...}" />
<meta name="twitter:image" content="https://landie.co/{username}/opengraph-image" />
```

### 3. Caching System

**Storage:** Supabase Storage bucket `og-cache`
- **TTL:** 60 days
- **Format:** `{username}.png`
- **Cache busting:** Automatic when profile data changes
- **Cleanup:** Old files removed on profile updates

### 4. Copy Embed Snippet

**Location:** Dashboard → Profile Section

Button copies HTML snippet:
```html
<a href="https://landie.co/{username}" title="{name} – Landie">
  <img src="https://landie.co/{username}/opengraph-image" width="600" style="border-radius:12px" />
</a>
```

**Tooltip:** "Paste this into your website / newsletter to show a rich preview"

## 🛠 Setup Instructions

### 1. Environment Variables

Ensure these are set:
```env
NEXT_PUBLIC_SITE_URL=https://landie.co
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Initialize Storage Bucket

Run the setup script:
```bash
npm run setup:og-cache
# or
tsx scripts/setup-og-cache.ts
```

This creates the `og-cache` bucket with:
- Public read access
- PNG mime type restriction
- 5MB file size limit

### 3. Test the Implementation

**Unit Tests:**
```bash
npm run test tests/unit/og-render.test.ts
```

**E2E Tests:**
```bash
npm run test:e2e tests/e2e/og-image.spec.ts
```

## 🎨 UI/UX Features

- **Avatar border:** 8px white border for contrast
- **Responsive design:** Works on all device sizes
- **Loading states:** Copy button shows loading/copied states
- **Error handling:** Graceful fallbacks for all edge cases
- **Preview:** Live preview of generated OG image in dashboard

## 🔧 Technical Details

### Cache Busting Logic

The following profile fields trigger cache invalidation:
- `name`
- `username` 
- `profile_image_url`
- `headline`
- `subheadline`

### Performance Optimizations

1. **Edge Runtime:** OG images generated at the edge
2. **Caching:** 60-day browser cache + Supabase Storage cache
3. **Lazy Generation:** Images only generated when first requested
4. **Fallback Images:** Pre-built fallbacks for missing profiles

### Error Handling

- **Missing profiles:** Returns branded Landie fallback image
- **Cache failures:** Logs errors but continues with live generation
- **Network issues:** Graceful degradation with default meta tags

## 🧪 Testing

### Unit Tests

- `renderOg()` function with various data combinations
- `generateEmbedSnippet()` with different usernames
- Edge cases (empty names, missing avatars)

### E2E Tests

- OG image endpoint returns valid PNG
- Meta tags are properly set
- Copy functionality works in dashboard
- Social media preview validation

### Manual Testing

Test the implementation:

1. **Create a test profile** with avatar and bio
2. **Visit** `https://your-domain/username`
3. **Check meta tags** in browser dev tools
4. **Test OG image** at `https://your-domain/username/opengraph-image`
5. **Use social media validators:**
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## 🚨 Troubleshooting

### Common Issues

**OG images not generating:**
- Check environment variables
- Verify Supabase Storage bucket exists
- Check browser console for errors

**Cache not clearing:**
- Verify service role key has storage permissions
- Check if username is properly passed to cache busting logic

**Copy button not working:**
- Ensure HTTPS context (clipboard API requirement)
- Check browser permissions
- Verify clipboard utility imports

### Debugging

Enable debug logging:
```typescript
// In any OG-related file
console.log('OG Debug:', { username, name, avatarUrl })
```

Check Supabase Storage:
```bash
# List files in og-cache bucket
supabase storage ls og-cache
```

## 📈 Analytics & Monitoring

Consider tracking:
- OG image generation frequency
- Cache hit/miss ratios  
- Copy embed snippet usage
- Social sharing metrics

## 🔮 Future Enhancements

Potential improvements:
- **Custom themes** for OG images
- **A/B testing** different layouts
- **Animated GIFs** for premium users
- **Batch generation** for improved performance
- **CDN integration** for global distribution

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review test files for usage examples
3. Check browser console for errors
4. Verify Supabase Storage configuration 