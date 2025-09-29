/* eslint-disable */
/* biome-disable */
/* @ts-nocheck */
/**
 * Paperlyte Markdown Documentation Tests
 * Testing library/framework used: Custom minimal test runner (no Jest/Mocha/Vitest detected).
 * Focus: Validates the Paperlyte Launch Checklist markdown structure/content based on PR diff.
 */

const fs = require('fs');
const path = require('path');

// ----------------------- Minimal Test Runner -----------------------
class TestRunner {
  constructor() { this.passed = 0; this.failed = 0; this.currentSuite = []; }
  describe(name, fn) { console.log(`\n📁 ${name}`); this.currentSuite.push(name); fn(); this.currentSuite.pop(); }
  it(name, fn) {
    try { fn(); this.passed++; console.log(`  ✅ ${name}`); }
    catch (e) { this.failed++; console.log(`  ❌ ${name}\n     ↳ ${e.message}`); }
  }
  run() {
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed, ${this.passed + this.failed} total`);
    if (this.failed) process.exit(1);
  }
}
const tr = new TestRunner();

// ----------------------- Assertion Helpers -----------------------
function assertOk(cond, msg = 'Assertion failed') { if (!cond) throw new Error(msg); }
function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertMatch(actual, regex, msg) {
  if (!regex.test(actual)) throw new Error(msg || `Expected value to match ${regex}, got: ${actual.slice(0, 120)}…`);
}
function assertContains(haystack, needle, msg) {
  if (!haystack.includes(needle)) throw new Error(msg || `Expected to contain "${needle}"`);
}
function assertGt(actual, threshold, msg) {
  if (!(actual > threshold)) throw new Error(msg || `Expected ${actual} > ${threshold}`);
}

// ----------------------- Utilities -----------------------
const FIXTURE_DOC_PATH = path.join(process.cwd(), 'test', 'fixtures', 'LAUNCH_CHECKLIST.md');

function candidateDocPaths() {
  return [
    'LAUNCH_CHECKLIST.md',
    'Launch_Checklist.md',
    'docs/LAUNCH_CHECKLIST.md',
    'docs/launch_checklist.md',
    'docs/launch-checklist.md',
    'LAUNCH.md',
    'docs/LAUNCH.md',
    'DOCS/LAUNCH_CHECKLIST.md',
  ].map(p => path.join(process.cwd(), p));
}

function findDocByScan(rootDir) {
  const ignore = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'out', '.husky', '.github', 'test']);
  const queue = [rootDir];
  while (queue.length) {
    const dir = queue.shift();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (ignore.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { queue.push(full); continue; }
      if (e.isFile() && /\.md$/i.test(e.name)) {
        try {
          const text = fs.readFileSync(full, 'utf8');
          if (/^#\s+🚀\s+Paperlyte Launch Checklist/m.test(text)) return full;
        } catch { /* ignore read errors */ }
      }
    }
  }
  return null;
}

function getDocPath() {
  // Prefer obvious candidates
  for (const p of candidateDocPaths()) {
    if (fs.existsSync(p)) return p;
  }
  // Scan repo for a markdown file with expected H1
  const scanned = findDocByScan(process.cwd());
  if (scanned) return scanned;
  // Fallback to fixture from PR diff
  return FIXTURE_DOC_PATH;
}

const MARKDOWN_FILE_PATH = getDocPath();
let markdown = '';
try { markdown = fs.readFileSync(MARKDOWN_FILE_PATH, 'utf8'); }
catch (e) {
  console.error(`Failed to read markdown at ${MARKDOWN_FILE_PATH}: ${e.message}`);
  process.exit(1);
}

// ----------------------- Parsers -----------------------
function extractSections(content) {
  const sections = [];
  const lines = content.split('\n');
  let current = null;
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), content: [], subsections: [] };
    } else if (/^###\s+/.test(line) && current) {
      current.subsections.push(line.replace(/^###\s+/, '').trim());
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function extractChecklistItems(content) {
  const items = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^- \[([ x])\]\s*(.+)$/);
    if (m) items.push({ completed: m[1] === 'x', text: m[2], raw: line });
  }
  return items;
}

function extractLinks(content) {
  const out = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) out.push({ text: m[1], url: m[2] });
  return out;
}

function extractEmails(content) {
  return content.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
}

// ----------------------- Tests -----------------------
console.log('🧪 Running Markdown tests against:', path.relative(process.cwd(), MARKDOWN_FILE_PATH));

tr.describe('File & Heading', () => {
  tr.it('file should exist and be readable', () => {
    assertOk(fs.existsSync(MARKDOWN_FILE_PATH), 'Markdown file not found');
    assertGt(markdown.length, 100, 'Markdown content seems too small');
  });
  tr.it('starts with the expected H1', () => {
    assertMatch(markdown, /^#\s+🚀\s+Paperlyte Launch Checklist/m, 'Missing expected H1');
  });
  tr.it('contains Overview section', () => {
    assertContains(markdown, '## Overview', 'Missing Overview');
  });
  tr.it('uses Unix line endings', () => { assertOk(!/\r\n/.test(markdown), 'Found CRLF line endings'); });
});

tr.describe('Structure & Sections', () => {
  const sections = extractSections(markdown);
  tr.it('has multiple H2 sections', () => assertGt(sections.length, 5, 'Expected >5 H2 sections'));
  tr.it('includes all key sections', () => {
    const titles = sections.map(s => s.title.replace(/[^\w\s]/g, '').toLowerCase());
    const required = [
      'overview',
      '📋 pre-launch checklist',
      '🏆 product hunt launch',
      '📱 app store listings',
      '📚 documentation polish',
      '🎯 marketing & outreach',
      '📊 success metrics',
      '🛠️ team responsibilities',
      '📞 emergency contacts',
      '📝 notes & updates'
    ].map(s => s.replace(/[^\w\s]/g, '').toLowerCase());
    for (const r of required) {
      const found = titles.some(t => t.includes(r));
      assertOk(found, `Missing section: ${r}`);
    }
  });
  tr.it('has separators between major sections', () => {
    const sepCount = (markdown.match(/^---\s*$/gm) || []).length;
    assertGt(sepCount, 5, 'Expected several --- separators');
  });
});

tr.describe('Checklist Items', () => {
  const items = extractChecklistItems(markdown);
  tr.it('contains a substantial number of checklist items', () => assertGt(items.length, 20, 'Expected >20 checklist items'));
  tr.it('includes both completed and incomplete items', () => {
    assertGt(items.filter(i => i.completed).length, 0, 'Need some completed items');
    assertGt(items.filter(i => !i.completed).length, 0, 'Need some remaining items');
  });
  tr.it('items are formatted correctly', () => {
    items.forEach((it, idx) => assertMatch(it.raw, /^- \[([ x])\]\s+.+$/, `Malformed checklist at index ${idx}`));
  });
  tr.it('items have meaningful text', () => {
    items.forEach((it, idx) => assertGt(it.text.trim().length, 5, `Checklist text too short at ${idx}`));
  });
});

tr.describe('Technical References & Metrics', () => {
  tr.it('mentions key tools/platforms', () => {
    ['PostHog', 'Sentry', 'Netlify', 'Vercel', 'Lighthouse', 'GDPR', 'WCAG', 'PWA', 'API']
      .forEach(term => assertContains(markdown, term, `Missing term: ${term}`));
  });
  tr.it('includes Lighthouse performance target with score', () => {
    assertContains(markdown, 'Lighthouse', 'Should reference Lighthouse');
    assertMatch(markdown, /\b\d{2,3}\/100\b/, 'Should include X/100 score');
  });
  tr.it('references security and audits', () => {
    assertMatch(markdown, /security/i, 'Should mention security');
    assertMatch(markdown, /audit/i, 'Should mention audit');
  });
});

tr.describe('Links & Cross-Refs', () => {
  const links = extractLinks(markdown);
  tr.it('contains at least one markdown link', () => assertGt(links.length, 0, 'Expected at least one link'));
  tr.it('references Launch Timeline doc', () => assertContains(markdown, 'LAUNCH_TIMELINE.md', 'Missing LAUNCH_TIMELINE.md reference'));
});

tr.describe('Contacts', () => {
  const emails = extractEmails(markdown);
  tr.it('includes contact email addresses', () => assertGt(emails.length, 0, 'Expected contact emails'));
  tr.it('includes paperlyte.com domains', () => {
    assertGt(emails.filter(e => /@paperlyte\.com$/i.test(e)).length, 0, 'Expected paperlyte.com emails');
  });
  tr.it('covers multiple contact types', () => {
    ['Technical', 'Marketing', 'Support', 'Security'].forEach(label => assertContains(markdown, label, `Missing ${label} contact`));
  });
});

tr.describe('Launch-Day & Timeline', () => {
  tr.it('contains pre-launch timeline', () => assertMatch(markdown, /Pre-Launch\s*\(2-4 weeks before\)/i, 'Missing pre-launch timeline'));
  tr.it('contains launch-day time reference', () => assertContains(markdown, '12:01 AM PST', 'Missing specific launch time'));
  tr.it('contains Product Hunt goals', () => {
    assertContains(markdown, 'Product Hunt', 'Missing Product Hunt references');
    assertMatch(markdown, /(Top \d+|ranking)/i, 'Missing Product Hunt ranking goal');
  });
});

tr.describe('Success Metrics', () => {
  tr.it('defines quantified targets', () => {
    const matches = markdown.match(/\b\d+\+?\s*(users|visitors|signups|shares|stars|hr)\b/gi) || [];
    assertGt(matches.length, 0, 'Expected quantified targets');
  });
  tr.it('mentions retention or active users', () => assertMatch(markdown, /(retention|active users)/i, 'Missing retention metrics'));
});

tr.describe('Formatting & Quality', () => {
  tr.it('uses section emojis for categorization', () => {
    const emojiCount = (markdown.match(/[🚀📋🏆📱📚🎯📊🛠️📞📝]/gu) || []).length;
    assertGt(emojiCount, 8, 'Expected multiple categorization emojis');
  });
  tr.it('has no obvious broken markdown syntax', () => {
    const patterns = [
      /\]\([^)]*$/m,           // unclosed link
      /^\s*#{7,}/m,            // too-deep headings
      /\*\*[^*\n]*$/m,         // unclosed bold
      /__[^_\n]*$/m            // unclosed underline
    ];
    patterns.forEach((re, i) => assertOk(!re.test(markdown), `Broken markdown pattern ${i + 1}`));
  });
});

// Finalize
tr.run();