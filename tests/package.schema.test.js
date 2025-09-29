/**
 * Package.json JSON Sanity Tests
 * Testing framework: Node.js built-in test runner (node:test)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');
const packageContent = readFileSync(packagePath, 'utf8');

describe('Package.json JSON Sanity', () => {
  test('is valid JSON', () => {
    assert.doesNotThrow(() => JSON.parse(packageContent));
  });

  test('no trailing commas', () => {
    // Trailing commas before } or ]
    const bad = new RegExp(',\\s*([}\\]])');
    assert(!bad.test(packageContent), 'Found trailing comma before closing brace/bracket');
  });

  test('consistent 2-space indentation (even spaces)', () => {
    const lines = packageContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const match = line.match(/^(\s*)/);
      const leading = (match && match[1] ? match[1] : '').length;
      if (leading > 0) {
        assert.strictEqual(leading % 2, 0, `Line ${i + 1} should use even-space indentation`);
      }
    }
  });

  test('uses double quotes for JSON strings', () => {
    const singleQuote = new RegExp("'[^']*'");
    assert(!singleQuote.test(packageContent), 'JSON should use double quotes, not single quotes');
  });
});