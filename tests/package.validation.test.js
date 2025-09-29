/**
 * Package.json Configuration Validation Tests
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

let packageJson;
try {
  const packageContent = readFileSync(packagePath, 'utf8');
  packageJson = JSON.parse(packageContent);
} catch (error) {
  throw new Error(`Failed to load package.json: ${error.message}`);
}

describe('Package.json Validation Tests', () => {
  describe('Basic Structure and Metadata', () => {
    test('has valid JSON object', () => {
      assert.strictEqual(typeof packageJson, 'object');
      assert(packageJson !== null);
    });

    test('has required core fields', () => {
      const required = ['name', 'version', 'description', 'scripts'];
      required.forEach((f) => {
        assert(packageJson.hasOwnProperty(f), `Missing required field: ${f}`);
        assert(packageJson[f], `Field ${f} should not be empty`);
      });
    });

    test('has valid package name', () => {
      assert.strictEqual(packageJson.name, 'paperlyte');
      assert.match(packageJson.name, /^[a-z0-9-_]+$/);
      assert(packageJson.name.length <= 214);
    });

    test('has semver version', () => {
      assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
      assert.strictEqual(packageJson.version, '0.1.0');
    });

    test('has meaningful description mentioning note-taking', () => {
      assert(packageJson.description.length > 10);
      assert(packageJson.description.toLowerCase().includes('note-taking'));
    });

    test('uses SPDX license', () => {
      assert.strictEqual(packageJson.license, 'MIT');
      assert.match(packageJson.license, /^[A-Z0-9-]+$/);
    });

    test('module type and privacy', () => {
      assert.strictEqual(packageJson.type, 'module');
      assert.strictEqual(packageJson.private, true);
    });
  });

  describe('Repository and URLs', () => {
    test('repository config is valid', () => {
      assert(packageJson.repository);
      assert.strictEqual(packageJson.repository.type, 'git');
      assert(packageJson.repository.url.startsWith('git+https://github.com/'));
      assert(packageJson.repository.url.includes('paperlyte'));
    });

    test('homepage and bugs URLs are valid', () => {
      assert(packageJson.homepage && packageJson.homepage.startsWith('https://'));
      assert(packageJson.bugs && packageJson.bugs.url);
      assert(packageJson.bugs.url.includes('github.com') && packageJson.bugs.url.includes('issues'));
    });

    test('repository URL uses HTTPS, not SSH', () => {
      assert(packageJson.repository.url.startsWith('git+https://'));
      assert(!packageJson.repository.url.includes('git@'));
    });
  });

  describe('Keywords', () => {
    test('has relevant keywords', () => {
      assert(Array.isArray(packageJson.keywords));
      assert(packageJson.keywords.length >= 3);
      ['notes', 'productivity', 'react', 'typescript', 'note-taking'].forEach(k =>
        assert(packageJson.keywords.includes(k), `Missing keyword: ${k}`)
      );
    });

    test('keywords are lowercase strings', () => {
      packageJson.keywords.forEach(k => {
        assert.strictEqual(typeof k, 'string');
        assert.strictEqual(k, k.toLowerCase());
        assert(k.length > 2);
      });
    });
  });

  describe('Scripts', () => {
    test('has essential dev scripts', () => {
      ['dev', 'build', 'preview', 'lint', 'format'].forEach(s =>
        assert(packageJson.scripts[s], `Missing script: ${s}`)
      );
    });

    test('build script compiles TS and runs Vite', () => {
      assert(packageJson.scripts.build.includes('tsc'));
      assert(packageJson.scripts.build.includes('vite build'));
    });

    test('lint/format/security scripts present', () => {
      assert(packageJson.scripts.lint && packageJson.scripts['lint:fix']);
      assert(packageJson.scripts.format && packageJson.scripts['format:check']);
      assert(packageJson.scripts['security-audit'] && packageJson.scripts['security-fix']);
    });

    test('performance and lighthouse scripts present', () => {
      assert(packageJson.scripts['lighthouse:ci']);
      assert(packageJson.scripts['lighthouse:local']);
      assert(packageJson.scripts['performance:audit']);
    });
  });

  describe('Dependencies', () => {
    const versionOk = (v) => /^[\^~]?\d+\.\d+\.\d+/.test(v);

    test('React ecosystem present and compatible', () => {
      assert(packageJson.dependencies.react);
      assert(packageJson.dependencies['react-dom']);
      assert.match(packageJson.dependencies.react, /^\^18\./);
      const major = v => parseInt(v.replace(/^[^\d]*/, '').split('.')[0], 10);
      assert.strictEqual(major(packageJson.dependencies.react), major(packageJson.dependencies['react-dom']));
    });

    test('React Router v7 is used', () => {
      assert(packageJson.dependencies['react-router-dom']);
      assert.match(packageJson.dependencies['react-router-dom'], /^\^7\./, 'Expect React Router DOM v7');
    });

    test('TypeScript toolchain present', () => {
      assert(packageJson.devDependencies.typescript && versionOk(packageJson.devDependencies.typescript));
      assert(packageJson.devDependencies['@typescript-eslint/parser']);
      assert(packageJson.devDependencies['@typescript-eslint/eslint-plugin']);
      assert.strictEqual(
        packageJson.devDependencies['@typescript-eslint/parser'],
        packageJson.devDependencies['@typescript-eslint/eslint-plugin'],
        'TypeScript ESLint packages should match versions'
      );
    });

    test('Build and quality tools present', () => {
      ['vite', '@vitejs/plugin-react', 'eslint', 'prettier', 'husky', 'lint-staged']
        .forEach(d => assert(packageJson.devDependencies[d], `Missing devDependency: ${d}`));
    });

    test('all dependency versions follow expected format', () => {
      [packageJson.dependencies, packageJson.devDependencies].forEach(group => {
        Object.entries(group).forEach(([name, v]) => {
          assert(versionOk(v), `Invalid version for ${name}: ${v}`);
        });
      });
    });
  });

  describe('Engines', () => {
    test('Node and npm engine requirements', () => {
      assert(packageJson.engines && packageJson.engines.node && packageJson.engines.npm);
      assert.match(packageJson.engines.node, />=16\.0\.0/);
      assert.match(packageJson.engines.npm, />=7\.0\.0/);
    });
  });

  describe('Configs', () => {
    test('lint-staged config present and valid', () => {
      const ls = packageJson['lint-staged'];
      assert(ls);
      assert(Array.isArray(ls['*.{ts,tsx}']));
      assert(Array.isArray(ls['*.{json,md,yml,yaml}']));
      assert(ls['*.{ts,tsx}'].some(c => c.includes('eslint --fix')));
      assert(ls['*.{ts,tsx}'].some(c => c.includes('prettier --write')));
    });

    test('author info present', () => {
      assert(packageJson.author && packageJson.author.includes('Paperlyte Team'));
      assert(packageJson.author.includes('hello@paperlyte.com'));
    });
  });

  describe('Security/Secrets hygiene', () => {
    test('no obvious secrets present', () => {
      const body = JSON.stringify(packageJson);
      [/password/i, /secret/i, /token/i, /api[_-]?key/i, /private[_-]?key/i].forEach(regex => {
        assert(!regex.test(body), `Found sensitive-looking token matching ${regex}`);
      });
    });
  });
});