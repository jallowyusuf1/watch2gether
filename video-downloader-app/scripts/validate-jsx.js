#!/usr/bin/env node

/**
 * JSX Structure Validator
 * 
 * This script validates JSX structure by counting opening and closing tags.
 * It helps prevent "Unterminated JSX contents" errors.
 * 
 * Usage: node scripts/validate-jsx.js [file-path]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tags to check (self-closing tags are excluded)
const JSX_TAGS = ['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'form', 'button', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot'];

function validateJSX(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];
  const tagCounts = {};

  // Initialize tag counts
  JSX_TAGS.forEach(tag => {
    tagCounts[tag] = { open: 0, close: 0 };
  });

  // Count tags (simple regex-based approach)
  JSX_TAGS.forEach(tag => {
    // Match opening tags: <tag or <Tag (but not self-closing)
    const openRegex = new RegExp(`<${tag}(?![\\s/>])|<[A-Z][^>]*\\b${tag}\\b`, 'g');
    const openMatches = content.match(openRegex) || [];
    tagCounts[tag].open = openMatches.length;

    // Match closing tags: </tag> or </Tag>
    const closeRegex = new RegExp(`</${tag}>|</[A-Z][^>]*>`, 'g');
    const closeMatches = content.match(closeRegex) || [];
    tagCounts[tag].close = closeMatches.length;
  });

  // Check for mismatches
  let hasErrors = false;
  JSX_TAGS.forEach(tag => {
    const { open, close } = tagCounts[tag];
    if (open !== close) {
      hasErrors = true;
      errors.push({
        tag,
        open,
        close,
        diff: open - close
      });
    }
  });

  if (hasErrors) {
    console.error(`\n❌ JSX Structure Errors in: ${filePath}\n`);
    errors.forEach(({ tag, open, close, diff }) => {
      const status = diff > 0 ? 'MISSING CLOSING' : 'EXTRA CLOSING';
      console.error(`  ${status}: <${tag}> - Open: ${open}, Close: ${close}, Difference: ${Math.abs(diff)}`);
    });
    console.error('\n💡 Tip: Use your editor\'s bracket matching to find the issue.\n');
    return false;
  } else {
    console.log(`✅ JSX structure is valid: ${filePath}`);
    return true;
  }
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/validate-jsx.js <file-path>');
  process.exit(1);
}

const fullPath = path.resolve(filePath);
const isValid = validateJSX(fullPath);

process.exit(isValid ? 0 : 1);

