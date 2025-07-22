# Testing Setup

This directory contains the test automation setup for the Landie Next.js application.

## Structure

```
tests/
├── e2e/              # End-to-end tests with Playwright
├── unit/             # Unit tests with Vitest + React Testing Library
├── utils/            # Test utilities and helpers
├── mocks/            # MSW mock handlers
└── setup.tsx         # Global test setup
```

## Running Tests

### Unit Tests (Vitest)
```bash
yarn test              # Run all unit tests
yarn test:watch        # Watch mode for development
yarn test:ui           # Interactive UI for running tests
yarn test:cov          # Generate coverage report
```

### E2E Tests (Playwright)
```bash
yarn test:e2e          # Run E2E tests (requires dev server)
yarn test:e2e:ui       # Interactive E2E test runner
yarn test:setup        # Install Playwright browsers
```

### With Supabase Local (Optional)
```bash
yarn test:supabase:start    # Start Supabase local environment
yarn test:supabase:stop     # Stop Supabase local environment
yarn test:supabase:reset    # Reset local database
yarn test:e2e:with-db       # Start Supabase and run E2E tests
```

## Test Environment

### Prerequisites
1. **Node.js** - Required for all tests
2. **Docker** - Only required for Supabase local environment
3. **Playwright browsers** - Run `yarn test:setup` to install

### Environment Variables
The tests use local Supabase configuration by default:
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- Local anon and service role keys (safe for testing)

## Test Coverage

### Current Test Areas
- ✅ **Authentication Flow** - Sign up, sign in, validation
- ✅ **Form Validation** - Email format, password matching
- ✅ **Navigation** - Auth page navigation and redirects
- ✅ **Onboarding Wizard** - Complete 5-step wizard flow
- ✅ **Wizard Validation** - Required fields, step navigation
- ✅ **Landing Page Creation** - Database verification after wizard
- ✅ **Dashboard CRUD** - Services management with full CRUD operations
- ✅ **Services Reordering** - Drag-and-drop with optimistic updates
- ✅ **Dashboard Integration** - Context-based state management testing
- ⏳ **Pro Features** - Analytics access control (Task 5)

### Planned Test Areas
- Landing page generation
- File uploads and image handling
- Responsive design validation
- Performance benchmarks
- API error handling

## Debugging Tests

### Unit Tests
- Use `yarn test:ui` for interactive debugging
- Add `console.log` statements in test files
- Check MSW network mocks in `tests/mocks/handlers.ts`

### E2E Tests
- Use `yarn test:e2e:ui` for step-by-step debugging
- Tests automatically take screenshots on failure
- Trace files are generated for failed tests

### Common Issues
1. **PostCSS errors**: Already handled with test-specific config
2. **Supabase not available**: Tests gracefully handle missing local DB
3. **Port conflicts**: Check if dev server is running on port 3000

## Adding New Tests

### Unit Test Example
```typescript
// tests/unit/component.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### E2E Test Example
```typescript
// tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/feature')
  await page.getByRole('button', { name: 'Action' }).click()
  await expect(page).toHaveURL('/success')
})
```

## Best Practices

1. **Use accessible selectors** - `getByRole`, `getByText` over CSS selectors
2. **Clean up test data** - Always cleanup users/data after tests
3. **Independent tests** - Each test should work in isolation
4. **Descriptive names** - Test names should clearly describe what they verify
5. **Error handling** - Tests should gracefully handle missing dependencies

## Next Steps

See the main project README for the complete test automation roadmap including:
- Task 3: Wizard happy-path testing
- Task 4: Dashboard unit + integration tests  
- Task 5: Analytics Pro gating tests
- CI/CD integration planning