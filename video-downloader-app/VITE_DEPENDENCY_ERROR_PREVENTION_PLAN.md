# Comprehensive Execution Plan: Prevent Vite Dependency Optimization Errors

## Problem Summary
The error `net::ERR_ABORTED 504 (Outdated Optimize Dep)` occurs when Vite's dependency pre-bundling cache becomes stale or corrupted. This happens when:
- Dependencies are updated but cache isn't cleared
- Dev server is running while dependencies change
- Cache becomes corrupted due to interrupted operations
- Multiple dev servers access the same cache simultaneously

## Root Causes
1. **Stale Vite Cache**: `node_modules/.vite` contains outdated pre-bundled dependencies
2. **Cache Corruption**: Interrupted builds or dev server crashes leave corrupted cache
3. **Dependency Mismatch**: Package updates without cache invalidation
4. **Concurrent Access**: Multiple dev servers or processes accessing same cache
5. **Missing Cache Invalidation**: No automatic cache clearing on dependency changes

## Prevention Strategy

### 1. Automated Cache Management
**Implementation:**
- Add pre-dev script to check and clear stale cache
- Add cache validation script
- Add automatic cache clearing on dependency updates

**Files to Update:**
- `package.json` - Add cache management scripts
- `vite.config.ts` - Configure optimizeDeps properly
- `.husky/pre-commit` - Add cache validation

### 2. Enhanced Vite Configuration
**Current State:**
- Basic Vite config without optimizeDeps configuration

**Enhancement:**
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    force: false, // Set to true to force re-optimization
    include: [
      'lucide-react',
      'react',
      'react-dom',
      // ... other critical dependencies
    ],
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
})
```

### 3. Pre-Dev Script Enhancement
**Add to package.json:**
```json
{
  "scripts": {
    "predev": "npm run validate-cache",
    "validate-cache": "node scripts/validate-vite-cache.cjs",
    "dev:clean": "npm run clean:cache && npm run dev",
    "dev:fresh": "npm run clean:full && npm install && npm run dev"
  }
}
```

### 4. Cache Validation Script
**Create:** `scripts/validate-vite-cache.cjs`
```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function validateViteCache() {
  const cacheDir = path.join(process.cwd(), 'node_modules', '.vite');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  
  console.log('🔍 Validating Vite cache...\n');
  
  // Check if cache exists
  if (!fs.existsSync(cacheDir)) {
    console.log('✅ No cache found - will be created on first run');
    return true;
  }
  
  // Check if package-lock.json exists
  if (!fs.existsSync(packageLockPath)) {
    console.log('⚠️  No package-lock.json found - clearing cache');
    execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
    return true;
  }
  
  // Get package-lock.json modification time
  const packageLockStats = fs.statSync(packageLockPath);
  const packageLockTime = packageLockStats.mtime.getTime();
  
  // Get cache directory modification time
  const cacheStats = fs.statSync(cacheDir);
  const cacheTime = cacheStats.mtime.getTime();
  
  // If package-lock.json is newer than cache, cache is stale
  if (packageLockTime > cacheTime) {
    console.log('⚠️  Cache is outdated - clearing...');
    execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
    console.log('✅ Cache cleared successfully');
    return true;
  }
  
  // Check for corrupted cache files
  try {
    const depsDir = path.join(cacheDir, 'deps');
    if (fs.existsSync(depsDir)) {
      const files = fs.readdirSync(depsDir);
      if (files.length === 0) {
        console.log('⚠️  Empty cache directory - clearing...');
        execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
        return true;
      }
    }
  } catch (error) {
    console.log('⚠️  Cache validation error - clearing...');
    execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
    return true;
  }
  
  console.log('✅ Cache is valid');
  return true;
}

validateViteCache();
```

### 5. Pre-Commit Hook Enhancement
**Update:** `.husky/pre-commit`
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running type check..."
npm run type-check || exit 1

echo "🔍 Validating imports..."
npm run validate-imports || exit 1

echo "🔍 Validating Vite cache..."
npm run validate-cache || exit 1

echo "🔍 Running linter..."
npx lint-staged
```

### 6. Post-Install Hook
**Add to package.json:**
```json
{
  "scripts": {
    "postinstall": "npm run validate-cache"
  }
}
```

### 7. Dev Server Startup Check
**Create:** `scripts/check-dev-server.cjs`
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkDevServer() {
  const cacheDir = path.join(process.cwd(), 'node_modules', '.vite');
  
  // Check if another dev server might be running
  try {
    execSync('lsof -ti:5173', { stdio: 'ignore' });
    console.log('⚠️  Port 5173 is in use - another dev server may be running');
    console.log('💡 Tip: Kill the other process or use a different port');
  } catch (error) {
    // Port is free, continue
  }
  
  // Validate cache before starting
  if (fs.existsSync(cacheDir)) {
    const cacheStats = fs.statSync(cacheDir);
    const now = Date.now();
    const cacheAge = now - cacheStats.mtime.getTime();
    
    // If cache is older than 7 days, suggest clearing
    if (cacheAge > 7 * 24 * 60 * 60 * 1000) {
      console.log('⚠️  Cache is older than 7 days');
      console.log('💡 Run "npm run clean:cache" if you experience issues');
    }
  }
}

