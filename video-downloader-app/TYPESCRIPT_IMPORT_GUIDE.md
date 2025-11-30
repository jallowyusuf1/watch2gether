# TypeScript Import/Export Best Practices for Vite + React

## ⚠️ CRITICAL RULES - Follow These to Prevent Module Errors

### Rule #1: Separate Type and Value Imports

**ALWAYS** use `import type` for TypeScript interfaces, types, and type aliases.

#### ✅ CORRECT:
```typescript
// Importing types
import type { MyInterface, MyType } from './types';
import type { ComponentProps } from './component';

// Importing values (components, functions, constants)
import MyComponent from './MyComponent';
import { myFunction, MY_CONSTANT } from './utils';
```

#### ❌ INCORRECT:
```typescript
// DON'T mix types and values in the same import
import MyComponent, { MyInterface } from './component';  // ❌ WRONG
import { myFunction, MyType } from './utils';  // ❌ WRONG
```

### Rule #2: Export Types Properly

When exporting interfaces or types, use `export interface` or `export type`:

#### ✅ CORRECT:
```typescript
// In component file
export interface MyComponentProps {
  name: string;
  age: number;
}

export type MyType = string | number;

// Default export for component
const MyComponent = () => { /* ... */ };
export default MyComponent;
```

#### Then import like this:
```typescript
import MyComponent from './MyComponent';
import type { MyComponentProps, MyType } from './MyComponent';
```

### Rule #3: forwardRef Pattern

When using `forwardRef` with custom ref types:

#### ✅ CORRECT:
```typescript
// In component file (DownloadForm.tsx)
import { forwardRef, useImperativeHandle } from 'react';

export interface DownloadFormRef {
  focusInput: () => void;
}

const DownloadForm = forwardRef<DownloadFormRef>((props, ref) => {
  useImperativeHandle(ref, () => ({
    focusInput: () => { /* ... */ }
  }));

  return <div>...</div>;
});

DownloadForm.displayName = 'DownloadForm';
export default DownloadForm;
```

#### Then import:
```typescript
// In parent component
import DownloadForm from './components/DownloadForm';
import type { DownloadFormRef } from './components/DownloadForm';
import { useRef } from 'react';

const downloadFormRef = useRef<DownloadFormRef>(null);
```

### Rule #4: Common Patterns

#### Pattern 1: Component with Props Interface
```typescript
// Button.tsx
export interface ButtonProps {
  onClick: () => void;
  label: string;
}

const Button = ({ onClick, label }: ButtonProps) => {
  return <button onClick={onClick}>{label}</button>;
};

export default Button;
```

Import:
```typescript
import Button from './Button';
import type { ButtonProps } from './Button';
```

#### Pattern 2: Utility Functions with Types
```typescript
// utils/api.ts
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export const fetchData = async <T,>(url: string): Promise<ApiResponse<T>> => {
  // ...
};
```

Import:
```typescript
import { fetchData } from './utils/api';
import type { ApiResponse } from './utils/api';
```

#### Pattern 3: Context with Types
```typescript
// contexts/UserContext.tsx
export interface UserContextType {
  user: User | null;
  setUser: (user: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
export default UserContext;
```

Import:
```typescript
import UserContext from './contexts/UserContext';
import type { UserContextType } from './contexts/UserContext';
```

## Common Errors and Solutions

### Error: "does not provide an export named 'X'"

**Cause:** Trying to import an interface/type without using `import type`

**Solution:**
```typescript
// ❌ WRONG
import { MyInterface } from './file';

// ✅ CORRECT
import type { MyInterface } from './file';
```

### Error: "Module has no exported member 'X'"

**Cause:** The export doesn't exist or is not properly exported

**Solution:** Ensure the file has:
```typescript
export interface X { ... }
// or
export type X = ...;
```

### Error: Library types (e.g., @dnd-kit, recharts)

**Common Issue:** Third-party libraries also have TypeScript types that need proper importing

**Examples:**
```typescript
// ❌ WRONG - DragEndEvent is a type from @dnd-kit/core
import { DndContext, DragEndEvent } from '@dnd-kit/core';

// ✅ CORRECT
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

// ❌ WRONG - TooltipProps is a type from recharts
import { Tooltip, TooltipProps } from 'recharts';

// ✅ CORRECT
import { Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
```

## Quick Reference

| What You're Importing | How to Import |
|----------------------|---------------|
| React Component (default export) | `import Component from './Component'` |
| Named function/constant | `import { myFunction } from './utils'` |
| Interface/Type | `import type { MyType } from './types'` |
| Component + Its Props Type | `import Component from './Component'`<br/>`import type { ComponentProps } from './Component'` |
| Multiple types | `import type { Type1, Type2 } from './types'` |

## Best Practice Checklist

- [ ] All interfaces use `import type`
- [ ] All type aliases use `import type`
- [ ] Components use default exports
- [ ] Types are exported with `export interface` or `export type`
- [ ] forwardRef refs have separate type exports
- [ ] No mixing of types and values in the same import statement

## Real Examples from This Project

### ✅ Good Example 1: Dashboard.tsx
```typescript
import DownloadForm from '../components/DownloadForm';
import type { DownloadFormRef } from '../components/DownloadForm';
import VideoCard from '../components/VideoCard';
import { storageService } from '../services/storageService';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import type { Video } from '../types';
```

### ✅ Good Example 2: useKeyboardShortcut.ts
```typescript
import { useEffect, useCallback, useRef } from 'react';
import type { ShortcutConfig } from '../utils/keyboardShortcuts';
import { isInputElement, matchesShortcut } from '../utils/keyboardShortcuts';
```

### ❌ Bad Example (causes errors):
```typescript
// DON'T DO THIS
import DownloadForm, { DownloadFormRef } from '../components/DownloadForm';
import { ShortcutConfig, isInputElement } from '../utils/keyboardShortcuts';
```

## Why This Matters

Vite uses ES modules and performs aggressive tree-shaking. TypeScript types are erased at runtime, so they must be imported separately to avoid:
1. Runtime errors about missing exports
2. Incorrect module bundling
3. Type checking failures
4. Build failures in production

## Final Rule

**When in doubt, use `import type` for anything that's not a runtime value (component, function, constant).**

---

Last Updated: 2025-11-30
Project: Video Downloader App
