#!/usr/bin/env node

/**
 * Validate File Paths in Imports
 *
 * This script validates all file paths in import statements:
 * - Ensures all relative imports point to existing files
 * - Checks for correct file extensions
 * - Validates path casing (case-sensitive filesystems)
 * - Reports broken import paths
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

let errors = [];
let warnings = [];
let filesChecked = 0;
let importsChecked = 0;
let pathsValidated = 0;

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
 * Extract import paths from file content
 */
function extractImportPaths(content, filePath) {
  const imports = [];

  // Match: import ... from 'path'
  const importRegex = /import\s+(?:(?:\w+|{[^}]+})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;

    // Only process relative imports
    if (source.startsWith('.') || source.startsWith('/')) {
      imports.push({
        source,
        line: lineNum,
        filePath,
      });
      importsChecked++;
    }
  }

  return imports;
}

/**
 * Validate a single import path
 */
function validateImportPath(importInfo) {
  const { source, line, filePath } = importInfo;
  pathsValidated++;

  const dir = path.dirname(filePath);
  let targetPath = path.resolve(dir, source);

  // List of extensions to try
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts'];
  let found = false;
  let foundPath = null;

  // Try direct file match with extensions
  for (const ext of extensions) {
    const testPath = targetPath + ext;
    if (fs.existsSync(testPath)) {
      const stat = fs.statSync(testPath);
      if (stat.isFile()) {
        found = true;
        foundPath = testPath;
        break;
      }
    }
  }

  // Try index files if directory
  if (!found && fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const indexExtensions = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
      for (const indexFile of indexExtensions) {
        const testPath = path.join(targetPath, indexFile);
        if (fs.existsSync(testPath)) {
          found = true;
          foundPath = testPath;
          break;
        }
      }
    }
  }

  if (!found) {
    errors.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Import path does not exist: "${source}"`,
      resolvedPath: path.relative(process.cwd(), targetPath),
    });
    return;
  }

  // Verify path casing on case-sensitive systems
  validatePathCasing(foundPath, filePath, line, source);

  // Check for common path issues
  checkPathIssues(source, filePath, line);
}

/**
 * Validate path casing (important for case-sensitive filesystems)
 */
function validatePathCasing(foundPath, filePath, line, source) {
  try {
    const resolvedPath = fs.realpathSync(foundPath);
    const expectedPath = foundPath;

    // On case-insensitive systems, this might still work but cause issues on other systems
    if (resolvedPath !== expectedPath && process.platform !== 'darwin') {
      warnings.push({
        file: path.relative(process.cwd(), filePath),
        line,
        message: `Path casing might be incorrect: "${source}"`,
        note: 'This may cause issues on case-sensitive filesystems',
      });
    }
  } catch (error) {
    // Ignore errors in casing validation
  }
}

/**
 * Check for common path issues
 */
function checkPathIssues(source, filePath, line) {
  // Check for unnecessary parent directory traversal
  if (source.includes('../../../')) {
    warnings.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Deep relative path: "${source}"`,
      suggestion: 'Consider using path aliases (@/* imports)',
    });
  }

  // Check for index imports that could be simplified
  if (source.endsWith('/index')) {
    warnings.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Explicit index import: "${source}"`,
      suggestion: 'Can be simplified by removing "/index"',
    });
  }

  // Check for mixing forward and back slashes
  if (source.includes('\\')) {
    errors.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Backslashes in import path: "${source}"`,
      suggestion: 'Use forward slashes (/) instead',
    });
  }
}

/**
 * Check for circular dependencies (basic check)
 */
function checkCircularDependencies(files) {
  const imports = new Map();

  // Build import graph
  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importPaths = extractImportPaths(content, filePath);

    const resolvedImports = importPaths
      .map((imp) => {
        const dir = path.dirname(filePath);
        let targetPath = path.resolve(dir, imp.source);

        // Try to resolve to actual file
        const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const testPath = targetPath + ext;
          if (fs.existsSync(testPath)) {
            return testPath;
          }
        }
        return null;
      })
      .filter(Boolean);

    imports.set(filePath, resolvedImports);
  });

  // Simple circular dependency check (only checks direct A -> B -> A cycles)
  imports.forEach((importList, file) => {
    importList.forEach((importedFile) => {
      const importedFileImports = imports.get(importedFile) || [];
      if (importedFileImports.includes(file)) {
        warnings.push({
          file: path.relative(process.cwd(), file),
          message: `Possible circular dependency with ${path.relative(process.cwd(), importedFile)}`,
          suggestion: 'Review import structure to avoid circular dependencies',
        });
      }
    });
  });
}

/**
 * Main validation function
 */
function validatePaths() {
  console.log('🔍 Validating import paths...\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = getAllFiles(SRC_DIR);

  // Validate import paths
  files.forEach((filePath) => {
    filesChecked++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = extractImportPaths(content, filePath);

    imports.forEach((importInfo) => {
      validateImportPath(importInfo);
    });
  });

  // Check for circular dependencies
  console.log('🔄 Checking for circular dependencies...\n');
  checkCircularDependencies(files);

  // Print results
  console.log(`📊 Checked ${filesChecked} files, ${importsChecked} relative imports, ${pathsValidated} paths validated\n`);

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error) => {
      console.log(`  ${error.file}:${error.line || ''}`);
      console.log(`    ❌ ${error.message}`);
      if (error.resolvedPath) {
        console.log(`    📁 Resolved to: ${error.resolvedPath}`);
      }
      if (error.suggestion) {
        console.log(`    💡 ${error.suggestion}`);
      }
      console.log();
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning) => {
      console.log(`  ${warning.file}${warning.line ? ':' + warning.line : ''}`);
      console.log(`    ⚠️  ${warning.message}`);
      if (warning.note) {
        console.log(`    ℹ️  ${warning.note}`);
      }
      if (warning.suggestion) {
        console.log(`    💡 ${warning.suggestion}`);
      }
      console.log();
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All import paths are valid!\n');
    process.exit(0);
  } else if (errors.length > 0) {
    console.log('❌ Path validation failed!\n');
    process.exit(1);
  } else {
    console.log('⚠️  Path validation completed with warnings\n');
    process.exit(0);
  }
}

// Run validation
validatePaths();
