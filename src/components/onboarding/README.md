# Onboarding System

A comprehensive onboarding wizard for new users to set up their landing pages.

## Structure

```
src/components/onboarding/
├── OnboardingWizard.tsx    # Main onboarding wizard component
├── OnboardingExample.tsx   # Example/demo component
├── index.ts               # Component exports
└── README.md             # This file

src/lib/supabase/
├── onboarding-service.ts  # Service for handling onboarding data
└── onboarding-utils.ts    # Utilities for checking onboarding status

src/app/
├── onboarding/           # Production onboarding route
│   └── page.tsx
└── dev/onboarding/       # Development demo route
    └── page.tsx
```

## Features

### 5-Step Onboarding Process

1. **User Info** - Display name and username
2. **About/Bio** - Headline, subheadline, and bio
3. **Services** - Up to 3 services with title and description
4. **Highlights** - Up to 3 highlights with title and description
5. **CTA** - Contact form and CTA button configuration

### Technical Features

- **Progress Tracking** - Visual progress bar and step indicators
- **Form Validation** - Real-time validation for each step
- **Data Persistence** - Saves progress after each step
- **Error Handling** - Comprehensive error display and recovery
- **Mobile Responsive** - Optimized for all screen sizes
- **Auth Integration** - Properly handles authentication
- **Database Integration** - Full Supabase integration

## Routes

### Production Route: `/onboarding`
- Full authentication required
- Redirects to dashboard on completion
- Handles auth errors gracefully

### Development Route: `/dev/onboarding`
- Mock user for development
- Interactive demo with reset functionality
- Shows completion summary and data

## Usage

### Basic Usage
```tsx
import { OnboardingWizard } from '@/components/onboarding';

function MyPage() {
  const handleComplete = (data) => {
    console.log('Onboarding completed:', data);
    // Handle completion (redirect, show success, etc.)
  };

  return (
    <OnboardingWizard
      userId="user-id"
      onComplete={handleComplete}
    />
  );
}
```

### With Authentication
```tsx
import { OnboardingWizard } from '@/components/onboarding';
import { useAuth } from '@/lib/supabase/auth-provider';

function OnboardingPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <OnboardingWizard
      userId={user.id}
      onComplete={(data) => {
        // Handle completion
      }}
    />
  );
}
```

### Checking Onboarding Status
```tsx
import { checkOnboardingStatus } from '@/lib/supabase/onboarding-utils';

async function checkUser(userId: string) {
  const { needsOnboarding, reason } = await checkOnboardingStatus(userId);
  
  if (needsOnboarding) {
    // Redirect to onboarding
    console.log('User needs onboarding:', reason);
  }
}
```

## Data Structure

The onboarding wizard collects the following data:

```typescript
interface OnboardingData {
  // Step 1 - User Info
  name: string;
  username: string;
  
  // Step 2 - About/Bio
  headline: string;
  subheadline: string;
  bio: string;
  
  // Step 3 - Services
  servicesCount: number;
  services: Array<{
    title: string;
    description: string;
  }>;
  
  // Step 4 - Highlights
  highlightsCount: number;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  
  // Step 5 - CTA
  wantsContactForm: boolean;
  contactEmail: string;
  wantsCTAButton: boolean;
  ctaText: string;
}
```

## Database Integration

The onboarding system integrates with your Supabase schema:

- **landing_pages** - User profile and CTA data
- **services** - User services (created during onboarding)
- **highlights** - User highlights (created during onboarding)

## Development

### Testing the Onboarding Flow

1. Visit `/dev/onboarding` for development testing
2. Use the interactive demo to test all steps
3. Check console for completion data
4. Reset and test again as needed

### Production Deployment

1. Ensure authentication is properly configured
2. Update redirect paths in `handleOnboardingComplete`
3. Test with real user accounts
4. Monitor error handling and user completion rates

## Customization

### Adding New Steps

1. Add step to `STEPS` array in `OnboardingWizard.tsx`
2. Create new step component following existing patterns
3. Update `OnboardingData` interface
4. Update validation in `onboarding-service.ts`

### Styling

The wizard uses your existing design system:
- Typography classes from `src/typography.css`
- UI components from `src/components/ui/`
- Theme variables from `src/globals.css`

### Form Validation

Validation is handled in `onboarding-service.ts`:
- Real-time validation as user types
- Step-by-step validation before proceeding
- Custom validation rules can be added

## Future Enhancements

- [ ] Skip onboarding for returning users
- [ ] Save draft progress in localStorage
- [ ] Add image upload for profile pictures
- [ ] Integration with AI content generation
- [ ] Analytics tracking for completion rates
- [ ] A/B testing for different onboarding flows