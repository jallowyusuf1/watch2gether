#!/usr/bin/env node
/**
 * Import Validation Script
 * Validates that all imports in the codebase resolve to existing files
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Match import statements
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"](.+?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Skip node_modules imports (assume they exist if package is installed)
      if (!importPath.startsWith('.')) {
        continue;
      }
      
      imports.push({
        file: filePath,
        importPath: importPath,
        line: lineNumber,
        fullMatch: match[0]
      });
    }
    
    return imports;
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`, 'red');
    return [];
  }
}

function resolveImportPath(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  const projectRoot = path.resolve(process.cwd());
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    let resolved = path.resolve(fromDir, importPath);
    
    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    
    for (const ext of extensions) {
      const fullPath = resolved + ext;
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          return fullPath;
        }
        if (stat.isDirectory()) {
          // Check for index file in directory
          const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
          for (const indexFile of indexFiles) {
            const indexPath = path.join(fullPath, indexFile);
            if (fs.existsSync(indexPath)) {
              return indexPath;
            }
          }
        }
      }
    }
    
    // Check if it's a directory (for barrel exports)
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
      for (const indexFile of indexFiles) {
        const indexPath = path.join(resolved, indexFile);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }
    
    return null;
  }
  
  // Handle absolute imports (from src/)
  if (importPath.startsWith('src/') || importPath.startsWith('/src/')) {
    const srcPath = path.join(projectRoot, importPath.replace(/^\/?src\//, 'src/'));
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    
    for (const ext of extensions) {
      const fullPath = srcPath + ext;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  
  // Node modules imports - assume they exist
  return 'node_modules';
}

function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip certain directories
      if (!file.startsWith('.') && 
          file !== 'node_modules' && 
          file !== 'dist' && 
          file !== 'build' &&
          file !== '.git') {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (stat.isFile()) {
      // Only check TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

function validateImports() {
  log('\n🔍 Validating imports...\n', 'blue');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    log(`❌ Source directory not found: ${srcDir}`, 'red');
    process.exit(1);
  }
  
  const files = getAllSourceFiles(srcDir);
  const errors = [];
  const warnings = [];
  let totalImports = 0;
  
  log(`Found ${files.length} source files to check\n`, 'blue');
  
  for (const file of files) {
    const imports = findImports(file);
    totalImports += imports.length;
    
    for (const imp of imports) {
      const resolved = resolveImportPath(imp.importPath, file);
      
      if (!resolved) {
        const relativeFile = path.relative(process.cwd(), imp.file);
        errors.push({
          file: relativeFile,
          line: imp.line,
          import: imp.importPath,
          message: `Cannot resolve import: ${imp.importPath}`
        });
      } else if (resolved === 'node_modules') {
        // Could add node_modules validation here if needed
      }
    }
  }
  
  // Report results
  log(`\n📊 Validation Results:`, 'blue');
  log(`   Total files checked: ${files.length}`, 'blue');
  log(`   Total imports found: ${totalImports}`, 'blue');
  log(`   Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');
  log(`   Warnings: ${warnings.length}`, warnings.length > 0 ? 'yellow' : 'green');
  
  if (errors.length > 0) {
    log('\n❌ Import validation failed!\n', 'red');
    
    // Group errors by file
    const errorsByFile = {};
    errors.forEach(err => {
      if (!errorsByFile[err.file]) {
        errorsByFile[err.file] = [];
      }
      errorsByFile[err.file].push(err);
    });
    
    // Display errors
    Object.keys(errorsByFile).forEach(file => {
      log(`\n📄 ${file}:`, 'red');
      errorsByFile[file].forEach(err => {
        log(`   Line ${err.line}: ${err.import}`, 'red');
        log(`   → ${err.message}`, 'red');
      });
    });
    
    log('\n💡 Tips to fix:', 'yellow');
    log('   1. Check if the imported file exists', 'yellow');
    log('   2. Verify the import path is correct', 'yellow');
    log('   3. Check file extensions (.ts, .tsx, .js, .jsx)', 'yellow');
    log('   4. Ensure index files exist for directory imports', 'yellow');
    log('   5. Remove unused imports with: npm run cleanup-imports\n', 'yellow');
    
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    warnings.forEach(warn => {
      log(`   ${warn}`, 'yellow');
    });
  }
  
  log('\n✅ All imports are valid!', 'green');
  log('');
}

// Run validation
try {
  validateImports();
} catch (error) {
  log(`\n❌ Validation script error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
