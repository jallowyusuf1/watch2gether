# JSX Validation Plan - Preventing Unterminated JSX Errors

## Problem
JSX syntax errors, particularly "Unterminated JSX contents", can occur when:
1. Missing opening or closing tags
2. Mismatched tag pairs
3. Incorrect nesting of JSX elements
4. Missing closing parentheses in return statements

## Solution: Multi-Layer Validation System

### Layer 1: ESLint Rules (Already Configured)
- `react/jsx-closing-bracket-location`: Ensures consistent bracket placement
- `react/jsx-closing-tag-location`: Validates closing tag positions
- `react/jsx-indent`: Enforces proper indentation
- `react/jsx-indent-props`: Validates prop indentation
- `react/jsx-max-props-per-line`: Limits props per line for readability
- `react/jsx-tag-spacing`: Validates spacing around tags

### Layer 2: TypeScript Compiler
- TypeScript already validates JSX syntax during compilation
- `npm run type-check` should catch JSX errors

### Layer 3: Pre-Commit Hook (To Be Added)
- Run validation before commits
- Prevent broken code from being committed

### Layer 4: Editor Integration
- Use VS Code with ESLint extension
- Real-time error highlighting
- Auto-fix on save

## Implementation Steps

### Step 1: Enhanced ESLint Configuration
Add stricter JSX rules to catch common mistakes:

```javascript
'react/jsx-closing-bracket-location': ['error', 'line-aligned'],
'react/jsx-closing-tag-location': 'error',
'react/jsx-curly-spacing': ['error', { when: 'never' }],
'react/jsx-equals-spacing': ['error', 'never'],
'react/jsx-indent': ['error', 2],
'react/jsx-indent-props': ['error', 2],
'react/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
'react/jsx-tag-spacing': ['error', {
  closingSlash: 'never',
  beforeSelfClosing: 'always',
  afterOpening: 'never',
  beforeClosing: 'never'
}],
```

### Step 2: Pre-Commit Hook
Install husky and lint-staged:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to package.json:
```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "npm run type-check"
  ]
}
```

### Step 3: VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### Step 4: Validation Script
Add to package.json:
```json
"scripts": {
  "validate": "npm run type-check && npm run lint",
  "validate:jsx": "eslint --ext .tsx,.ts src/ --format=compact"
}
```

## Best Practices

1. **Always match opening and closing tags**
   - Count opening `<div>` and closing `</div>` tags
   - Use consistent indentation to visualize nesting

2. **Use JSX formatters**
   - Prettier for automatic formatting
   - ESLint auto-fix for common issues

3. **Component structure template**
   ```tsx
   const Component = () => {
     return (
       <div> {/* Opening tag */}
         {/* Content */}
       </div> {/* Closing tag */}
     );
   };
   ```

4. **Validation checklist before commit**
   - [ ] Run `npm run type-check`
   - [ ] Run `npm run lint`
   - [ ] Check for any ESLint errors
   - [ ] Verify all JSX tags are properly closed

## Error Prevention Checklist

Before saving/committing any JSX file:
- [ ] All opening tags have matching closing tags
- [ ] All parentheses in return statements are balanced
- [ ] All curly braces in JSX expressions are balanced
- [ ] Indentation is consistent and reflects nesting
- [ ] No orphaned closing tags
- [ ] TypeScript compilation passes
- [ ] ESLint validation passes

## Automated Checks

1. **Pre-commit**: Runs automatically via husky
2. **CI/CD**: Add validation step in GitHub Actions
3. **Editor**: Real-time validation in VS Code

## Monitoring

- Track JSX errors in error logs
- Review common patterns causing errors
- Update ESLint rules based on recurring issues
