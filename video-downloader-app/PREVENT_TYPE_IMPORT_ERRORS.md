# CRITICAL: Preventing TypeScript Type Import Errors

## 🚨 THE GOLDEN RULE 🚨

**ALWAYS use `import type` for TypeScript interfaces, types, and type aliases from ANY library or file.**

## ✅ Error Fixed

The error you encountered:
```
SyntaxError: The requested module '/node_modules/.vite/deps/@dnd-kit_core.js?v=7BB6d6bc' does not provide an export named 'DragEndEvent'
```

Was caused by importing `DragEndEvent` (a TypeScript type) without using `import type`.

## 🛡️ Prevention System Implemented

### 1. ESLint Rules (AUTOMATED)

Updated `.eslintrc.json` with two critical rules that will **automatically catch these errors**:

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "disallowTypeAnnotations": false,
        "fixStyle": "separate-type-imports"
      }
    ],
    "@typescript-eslint/no-import-type-side-effects": "error"
  }
}
```

**What these rules do:**
- `consistent-type-imports`: **REQUIRES** all type imports to use `import type`
- `no-import-type-side-effects`: **PREVENTS** mixing types and values in the same import
- ESLint will show errors in your IDE and prevent commits if configured with pre-commit hooks

### 2. Running ESLint

To check your code for type import issues:

```bash
# Check all files
npm run lint

# Auto-fix issues (will separate type imports automatically)
npm run lint -- --fix
```

### 3. IDE Integration

Most IDEs (VS Code, WebStorm, etc.) will show these errors in real-time if ESLint is enabled.

## 📚 Common Libraries with Type Imports

### @dnd-kit (Drag and Drop)

```typescript
// ❌ WRONG
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';

// ✅ CORRECT
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
```

### Recharts

```typescript
// ❌ WRONG
import { LineChart, TooltipProps } from 'recharts';

// ✅ CORRECT
import { LineChart } from 'recharts';
import type { TooltipProps } from 'recharts';
```

### React Router

```typescript
// ❌ WRONG
import { useNavigate, NavigateFunction } from 'react-router-dom';

// ✅ CORRECT
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
```

### Framer Motion

```typescript
// ❌ WRONG
import { motion, Variants } from 'framer-motion';

// ✅ CORRECT
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
```

## 🔍 How to Identify Types vs Values

### Types (use `import type`):
- Ends with "Type", "Props", "Event", "Options", "Config", "Interface"
- Used only for type annotations, not runtime code
- Examples: `DragEndEvent`, `TooltipProps`, `UserType`, `ConfigOptions`

### Values (regular import):
- Components (React, Vue, etc.)
- Functions
- Constants
- Classes
- Examples: `DndContext`, `motion`, `useNavigate`, `Button`

## 🎯 Quick Fix Process

When you see this error pattern:
```
SyntaxError: The requested module '...' does not provide an export named 'X'
```

1. **Identify**: Is `X` a type or a value?
2. **Check**: Look at how `X` is used in your code
3. **Fix**: If it's used only for type annotations, use `import type`

### Example Fix:

```typescript
// Before (ERROR)
import { DndContext, DragEndEvent } from '@dnd-kit/core';

const handleDragEnd = (event: DragEndEvent) => { // Using as type annotation
  // ...
};

// After (FIXED)
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';  // Separated

const handleDragEnd = (event: DragEndEvent) => {
  // ...
};
```

## 🤖 Automated Enforcement

### Pre-commit Hook (Recommended)

Install husky and lint-staged to prevent bad imports from being committed:

```bash
npm install --save-dev husky lint-staged

# Add to package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "git add"]
  }
}
```

### CI/CD Check

Add to your CI pipeline:

```yaml
- name: Lint Check
  run: npm run lint
```

## 📋 Checklist Before Committing

- [ ] Run `npm run lint` - no type import errors
- [ ] All interfaces/types use `import type`
- [ ] No mixing of types and values in same import statement
- [ ] ESLint shows no errors in IDE

## 🎓 Training Reminder

**Rule of Thumb:**
- If you can't use it in a console.log() or call it as a function → it's a type → use `import type`
- If you CAN use it at runtime → it's a value → use regular import

## 📖 References

- [TYPESCRIPT_IMPORT_GUIDE.md](./TYPESCRIPT_IMPORT_GUIDE.md) - Complete guide
- [TypeScript Handbook - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [@typescript-eslint/consistent-type-imports](https://typescript-eslint.io/rules/consistent-type-imports/)

---

## ✅ Summary

**This error will NEVER happen again because:**

1. ✅ ESLint rules will catch it in your IDE immediately
2. ✅ `npm run lint` will fail if type imports are wrong
3. ✅ Documentation updated with examples
4. ✅ Auto-fix capability with `npm run lint -- --fix`

**Remember:** When in doubt, separate your imports - one line for values, one line for types!
