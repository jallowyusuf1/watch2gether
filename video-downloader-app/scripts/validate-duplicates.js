#!/usr/bin/env node

/**
 * Validate Duplicate Declarations
 *
 * This script detects duplicate declarations in TypeScript/JavaScript files:
 * - Duplicate export declarations
 * - Duplicate function declarations
 * - Duplicate class declarations
 * - Duplicate const/let/var declarations
 * - Duplicate type/interface declarations
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

let errors = [];
let warnings = [];
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
 * Extract export declarations from file content
 */
function extractExportDeclarations(content) {
  const exports = [];

  // Match: export const/function/class/let/var/type/interface NAME
  const patterns = [
    /export\s+(?:const|let|var)\s+(\w+)/g,
    /export\s+function\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+enum\s+(\w+)/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;
      exports.push({ name, line: lineNum, type: 'export' });
    }
  });

  return exports;
}

/**
 * Extract all declarations from file content
 */
function extractDeclarations(content) {
  const declarations = [];

  // Match: const/let/var/function/class/type/interface NAME
  const patterns = [
    { regex: /(?:^|\s)(?:const|let|var)\s+(\w+)/gm, type: 'variable' },
    { regex: /(?:^|\s)function\s+(\w+)/gm, type: 'function' },
    { regex: /(?:^|\s)class\s+(\w+)/gm, type: 'class' },
    { regex: /(?:^|\s)type\s+(\w+)/gm, type: 'type' },
    { regex: /(?:^|\s)interface\s+(\w+)/gm, type: 'interface' },
    { regex: /(?:^|\s)enum\s+(\w+)/gm, type: 'enum' },
  ];

  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;
      declarations.push({ name, line: lineNum, type });
    }
  });

  return declarations;
}

/**
 * Find duplicates in declarations
 */
function findDuplicates(declarations) {
  const seen = new Map();
  const duplicates = [];

  declarations.forEach((decl) => {
    const key = `${decl.name}_${decl.type}`;
    if (seen.has(key)) {
      duplicates.push({
        name: decl.name,
        type: decl.type,
        lines: [seen.get(key).line, decl.line],
      });
    } else {
      seen.set(key, decl);
    }
  });

  return duplicates;
}

/**
 * Check for duplicate declarations in a file
 */
function checkDuplicates(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check export duplicates
  const exports = extractExportDeclarations(content);
  const exportDuplicates = findDuplicates(exports);

  if (exportDuplicates.length > 0) {
    exportDuplicates.forEach((dup) => {
      errors.push({
        file: path.relative(process.cwd(), filePath),
        lines: dup.lines,
        message: `Duplicate export declaration: "${dup.name}"`,
        type: dup.type,
      });
    });
  }

  // Check all declarations for duplicates
  const declarations = extractDeclarations(content);
  const allDuplicates = findDuplicates(declarations);

  if (allDuplicates.length > 0) {
    allDuplicates.forEach((dup) => {
      // Only warn for non-export duplicates (they might be intentional in different scopes)
      warnings.push({
        file: path.relative(process.cwd(), filePath),
        lines: dup.lines,
        message: `Possible duplicate ${dup.type} declaration: "${dup.name}"`,
        note: 'This might be intentional if in different scopes',
      });
    });
  }

  // Check for duplicate imports
  const importRegex = /import\s+{([^}]+)}\s+from/g;
  let match;
  const imports = [];

  while ((match = importRegex.exec(content)) !== null) {
    const importList = match[1].split(',').map((s) => s.trim());
    const lineNum = content.substring(0, match.index).split('\n').length;

    importList.forEach((imp) => {
      imports.push({ name: imp, line: lineNum });
    });
  }

  // Check for duplicate imports in same line
  const importsSeen = new Set();
  imports.forEach((imp) => {
    if (importsSeen.has(imp.name)) {
      warnings.push({
        file: path.relative(process.cwd(), filePath),
        lines: [imp.line],
        message: `Duplicate import: "${imp.name}"`,
        note: 'Remove duplicate import statement',
      });
    }
    importsSeen.add(imp.name);
  });
}

/**
 * Main validation function
 */
function validateDuplicates() {
  console.log('🔍 Checking for duplicate declarations...\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = getAllFiles(SRC_DIR);

  files.forEach((filePath) => {
    filesChecked++;
    checkDuplicates(filePath);
  });

  // Print results
  console.log(`📊 Checked ${filesChecked} files\n`);

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error) => {
      console.log(`  ${error.file}:${error.lines.join(',')}`);
      console.log(`    ❌ ${error.message}`);
      console.log(`    Type: ${error.type}`);
      console.log(`    Lines: ${error.lines.join(', ')}`);
      console.log();
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning) => {
      console.log(`  ${warning.file}:${warning.lines.join(',')}`);
      console.log(`    ⚠️  ${warning.message}`);
      if (warning.note) {
        console.log(`    ℹ️  ${warning.note}`);
      }
      console.log();
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No duplicate declarations found!\n');
    process.exit(0);
  } else if (errors.length > 0) {
    console.log('❌ Duplicate validation failed!\n');
    process.exit(1);
  } else {
    console.log('⚠️  Duplicate validation completed with warnings\n');
    process.exit(0);
  }
}

// Run validation
validateDuplicates();
