#!/usr/bin/env node

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
    try {
      execSync(`rm -rf "${cacheDir}"`, { stdio: 'inherit' });
      console.log('✅ Cache cleared\n');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error.message);
      return false;
    }
  } else {
    console.log('ℹ️  No cache to clear\n');
  }
  
  // Clear dist directory
  if (fs.existsSync(distDir)) {
    console.log('🗑️  Clearing dist directory...');
    try {
      execSync(`rm -rf "${distDir}"`, { stdio: 'inherit' });
      console.log('✅ Dist cleared\n');
    } catch (error) {
      console.error('❌ Failed to clear dist:', error.message);
      return false;
    }
  } else {
    console.log('ℹ️  No dist directory to clear\n');
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
  return true;
}

if (require.main === module) {
  const success = fixViteErrors();
  process.exit(success ? 0 : 1);
}

module.exports = { fixViteErrors };

