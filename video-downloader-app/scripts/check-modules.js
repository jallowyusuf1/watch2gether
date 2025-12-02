#!/usr/bin/env node

/**
 * Check Module Existence
 *
 * This script verifies that all imported packages exist in node_modules:
 * - Parses all import statements
 * - Checks if packages exist in package.json dependencies
 * - Verifies packages are installed in node_modules
 * - Reports missing or uninstalled packages
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const NODE_MODULES_DIR = path.join(__dirname, '..', 'node_modules');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

let errors = [];
let warnings = [];
let packagesChecked = new Set();
let filesChecked = 0;

/**
 * Recursively get all TypeScript/JavaScript files
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Extract package names from import statements
 */
function extractPackages(content, filePath) {
  const packages = new Set();

  // Match: import ... from 'package'
  const importRegex = /import\s+(?:(?:\w+|{[^}]+})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1];

    // Skip relative imports
    if (source.startsWith('.') || source.startsWith('/')) {
      continue;
    }

    // Extract package name (handle scoped packages)
    const packageName = source.startsWith('@')
      ? source.split('/').slice(0, 2).join('/')
      : source.split('/')[0];

    packages.add(packageName);
  }

  return Array.from(packages);
}

/**
 * Check if package exists in package.json
 */
function checkPackageJson(packageName) {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    errors.push({
      package: packageName,
      message: 'package.json not found',
    });
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (!allDependencies[packageName]) {
    errors.push({
      package: packageName,
      message: `Not found in package.json dependencies`,
      suggestion: `Run: npm install ${packageName}`,
    });
    return false;
  }

  return true;
}

/**
 * Check if package exists in node_modules
 */
function checkNodeModules(packageName) {
  const packagePath = path.join(NODE_MODULES_DIR, packageName);

  if (!fs.existsSync(packagePath)) {
    errors.push({
      package: packageName,
      message: `Not installed in node_modules`,
      suggestion: `Run: npm install`,
    });
    return false;
  }

  // Check if package.json exists in the package
  const pkgJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    warnings.push({
      package: packageName,
      message: `Package exists but package.json is missing`,
      suggestion: `Reinstall: npm install ${packageName}`,
    });
    return false;
  }

  return true;
}

/**
 * Verify package version consistency
 */
function checkVersionConsistency(packageName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const expectedVersion = allDependencies[packageName];
    if (!expectedVersion) return;

    const installedPkgPath = path.join(NODE_MODULES_DIR, packageName, 'package.json');
    if (!fs.existsSync(installedPkgPath)) return;

    const installedPkg = JSON.parse(fs.readFileSync(installedPkgPath, 'utf-8'));
    const installedVersion = installedPkg.version;

    // Simple version check (not semver-aware)
    const expectedClean = expectedVersion.replace(/^[\^~]/, '');
    if (installedVersion !== expectedClean && !installedVersion.startsWith(expectedClean.split('.')[0])) {
      warnings.push({
        package: packageName,
        message: `Version mismatch: expected ${expectedVersion}, installed ${installedVersion}`,
        suggestion: `Run: npm install ${packageName}@${expectedVersion}`,
      });
    }
  } catch (error) {
    // Ignore errors in version checking
  }
}

/**
 * Main validation function
 */
function checkModules() {
  console.log('🔍 Checking module existence...\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(NODE_MODULES_DIR)) {
    console.error(`❌ node_modules not found. Run: npm install`);
    process.exit(1);
  }

  const files = getAllFiles(SRC_DIR);

  // Collect all packages used
  files.forEach((filePath) => {
    filesChecked++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const packages = extractPackages(content, filePath);

    packages.forEach((pkg) => packagesChecked.add(pkg));
  });

  console.log(`📊 Checked ${filesChecked} files, found ${packagesChecked.size} unique packages\n`);

  // Validate each package
  packagesChecked.forEach((packageName) => {
    const inPackageJson = checkPackageJson(packageName);
    const inNodeModules = checkNodeModules(packageName);

    if (inPackageJson && inNodeModules) {
      checkVersionConsistency(packageName);
    }
  });

  // Print results
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error) => {
      console.log(`  Package: ${error.package}`);
      console.log(`    ❌ ${error.message}`);
      if (error.suggestion) {
        console.log(`    💡 ${error.suggestion}`);
      }
      console.log();
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning) => {
      console.log(`  Package: ${warning.package}`);
      console.log(`    ⚠️  ${warning.message}`);
      if (warning.suggestion) {
        console.log(`    💡 ${warning.suggestion}`);
      }
      console.log();
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All modules exist and are properly installed!\n');
    console.log('📦 Packages verified:');
    Array.from(packagesChecked).sort().forEach((pkg) => {
      console.log(`  ✓ ${pkg}`);
    });
    console.log();
    process.exit(0);
  } else if (errors.length > 0) {
    console.log('❌ Module check failed!\n');
    console.log('💡 Quick fix: npm install\n');
    process.exit(1);
  } else {
    console.log('⚠️  Module check completed with warnings\n');
    process.exit(0);
  }
}

// Run check
checkModules();
