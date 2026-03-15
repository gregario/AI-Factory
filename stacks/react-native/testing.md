# Testing — React Native

All TypeScript testing principles from `stacks/typescript/testing.md` apply. This file covers React Native-specific testing patterns.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| Jest | Test runner (ships with Expo) |
| React Native Testing Library (RNTL) | Component testing — render, query, interact |
| MSW (Mock Service Worker) | API mocking for integration tests |
| Detox | End-to-end testing on simulators/emulators |

---

## When to Use Which Test Type

### Unit Tests (Jest)

**Use when:**
- Pure functions: utilities, formatters, validators, state transformations
- Zustand/Jotai store logic
- Custom hooks (via `renderHook` from RNTL)
- React Query key factories and query functions (logic only)

```tsx
import { formatPrice } from '@/lib/format';

describe('formatPrice', () => {
  it('formats cents to dollar string', () => {
    expect(formatPrice(1299)).toBe('$12.99');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
});
```

### Component Tests (Jest + RNTL)

**Use when:**
- Testing that a component renders the right content
- Testing user interactions (press, type, swipe)
- Testing conditional rendering and loading/error states
- Testing navigation triggers

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BrewCard } from '@/components/BrewCard';

describe('BrewCard', () => {
  const brew = { id: '1', name: 'Pale Ale', quality: 85 };

  it('displays the brew name and quality', () => {
    render(<BrewCard brew={brew} />);
    expect(screen.getByText('Pale Ale')).toBeTruthy();
    expect(screen.getByText('85')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<BrewCard brew={brew} onPress={onPress} />);
    fireEvent.press(screen.getByText('Pale Ale'));
    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

### Integration Tests (Jest + RNTL + MSW)

**Use when:**
- Testing a screen with data fetching (React Query + component)
- Testing form submission flows
- Testing auth-gated screens

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';
import { HomeScreen } from '@/app/(tabs)/index';
import { TestProviders } from '@/tests/helpers';

describe('HomeScreen', () => {
  it('displays brews from the API', async () => {
    server.use(
      http.get('/api/brews', () =>
        HttpResponse.json([{ id: '1', name: 'IPA', quality: 90 }])
      )
    );

    render(<HomeScreen />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(screen.getByText('IPA')).toBeTruthy();
    });
  });
});
```

### End-to-End Tests (Detox)

**Use when:**
- Critical user flows (sign up, purchase, onboarding)
- Flows that involve native modules (camera, notifications, biometrics)
- Smoke tests for release candidates

**Trade-offs:**
- Slow (minutes per test). Run in CI, not on every change.
- Require a running simulator/emulator.
- Flaky if not carefully written. Use `waitFor` over `sleep`.

```typescript
// e2e/login.test.ts
describe('Login flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('logs in with valid credentials', async () => {
    await element(by.id('email-input')).typeText('user@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

---

## Test Setup

### Jest Configuration

Expo projects use `jest-expo` preset. Configure in `package.json` or `jest.config.ts`:

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterSetup": ["<rootDir>/tests/setup.ts"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ]
  }
}
```

### Test Providers Wrapper

Create a reusable wrapper that includes all providers your app needs:

```tsx
// tests/helpers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### MSW Setup

```tsx
// tests/mocks/server.ts
import { setupServer } from 'msw/native';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// tests/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## What to Test

### Always test
- Screen-level rendering with data (loading, success, error, empty states)
- User interactions that trigger state changes or navigation
- Form validation and submission
- Conditional rendering based on auth/permissions
- Custom hooks that contain business logic
- Platform-specific behaviour if you have `.ios.tsx` / `.android.tsx` splits

### Skip testing
- Third-party component rendering (trust the library)
- Exact styles or layout (too brittle, use visual regression tools if needed)
- Expo SDK modules themselves (trust Expo)
- Navigation wiring defined by file structure (Expo Router handles this)

---

## Querying Best Practices (RNTL)

**Prefer accessible queries.** These match what the user sees and improve accessibility coverage.

```tsx
// Best — matches accessible text
screen.getByText('Submit');
screen.getByRole('button', { name: 'Submit' });

// OK — for inputs and specific elements
screen.getByPlaceholderText('Enter email');
screen.getByLabelText('Email address');

// Last resort — test IDs for elements with no accessible text
screen.getByTestId('avatar-image');
```

**Use `testID` sparingly.** Add `testID` only when there's no accessible query available. Detox also uses `testID` for element selection, so it serves double duty.

---

## Testing Hooks

Use `renderHook` from RNTL for testing custom hooks in isolation:

```tsx
import { renderHook, act } from '@testing-library/react-native';
import { useBrewingStore } from '@/stores/brewing';

describe('useBrewingStore', () => {
  it('increments the step', () => {
    const { result } = renderHook(() => useBrewingStore());
    act(() => result.current.setStep(2));
    expect(result.current.currentStep).toBe(2);
  });
});
```

---

## Test Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Test files | `*.test.tsx` / `*.test.ts` | `BrewCard.test.tsx` |
| Detox tests | `e2e/*.test.ts` | `e2e/login.test.ts` |
| Test helpers | `tests/helpers.tsx` | Providers, factories |
| Mock handlers | `tests/mocks/handlers.ts` | MSW request handlers |

Colocate component tests with their components. Keep E2E tests in a top-level `e2e/` directory.
