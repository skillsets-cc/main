# Frontend Style Guide
## React/TypeScript Development Standards

---

## Component Pattern

```typescript
import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { colors, spacing } from '@view/theme/tokens';
// Optional: import { motion } from 'framer-motion';

interface ComponentProps {
  title: string;
  variant?: 'primary' | 'secondary';
  onAction?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Component = memo<ComponentProps>(({
  title,
  variant = 'primary',
  onAction,
  children,
  className,
  style
}) => {
  const [state, setState] = useState<string>('');
  const elementRef = useRef<HTMLDivElement>(null);

  const handleAction = useCallback((value: string) => {
    setState(value);
    onAction?.(value);
  }, [onAction]);

  useEffect(() => {
    // Setup
    return () => {
      // Cleanup - ALWAYS clean up subscriptions, timers, listeners
    };
  }, []);

  return (
    <div 
      ref={elementRef} 
      className={className}
      style={{
        ...style,
        // Use inline styles for dynamic values or token-based theming
        borderColor: variant === 'primary' ? colors.accent.primary : colors.border.medium,
        padding: spacing.md,
      }}
    >
      <h2>{title}</h2>
      {children}
    </div>
  );
});

Component.displayName = 'Component';
```

---

## Custom Hook Pattern

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseHookOptions {
  enabled?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseHookReturn {
  data: unknown | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHookTemplate(options: UseHookOptions = {}): UseHookReturn {
  const { enabled = true, onSuccess, onError } = options;
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController>();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await fetch('/api/data', {
        signal: abortControllerRef.current.signal
      });
      const responseData = await result.json();
      setData(responseData);
      onSuccess?.(responseData);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

---

## Zustand Store Pattern

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Item {
  id: string;
  name: string;
}

interface StoreState {
  items: Item[];
  selectedId: string | null;
  loading: boolean;

  setItems: (items: Item[]) => void;
  selectItem: (id: string) => void;
  reset: () => void;
}

const initialState = {
  items: [],
  selectedId: null,
  loading: false,
};

export const useStore = create<StoreState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setItems: (items) => set((state) => {
        state.items = items;
      }),

      selectItem: (id) => set((state) => {
        state.selectedId = id;
      }),

      reset: () => set(initialState),
    }))
  )
);
```

---

## Theme Tokens (`view/theme/tokens.ts`)

Always use theme tokens - never hardcode values:

```typescript
import { colors, spacing, radii, timing, zIndex } from '@view/theme/tokens';

// Colors
colors.accent.primary      // '#4fd1a5' - teal accent
colors.text.primary        // 'rgba(255, 255, 255, 0.85)'
colors.text.secondary      // 'rgba(255, 255, 255, 0.55)'
colors.status.success      // '#5cb85c'
colors.status.error        // '#d9534f'
colors.surface.glass       // 'rgba(255, 255, 255, 0.05)'
colors.border.medium       // 'rgba(255, 255, 255, 0.1)'

// Spacing
spacing.xs  // '4px'
spacing.sm  // '8px'
spacing.md  // '12px'
spacing.lg  // '16px'
spacing.xl  // '20px'

// Radii
radii.sm   // '4px'
radii.md   // '8px'
radii.lg   // '12px'

// Timing (for transitions)
timing.fast    // '0.2s'
timing.normal  // '0.3s'
timing.slow    // '0.6s'

// Z-Index (use these, never hardcode)
zIndex.uiBase       // 10
zIndex.uiFloating   // 20
zIndex.drawer       // 1000
zIndex.settingsModal // 1100
```

For glass effects, use `glassCard` from `view/theme/glassStyles.ts` or CSS class `.glass-surface`.

---

## Logger (`core/utils/logger.ts`)

Use the logger utility - never raw `console.*`:

```typescript
import { logger } from '@core/utils/logger';

logger.debug('[Module] action:', data);   // Dev only
logger.info('[Module] state:', state);    // Dev only
logger.warn('[Module] warning:', msg);    // Always shows
logger.error('[Module] failed:', error);  // Always shows
```

**Pattern**: Always prefix with `[ModuleName]` for traceability.

---

## Animation Variants (Framer Motion)

```typescript
import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};
```

---

## Performance Patterns

### Lazy Loading
```typescript
import { lazy, Suspense } from 'react';

const ProjectsSection = lazy(() => import('./sections/ProjectsSection'));

export function LazyProjectsSection() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <ProjectsSection />
    </Suspense>
  );
}
```

### Memoization
```typescript
import { memo, useMemo } from 'react';

export const ExpensiveComponent = memo(({ data, filter }) => {
  const processedData = useMemo(() => {
    return data
      .filter(item => item.matches(filter))
      .map(item => item.transform())
      .sort((a, b) => a.score - b.score);
  }, [data, filter]);

  return <div>{/* Render processedData */}</div>;
});
```

---

## Resource Cleanup Checklist

| Resource | Cleanup |
|----------|---------|
| `useEffect` | Return cleanup function |
| `addEventListener` | `removeEventListener` |
| `setInterval`/`setTimeout` | `clearInterval`/`clearTimeout` |
| `requestAnimationFrame` | `cancelAnimationFrame` |
| `WebSocket` | `.close()` |
| `AudioContext` | `.close()` |
| `MediaStream` | `.getTracks().forEach(t => t.stop())` |
| `fetch` | `AbortController.abort()` |

---

## Testing Pattern (Vitest)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component } from '../Component';

describe('Component', () => {
  it('renders with required props', () => {
    render(<Component title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const handleAction = vi.fn();
    render(<Component title="Test" onAction={handleAction} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(handleAction).toHaveBeenCalledWith(expect.any(String));
  });
});
```

---

## File Naming

```
Components:     PascalCase.tsx       (Button.tsx, VoiceInput.tsx)
Hooks:          useCamelCase.ts      (useWebSocket.ts, useAudio.ts)
Utilities:      camelCase.ts         (formatDate.ts)
Types:          types.ts             (component.types.ts)
Constants:      camelCase.ts         (timing.ts, layout.ts)
Tests:          [name].test.ts       (Component.test.tsx)
```

---

## Folder Structure

```
[module]/
├── index.ts              # Barrel exports
├── [implementation].ts   # Source files
├── docs_[name]/          # Documentation
│   ├── ARC_[name].md     # Architecture overview
│   └── [file].md         # Per-file docs
├── tests_[name]/         # Tests
│   └── [file].test.ts
└── mocks/                # Mock implementations
    └── Mock[Name].ts
```

---

## Code Review Checklist

- [ ] Props interfaces defined
- [ ] No `any` types (use `unknown` if needed)
- [ ] Memoization for expensive operations
- [ ] Cleanup in useEffect
- [ ] Uses theme tokens (not hardcoded colors/z-index)
- [ ] Uses logger (not console.*)
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] No commented-out code
- [ ] No magic numbers
