#!/usr/bin/env node

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
    try {
      execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
      console.log('✅ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      return false;
    }
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
    console.log('⚠️  Cache is outdated (package-lock.json is newer) - clearing...');
    try {
      execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
      console.log('✅ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      return false;
    }
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
        console.log('✅ Cache cleared successfully');
        return true;
      }
      
      // Check for common corrupted files
      const corruptedFiles = files.filter(file => {
        const filePath = path.join(depsDir, file);
        try {
          const stats = fs.statSync(filePath);
          return stats.size === 0; // Empty files are likely corrupted
        } catch {
          return true; // Files that can't be stat'd are likely corrupted
        }
      });
      
      if (corruptedFiles.length > 0) {
        console.log(`⚠️  Found ${corruptedFiles.length} potentially corrupted cache files - clearing...`);
        execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
        console.log('✅ Cache cleared successfully');
        return true;
      }
    }
  } catch (error) {
    console.log('⚠️  Cache validation error - clearing...');
    try {
      execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
      console.log('✅ Cache cleared successfully');
    } catch (clearError) {
      console.error('❌ Failed to clear cache:', clearError.message);
      return false;
    }
    return true;
  }
  
  console.log('✅ Cache is valid');
  return true;
}

if (require.main === module) {
  const success = validateViteCache();
  process.exit(success ? 0 : 1);
}

module.exports = { validateViteCache };

