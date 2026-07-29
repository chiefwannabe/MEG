#!/usr/bin/env node
/**
 * generate-games.js
 * Usage (from project root OR inside offline/): node offline/generate-games.js
 *
 * What it does:
 *  1. Recursively scans offline/ for .html files (skips index.html).
 *  2. Assigns a category from the subfolder name (null for root-level games).
 *  3. Builds a clean games.json with a meta block for the launcher.
 *
 * Adding a new game:
 *  - Root game : copy game.html → offline/
 *  - Categorised: copy game.html → offline/Action/
 *  Then: node offline/generate-games.js  →  commit & push
 */

'use strict';
const fs   = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const OFFLINE_DIR   = __dirname;
const OUTPUT_FILE   = path.join(OFFLINE_DIR, 'games.json');
const EXCLUDE_FILES = new Set(['index.html', 'generate-games.js']);

// Pretty-name overrides: add your games here as slug → title
const TITLE_OVERRIDES = {
  angrybirdsshowdown : 'Angry Birds Showdown',
  chess              : 'Chess',
  clusterrush        : 'Cluster Rush',
  crazycars          : 'Crazy Cars',
  dadish3            : 'Dadish 3',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toTitleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Recursively collect .html files.
 * Returns array of { relPath, category } objects.
 * category = null for files directly in OFFLINE_DIR root.
 * category = folder display name for files in any subfolder.
 */
function collectFiles(dir, baseDir = OFFLINE_DIR, category = null) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Use folder name as category (Title Case)
      const subCategory = toTitleCase(entry.name);
      results.push(...collectFiles(absPath, baseDir, subCategory));
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.html') &&
      !EXCLUDE_FILES.has(entry.name.toLowerCase())
    ) {
      results.push({
        relPath : path.relative(baseDir, absPath).replace(/\\/g, '/'),
        category,
      });
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const rawFiles = collectFiles(OFFLINE_DIR)
  .sort((a, b) => a.relPath.localeCompare(b.relPath));

const games = rawFiles.map((item, idx) => {
  const basename = path.basename(item.relPath, '.html');
  const slug     = basename.toLowerCase();
  const title    = TITLE_OVERRIDES[slug] ?? toTitleCase(basename);

  return {
    id      : idx + 1,
    title,
    slug,
    file    : item.relPath,
    category: item.category,   // null = no category
  };
});

// Derive sorted, unique categories list (null entries excluded)
const categories = [...new Set(games.map(g => g.category).filter(Boolean))].sort();

const output = {
  meta: {
    totalGames  : games.length,
    categories,
    generatedAt : new Date().toISOString(),
  },
  games,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

// Console summary
const colW = Math.max(...games.map(g => g.title.length), 5);
console.log(`\n✅  games.json written — ${games.length} game(s) found\n`);
console.log(`  ${'TITLE'.padEnd(colW)}  CATEGORY   FILE`);
console.log(`  ${'─'.repeat(colW)}  ─────────  ────`);
games.forEach(g => {
  const cat = g.category ? g.category.padEnd(9) : '(root)   ';
  console.log(`  ${g.title.padEnd(colW)}  ${cat}  ${g.file}`);
});
if (categories.length) {
  console.log(`\n  Categories: ${categories.join(', ')}`);
}
console.log();
