'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const candidateConfigPaths = [
  path.join(__dirname, '..', 'lighthouserc.json'),
  path.join(__dirname, '..', '.lighthouserc.json'),
];

const configPath = candidateConfigPaths.find((candidate) => fs.existsSync(candidate));

if (!configPath) {
  throw new Error('Lighthouse configuration file not found. Ensure lighthouserc.json is present at the repository root.');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

test('Lighthouse CI configuration exposes expected sections', () => {
  assert.ok(config.ci, 'ci section should be defined');
  assert.ok(config.ci.collect, 'collect section should be defined');
  assert.ok(config.ci.assert, 'assert section should be defined');
  assert.ok(config.ci.upload, 'upload section should be defined');
});

test('Collect configuration enforces local run fidelity', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const collect = ciConfig.collect;
  assert.ok(collect, 'collect section should be defined');

  assert.ok(Array.isArray(collect.url), 'collect.url should be an array');
  assert.ok(collect.url.length > 0, 'collect.url should contain at least one URL');
  collect.url.forEach((url) => {
    assert.doesNotThrow(() => new URL(url), `collect.url entry "${url}" should be a valid URL`);
    assert.match(url, /^https?:\/\//, 'collect.url entries should be http(s) URLs');
  });
  assert.ok(collect.url.includes('http://localhost:4173/'), 'collect.url should include the dev server endpoint');

  assert.strictEqual(collect.numberOfRuns, 3, 'numberOfRuns should default to three for stability');

  assert.ok(collect.settings, 'collect.settings should be provided');
  assert.strictEqual(typeof collect.settings.chromeFlags, 'string', 'chromeFlags should be a string');
  const flags = collect.settings.chromeFlags.trim().split(/\s+/);
  ['--no-sandbox', '--headless', '--disable-gpu'].forEach((requiredFlag) => {
    assert.ok(flags.includes(requiredFlag), `chromeFlags should include ${requiredFlag}`);
  });
});

test('Assert preset and category thresholds align with expectations', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const assertSection = ciConfig.assert;
  assert.ok(assertSection, 'assert section should be defined');

  assert.strictEqual(assertSection.preset, 'lighthouse:recommended', 'Preset should follow Lighthouse recommended baseline');

  const expectedCategoryScores = {
    'categories:performance': 0.9,
    'categories:accessibility': 1.0,
    'categories:best-practices': 0.95,
    'categories:seo': 0.85,
  };

  Object.entries(expectedCategoryScores).forEach(([categoryKey, expectedScore]) => {
    const assertion = assertSection.assertions[categoryKey];
    assert.ok(assertion, `Assertion for ${categoryKey} must exist`);
    const [level, options] = assertion;
    assert.strictEqual(level, 'error', `${categoryKey} should raise an error when below threshold`);
    assert.ok(options && typeof options.minScore === 'number', `${categoryKey} should declare a numeric minScore`);
    assert.strictEqual(options.minScore, expectedScore, `${categoryKey} should require a minScore of ${expectedScore}`);
  });
});

test('Core Web Vitals thresholds stay within the defined performance budget', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const { assertions } = ciConfig.assert;
  assert.ok(assertions, 'assertions should be defined');

  const expectedCoreMetrics = {
    'first-contentful-paint': 1800,
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'total-blocking-time': 300,
    'speed-index': 3400,
  };

  Object.entries(expectedCoreMetrics).forEach(([metric, expectedThreshold]) => {
    const assertion = assertions[metric];
    assert.ok(assertion, `Assertion for ${metric} must exist`);
    const [level, options] = assertion;
    assert.strictEqual(level, 'error', `${metric} should fail the build when exceeding the budget`);
    assert.ok(options && typeof options.maxNumericValue === 'number', `${metric} should define maxNumericValue`);
    assert.strictEqual(options.maxNumericValue, expectedThreshold, `${metric} should cap at ${expectedThreshold}`);
    assert.ok(options.maxNumericValue > 0, `${metric} maxNumericValue must be positive`);
  });
});

test('Resource utilization warnings guard against bloat', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const { assertions } = ciConfig.assert;
  assert.ok(assertions, 'assertions should be defined');

  const expectedWarnings = {
    'total-byte-weight': 102400,
    'unused-css-rules': 10240,
    'unused-javascript': 20480,
  };

  Object.entries(expectedWarnings).forEach(([metric, expectedThreshold]) => {
    const assertion = assertions[metric];
    assert.ok(assertion, `Assertion for ${metric} must exist`);
    const [level, options] = assertion;
    assert.strictEqual(level, 'warn', `${metric} should emit warnings`);
    assert.ok(options && typeof options.maxNumericValue === 'number', `${metric} should define maxNumericValue`);
    assert.strictEqual(options.maxNumericValue, expectedThreshold, `${metric} should warn at ${expectedThreshold}`);
    assert.ok(options.maxNumericValue > 0, `${metric} maxNumericValue must be positive`);
  });
});

test('Assertion severities remain within supported Lighthouse CI levels', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const { assertions } = ciConfig.assert;
  assert.ok(assertions, 'assertions should be defined');

  const allowedSeverities = new Set(['error', 'warn', 'off']);

  Object.entries(assertions).forEach(([metric, assertion]) => {
    assert.ok(Array.isArray(assertion) && assertion.length >= 1, `${metric} should provide severity and options`);
    const [level] = assertion;
    assert.ok(allowedSeverities.has(level), `${metric} severity ${level} must be one of ${Array.from(allowedSeverities).join(', ')}`);
  });
});

test('Score thresholds stay within valid ranges', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const { assertions } = ciConfig.assert;
  assert.ok(assertions, 'assertions should be defined');

  Object.entries(assertions).forEach(([metric, assertion]) => {
    const [, options] = assertion;
    if (options && typeof options.minScore === 'number') {
      assert.ok(options.minScore >= 0 && options.minScore <= 1, `${metric} minScore should be between 0 and 1`);
    }
    if (options && typeof options.maxNumericValue === 'number') {
      assert.ok(options.maxNumericValue > 0, `${metric} maxNumericValue should be positive`);
    }
  });
});

test('Upload configuration targets temporary public storage', () => {
  const ciConfig = config.ci;
  assert.ok(ciConfig, 'ci section should be defined');
  const upload = ciConfig.upload;
  assert.ok(upload, 'upload section should be defined');
  assert.strictEqual(upload.target, 'temporary-public-storage', 'upload.target should use Lighthouse CI temporary storage');
});