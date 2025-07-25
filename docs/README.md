# Documentation

This directory contains all project documentation organized by category.

## Directory Structure

### `/implementation`
Implementation guides and fix documentation:
- `PRO_FEATURE_FIX.md` - Fixes and solutions for pro feature issues
- `PRO_FEATURE_IMPLEMENTATION.md` - Implementation guide for pro features

### `/performance`
Performance optimization and verification documentation:
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` - Summary of performance optimizations applied
- `PERFORMANCE_VERIFICATION_GUIDE.md` - Guide for verifying performance improvements

### `/guides`
General guides and tutorials (for future documentation)

## Recent Changes

### Dashboard Updates
- **Sidebar Email Display**: Sidebar now always shows the auth email on record (from Supabase Auth) instead of the editable contact_email field
- **Onboarding Redirect**: Users without completed landing pages are automatically redirected from `/dashboard` to `/onboarding`

### Routing Rules
- **`/dashboard`**: Requires authentication AND completed onboarding (landing page exists)
  - Authenticated users without landing pages → redirected to `/onboarding`
  - Unauthenticated users → redirected to `/login`
  - Completed users → dashboard loads normally
- **`/onboarding`**: Requires authentication only
  - Guides users through landing page creation process
  - Redirects to `/dashboard` upon completion

## Other Project Files

### Root Files
- `README.md` - Main project README and setup instructions
- `cursor.md` - Cursor IDE configuration and settings

### Scripts
- `scripts/debug/dashboard-query-verification.js` - Browser console script for verifying dashboard query optimization
- `scripts/performance-test.js` - Performance testing script

### Database
- `supabase/migrations/supabase-optimization.sql` - Dashboard query optimization SQL function

## Contributing to Documentation

When adding new documentation:

1. Choose the appropriate directory based on content type
2. Use clear, descriptive filenames
3. Include proper markdown headers and structure
4. Update this README if adding new categories