checkDevServer();
```

### 8. Error Recovery Script
**Create:** `scripts/fix-vite-errors.cjs`
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function fixViteErrors() {
  console.log('🔧 Fixing Vite errors...\n');
  
  const cacheDir = path.join(process.cwd(), 'node_modules', '.vite');
  const distDir = path.join(process.cwd(), 'dist');
  
  // Clear Vite cache
  if (fs.existsSync(cacheDir)) {
    console.log('🗑️  Clearing Vite cache...');
    execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
    console.log('✅ Cache cleared\n');
  }
  
  // Clear dist directory
  if (fs.existsSync(distDir)) {
    console.log('🗑️  Clearing dist directory...');
    execSync(`rm -rf "${distDir}"`, { stdio: 'inherit' });
    console.log('✅ Dist cleared\n');
  }
  
  // Reinstall dependencies if node_modules seems corrupted
  console.log('📦 Verifying dependencies...');
  try {
    execSync('npm ls --depth=0', { stdio: 'ignore' });
    console.log('✅ Dependencies are valid\n');
  } catch (error) {
    console.log('⚠️  Dependency issues detected');
    console.log('💡 Run "npm install" to reinstall dependencies\n');
  }
  
  console.log('✅ Vite error fix complete!');
  console.log('💡 Run "npm run dev" to start the dev server');
}

fixViteErrors();
```

### 9. Package.json Scripts Enhancement
**Update package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "dev:clean": "npm run clean:cache && vite",
    "dev:fresh": "npm run clean:full && npm install && vite",
    "predev": "npm run validate-cache",
    "validate-cache": "node scripts/validate-vite-cache.cjs",
    "fix-vite": "node scripts/fix-vite-errors.cjs",
    "clean": "rm -rf node_modules/.vite dist",
    "clean:cache": "rm -rf node_modules/.vite",
    "clean:full": "rm -rf node_modules node_modules/.vite dist package-lock.json",
    "postinstall": "npm run validate-cache"
  }
}
```

### 10. Documentation Updates
**Add to README.md:**
```markdown
## Troubleshooting Vite Errors

### "Outdated Optimize Dep" Error
If you see `net::ERR_ABORTED 504 (Outdated Optimize Dep)`:

1. **Quick Fix:**
   ```bash
   npm run clean:cache
   npm run dev
   ```

2. **Full Reset:**
   ```bash
   npm run fix-vite
   npm run dev
   ```

3. **Nuclear Option:**
   ```bash
   npm run clean:full
   npm install
   npm run dev
   ```

### Common Issues
- **Stale cache**: Run `npm run clean:cache`
- **Corrupted cache**: Run `npm run fix-vite`
- **Port in use**: Kill process on port 5173 or use different port
- **Dependency mismatch**: Run `npm install` then `npm run clean:cache`
```

### 11. CI/CD Integration
**GitHub Actions Workflow:**
```yaml
name: Build and Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run clean:cache
      - run: npm run type-check
      - run: npm run build
```

### 12. Monitoring and Alerts
- Log cache validation results
- Track cache-related errors
- Alert on frequent cache issues
- Monitor cache size and age

## Implementation Checklist

- [x] Fix immediate error (clear cache)
- [x] Update vite.config.ts with optimizeDeps
- [ ] Create validate-vite-cache.cjs script
- [ ] Create fix-vite-errors.cjs script
- [ ] Create check-dev-server.cjs script
- [ ] Update package.json scripts
- [ ] Update pre-commit hook
- [ ] Add postinstall hook
- [ ] Update README.md with troubleshooting
- [ ] Test all scripts
- [ ] Document cache management process

## Quick Fix Commands

```bash
# Quick cache clear
npm run clean:cache

# Full fix
npm run fix-vite

# Fresh start
npm run dev:fresh

# Validate cache
npm run validate-cache
```

## Success Metrics
- Zero "Outdated Optimize Dep" errors
- Automatic cache validation on dev start
- Cache cleared automatically when stale
- Faster dev server startup
- Reduced manual intervention

## Maintenance
- Review cache validation logic quarterly
- Update dependency list in vite.config.ts as needed
- Monitor cache size and performance
- Adjust cache age thresholds based on usage

## Best Practices
1. **Always clear cache** after dependency updates
2. **Use `dev:clean`** when experiencing issues
3. **Run `validate-cache`** before committing
4. **Check for port conflicts** before starting dev server
5. **Keep dependencies updated** regularly
6. **Use `fix-vite`** script for quick recovery

