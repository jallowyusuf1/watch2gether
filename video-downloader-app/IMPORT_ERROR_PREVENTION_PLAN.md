# Import Error Prevention Plan

## Problem
The application was failing with: `Failed to resolve import "./hooks/useShortcuts" from "src/App.tsx". Does the file exist?`

## Root Cause
- Missing file: `src/hooks/useShortcuts.ts` was imported but never existed
- Missing component: `src/components/ShortcutManager.tsx` was imported but didn't exist
- Unused imports were left in the codebase after refactoring

## Immediate Fix Applied
1. ✅ Removed import of non-existent `ShortcutsProvider` from `./hooks/useShortcuts`
2. ✅ Removed import of non-existent `ShortcutManager` component
3. ✅ Removed usage of `ShortcutsProvider` wrapper in App.tsx
4. ✅ Cleaned up component structure

## Comprehensive Prevention Strategy

### 1. Pre-Commit Validation Script
Create a script that validates all imports before commits:

**File: `scripts/validate-imports.js`**
```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      file: filePath,
      importPath: match[1],
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return imports;
}

function resolveImportPath(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(fromDir, importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // Check if it's a directory with package.json
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const packagePath = path.join(resolved, 'package.json');
      if (fs.existsSync(packagePath)) {
        return resolved;
      }
    }
    
    return null;
  }
  
  // Handle node_modules imports (assume they exist if package is installed)
  return 'node_modules';
}

function validateImports() {
  const srcDir = path.join(process.cwd(), 'src');
  const files = [];
  
  function walkDir(dir) {
    const entries = fs.readDirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(srcDir);
  
  const errors = [];
  
  for (const file of files) {
    const imports = findImports(file);
    for (const imp of imports) {
      const resolved = resolveImportPath(imp.importPath, file);
      if (!resolved) {
        errors.push({
          file: path.relative(process.cwd(), imp.file),
          line: imp.line,
          import: imp.importPath,
          message: `Cannot resolve import: ${imp.importPath}`
        });
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('\n❌ Import validation failed!\n');
    errors.forEach(err => {
      console.error(`  ${err.file}:${err.line}`);
      console.error(`    → ${err.import}`);
      console.error(`    ${err.message}\n`);
    });
    process.exit(1);
  }
  
  console.log('✅ All imports are valid!');
}

validateImports();
```

### 2. TypeScript Configuration
Ensure strict import checking:

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUnusedImports": true,
    "skipLibCheck": false
  }
}
```

### 3. ESLint Rules
Add ESLint rules to catch unused imports:

**Update `.eslintrc.js`:**
```javascript
module.exports = {
  rules: {
    'no-unused-vars': ['error', { 
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-unused-vars': ['error', {
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_'
    }],
    'import/no-unresolved': 'error',
    'import/no-unused-modules': ['error', {
      unusedExports: true
    }]
  }
};
```

### 4. Pre-Commit Hook
Set up Husky to run validation before commits:

**File: `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validating imports..."
node scripts/validate-imports.js

echo "🔍 Running linter..."
npm run lint

echo "🔍 Type checking..."
npm run type-check
```

### 5. CI/CD Validation
Add to GitHub Actions or CI pipeline:

**File: `.github/workflows/validate.yml`:**
```yaml
name: Validate Imports

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: node scripts/validate-imports.js
      - run: npm run lint
      - run: npm run type-check
```

### 6. VSCode Extension Recommendations
Add to `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 7. Automated Import Cleanup Script
Create a script to find and remove unused imports:

**File: `scripts/cleanup-imports.js`**
```javascript
#!/usr/bin/env node
// This script uses eslint --fix to automatically remove unused imports
const { execSync } = require('child_process');

try {
  console.log('🧹 Cleaning up unused imports...');
  execSync('npx eslint --fix "src/**/*.{ts,tsx}"', { stdio: 'inherit' });
  console.log('✅ Import cleanup complete!');
} catch (error) {
  console.error('❌ Import cleanup failed:', error.message);
  process.exit(1);
}
```

### 8. Development Workflow
1. **Before committing:**
   - Run `npm run validate-imports`
   - Run `npm run lint`
   - Run `npm run type-check`

2. **When adding new files:**
   - Always create the file before importing it
   - Use TypeScript path aliases for cleaner imports
   - Export from index files when appropriate

3. **When removing files:**
   - Search for all imports of that file first
   - Remove all imports before deleting the file
   - Run validation after deletion

### 9. File Structure Best Practices
- Use index.ts files for cleaner imports
- Group related files in directories
- Use consistent naming conventions
- Document exported functions/components

### 10. Monitoring & Alerts
- Set up build-time checks
- Add error boundaries for runtime import errors
- Log missing imports in development mode

## Implementation Checklist

- [ ] Create `scripts/validate-imports.js`
- [ ] Update `tsconfig.json` with strict settings
- [ ] Update `.eslintrc.js` with import rules
- [ ] Set up Husky pre-commit hook
- [ ] Add CI/CD validation
- [ ] Create cleanup script
- [ ] Update package.json scripts
- [ ] Document workflow in README
- [ ] Test all scripts
- [ ] Train team on new workflow

## Package.json Scripts to Add

```json
{
  "scripts": {
    "validate-imports": "node scripts/validate-imports.js",
    "cleanup-imports": "node scripts/cleanup-imports.js",
    "pre-commit": "npm run validate-imports && npm run lint && npm run type-check",
    "type-check": "tsc --noEmit"
  }
}
```

## Success Criteria

✅ No import errors in console
✅ All imports resolve correctly
✅ Unused imports are automatically removed
✅ Pre-commit hooks prevent bad commits
✅ CI/CD catches errors before merge
✅ Zero tolerance for missing imports

## Maintenance

- Review and update validation script monthly
- Keep ESLint and TypeScript versions updated
- Monitor false positives in validation
- Adjust rules as codebase evolves

