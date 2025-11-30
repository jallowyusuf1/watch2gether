# JSX Structure Guide - Preventing Syntax Errors

## Common JSX Errors and How to Prevent Them

### 1. Unterminated JSX Contents
**Error**: `Unterminated JSX contents. (line:column)`

**Causes**:
- Missing closing tags (`</div>`, `</section>`, etc.)
- Mismatched opening/closing tags
- Unclosed JSX expressions `{}`
- Missing closing parentheses in return statements

**Prevention Checklist**:
- ✅ Always match opening tags with closing tags
- ✅ Use proper indentation to track nested elements
- ✅ Count opening and closing tags before committing
- ✅ Use your editor's bracket matching feature
- ✅ Run linter before committing

### 2. Component Structure Template

```tsx
const MyComponent = () => {
  // State and hooks
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // ...
  }, []);
  
  // Handlers
  const handleClick = () => {
    // ...
  };
  
  // Return statement - ALWAYS check structure
  return (
    <div> {/* Main container - OPEN */}
      {/* Background */}
      <div> {/* Background container - OPEN */}
        {/* Background content */}
      </div> {/* Background container - CLOSE */}
      
      {/* Content */}
      <div> {/* Content container - OPEN */}
        {/* Header */}
        <div> {/* Header - OPEN */}
          {/* Header content */}
        </div> {/* Header - CLOSE */}
        
        {/* Main content */}
        <section> {/* Section - OPEN */}
          {/* Section content */}
        </section> {/* Section - CLOSE */}
      </div> {/* Content container - CLOSE */}
      
      {/* Modals */}
      <Modal /> {/* Self-closing */}
    </div> {/* Main container - CLOSE */}
  );
};
```

### 3. Tag Matching Rules

1. **Every opening tag must have a closing tag** (except self-closing)
   ```tsx
   ✅ <div>...</div>
   ✅ <Component />
   ❌ <div>...</div> // Missing closing tag
   ```

2. **Nested tags must close in reverse order**
   ```tsx
   ✅ <div><span>...</span></div>
   ❌ <div><span>...</div></span>
   ```

3. **Return statements must have matching parentheses**
   ```tsx
   ✅ return (<div>...</div>);
   ❌ return (<div>...</div>; // Missing closing paren
   ```

### 4. Pre-Commit Checklist

Before committing any JSX file:

- [ ] Count all opening `<div>`, `<section>`, `<article>`, etc.
- [ ] Count all closing `</div>`, `</section>`, `</article>`, etc.
- [ ] Verify they match
- [ ] Check that return statement has matching `()` and `{}`
- [ ] Run `npm run lint` or `npm run build`
- [ ] Verify no TypeScript/ESLint errors

### 5. Editor Configuration

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.matchBrackets": "always",
  "editor.formatOnSave": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### 6. Automated Checks

**Add to `package.json` scripts**:
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run lint && npm run type-check"
  }
}
```

### 7. Common Patterns to Watch

**Pattern 1: Conditional Rendering**
```tsx
// ✅ Good
{condition && (
  <div>
    <p>Content</p>
  </div>
)}

// ❌ Bad - Missing closing paren
{condition && (
  <div>
    <p>Content</p>
  </div>
}
```

**Pattern 2: Multiple Modals**
```tsx
// ✅ Good - Each modal properly closed
<Modal1 isOpen={...} />
<Modal2 isOpen={...} />
</div> // Close main container

// ❌ Bad - Missing closing tag
<Modal1 isOpen={...} />
<Modal2 isOpen={...} />
// Missing </div>
```

**Pattern 3: Nested Containers**
```tsx
// ✅ Good - Clear structure
<div> {/* Main */}
  <div> {/* Background */}
  </div>
  <div> {/* Content */}
    <div> {/* Header */}
    </div>
  </div>
</div>

// ❌ Bad - Missing closing tag
<div> {/* Main */}
  <div> {/* Background */}
  </div>
  <div> {/* Content */}
    <div> {/* Header */}
    </div>
  // Missing </div> for Content
</div>
```

### 8. Debugging Tips

1. **Use bracket matching**: Click on an opening tag to see its closing tag
2. **Use find/replace**: Search for `<div` and `</div` to count them
3. **Comment out sections**: Temporarily comment out sections to isolate the error
4. **Check the error line**: The error usually points to where the parser got confused, not necessarily where the actual error is

### 9. Component Review Checklist

When reviewing JSX components:

1. ✅ All tags properly closed
2. ✅ Return statement properly structured
3. ✅ Conditional rendering has proper parentheses
4. ✅ Props are correctly typed
5. ✅ No unused variables or imports
6. ✅ Proper indentation for readability
7. ✅ Comments don't break JSX structure

