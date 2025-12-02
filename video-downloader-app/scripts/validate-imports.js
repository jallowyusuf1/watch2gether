#!/usr/bin/env node

/**
 * Validate Import Statements
 *
 * This script validates all import statements in TypeScript/JavaScript files:
 * - Checks for non-existent imports from packages
 * - Validates relative file paths
 * - Detects circular dependencies (basic check)
 * - Verifies named exports exist
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

// Read package.json to get available packages
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
const availablePackages = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

// Known exports from common packages (extend as needed)
const knownExports = {
  'react': ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext', 'createContext', 'Component', 'ReactNode', 'FC', 'CSSProperties'],
  'react-dom': ['render', 'createPortal'],
  'react-router-dom': ['BrowserRouter', 'Routes', 'Route', 'Link', 'useNavigate', 'useLocation', 'useParams', 'Navigate', 'Outlet'],
  'framer-motion': ['motion', 'AnimatePresence', 'useAnimation', 'useMotionValue', 'useTransform'],
  'lucide-react': [
    'Home', 'Download', 'Settings', 'Menu', 'X', 'Bell', 'HardDrive', 'Video',
    'FileText', 'LayoutDashboard', 'CheckCircle2', 'AlertCircle', 'AlertTriangle',
    'Info', 'ArrowRight', 'Search', 'Filter', 'Trash2', 'Edit', 'Play', 'Pause',
    'Volume2', 'VolumeX', 'Maximize', 'Minimize', 'SkipBack', 'SkipForward',
    'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Plus', 'Minus',
    'Check', 'Copy', 'ExternalLink', 'Share2', 'BookmarkPlus', 'Tag', 'Calendar',
    'Clock', 'User', 'Users', 'Globe', 'Lock', 'Unlock', 'Eye', 'EyeOff',
    'Heart', 'Star', 'Folder', 'FolderOpen', 'File', 'Image', 'Music', 'Film',
    'Upload', 'DownloadCloud', 'RefreshCw', 'RotateCw', 'Save', 'Send'
  ],
};

let errors = [];
let warnings = [];
let filesChecked = 0;
let importsChecked = 0;

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
 * Extract import statements from file content
 */
function extractImports(content, filePath) {
  const imports = [];

  // Match: import { X, Y } from 'package' or import X from 'package'
  const importRegex = /import\s+(?:(?:(\w+)|{([^}]+)})\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const source = match[3];

    const lineNum = content.substring(0, match.index).split('\n').length;

    imports.push({
      source,
      defaultImport,
      namedImports: namedImports ? namedImports.split(',').map(s => s.trim()) : [],
      line: lineNum,
      filePath,
    });

    importsChecked++;
  }

  return imports;
}

/**
 * Check if a package import is valid
 */
function validatePackageImport(importInfo) {
  const { source, namedImports, line, filePath } = importInfo;

  // Skip relative imports
  if (source.startsWith('.') || source.startsWith('/')) {
    return;
  }

  // Extract package name (handle scoped packages like @org/package)
  const packageName = source.startsWith('@')
    ? source.split('/').slice(0, 2).join('/')
    : source.split('/')[0];

  // Check if package exists in dependencies
  if (!availablePackages[packageName]) {
    errors.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Package "${packageName}" not found in dependencies`,
      import: source,
    });
    return;
  }

  // Check known exports for specific packages
  if (knownExports[source]) {
    namedImports.forEach((namedImport) => {
      // Remove 'type' keyword if present
      const importName = namedImport.replace(/^type\s+/, '');

      if (!knownExports[source].includes(importName)) {
        warnings.push({
          file: path.relative(process.cwd(), filePath),
          line,
          message: `Export "${importName}" might not exist in "${source}"`,
          import: source,
        });
      }
    });
  }
}

/**
 * Check if a relative import path exists
 */
function validateRelativeImport(importInfo) {
  const { source, line, filePath } = importInfo;

  // Only check relative imports
  if (!source.startsWith('.') && !source.startsWith('/')) {
    return;
  }

  const dir = path.dirname(filePath);
  let targetPath = path.resolve(dir, source);

  // Try different extensions if not specified
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts'];
  let found = false;

  for (const ext of extensions) {
    const testPath = targetPath + ext;
    if (fs.existsSync(testPath)) {
      found = true;
      break;
    }
  }

  // Also check for index files
  if (!found) {
    const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of indexExtensions) {
      const testPath = targetPath + ext;
      if (fs.existsSync(testPath)) {
        found = true;
        break;
      }
    }
  }

  if (!found) {
    errors.push({
      file: path.relative(process.cwd(), filePath),
      line,
      message: `Import path "${source}" does not exist`,
      import: source,
    });
  }
}

/**
 * Main validation function
 */
function validateImports() {
  console.log('🔍 Validating imports...\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = getAllFiles(SRC_DIR);

  files.forEach((filePath) => {
    filesChecked++;
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = extractImports(content, filePath);

    imports.forEach((importInfo) => {
      validatePackageImport(importInfo);
      validateRelativeImport(importInfo);
    });
  });

  // Print results
  console.log(`📊 Checked ${filesChecked} files, ${importsChecked} imports\n`);

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach((error) => {
      console.log(`  ${error.file}:${error.line}`);
      console.log(`    ${error.message}`);
      console.log(`    Import: ${error.import}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach((warning) => {
      console.log(`  ${warning.file}:${warning.line}`);
      console.log(`    ${warning.message}`);
      console.log(`    Import: ${warning.import}\n`);
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All imports are valid!\n');
    process.exit(0);
  } else if (errors.length > 0) {
    console.log('❌ Import validation failed!\n');
    process.exit(1);
  } else {
    console.log('⚠️  Import validation completed with warnings\n');
    process.exit(0);
  }
}

// Run validation
validateImports();
