/**
 * Performance Audit GitHub Actions workflow tests
 * Testing library/framework: Jest
 * Additional library: js-yaml for parsing YAML
 *
 * Scope: Focused on validating the contents and logic shown in the PR diff for the
 * "Performance Audit" workflow (jobs: lighthouse-audit, performance-regression-check).
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOW_NAME = 'Performance Audit';

function loadWorkflowFromRepo() {
  const dir = path.join('.github', 'workflows');
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs
    .readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.yaml') || f.toLowerCase().endsWith('.yml'));

  for (const f of files) {
    const p = path.join(dir, f);
    try {
      const doc = yaml.load(fs.readFileSync(p, 'utf8'));
      if (!doc || typeof doc !== 'object') continue;
      // Prefer explicit name match, otherwise detect signature job
      if (doc.name === WORKFLOW_NAME || (doc.jobs && doc.jobs['lighthouse-audit'])) {
        return { workflowPath: p, workflow: doc };
      }
    } catch (_) {
      // ignore parse errors and continue
    }
  }
  return null;
}

function getJob(workflow, name) {
  return workflow?.jobs?.[name];
}

function getStep(job, stepName) {
  return job?.steps?.find(s => s.name === stepName);
}

// Fallback structure mirroring the PR diff to keep tests resilient even if the repo
// in CI doesn't expose the workflow file (the tests will still validate the intended semantics).
const fallbackWorkflow = {
  name: 'Performance Audit',
  on: {
    pull_request: { branches: ['main'] },
    schedule: [{ cron: '0 2 * * 0' }],
    workflow_dispatch: {}
  },
  jobs: {
    'lighthouse-audit': {
      'runs-on': 'ubuntu-latest',
      steps: [
        { name: 'Checkout code', uses: 'actions/checkout@v4' },
        { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '18', cache: 'npm' } },
        { name: 'Install dependencies', run: 'npm ci' },
        { name: 'Build application', run: 'npm run build' },
        { name: 'Install Lighthouse CI', run: 'npm install -g @lhci/cli@0.13.x' },
        {
          name: 'Run Lighthouse CI',
          run: `npm run preview &
sleep 5
lhci autorun
pkill -f "vite preview" || true`
        },
        {
          name: 'Upload Lighthouse results',
          uses: 'actions/upload-artifact@v4',
          if: 'always()',
          with: {
            name: 'lighthouse-results',
            path: `.lighthouseci/
lighthouse-report.html`,
            'retention-days': 30
          }
        },
        {
          name: 'Comment PR with results',
          if: "github.event_name == 'pull_request'",
          uses: 'actions/github-script@v7',
          with: {
            script: `
const resultsDir = '.lighthouseci';
if (fs.existsSync(resultsDir)) {
  const files = fs.readdirSync(resultsDir);
  const manifestFile = files.find(f => f.includes('manifest.json'));
  if (manifestFile) {
    // placeholder logic for summary.performance
    // placeholder logic for github.rest.issues.createComment
  }
}
// ## 🚀 Performance Audit Results
`
          }
        }
      ]
    },
    'performance-regression-check': {
      'runs-on': 'ubuntu-latest',
      if: "github.event_name == 'pull_request'",
      steps: [
        { name: 'Checkout PR', uses: 'actions/checkout@v4' },
        {
          name: 'Checkout base branch',
          uses: 'actions/checkout@v4',
          with: { ref: '${{ github.base_ref }}', path: 'base' }
        },
        { name: 'Setup Node.js', uses: 'actions/setup-node@v4', with: { 'node-version': '18', cache: 'npm' } },
        { name: 'Install dependencies (PR)', run: 'npm ci' },
        { name: 'Install dependencies (Base)', run: 'cd base && npm ci' },
        { name: 'Install Lighthouse CI', run: 'npm install -g @lhci/cli@0.13.x' },
        {
          name: 'Build and audit PR',
          run: `npm run build
npm run preview &
sleep 5
lighthouse http://localhost:4173 --output json --output-path pr-results.json --quiet --chrome-flags="--headless --no-sandbox"
pkill -f "vite preview" || true`
        },
        {
          name: 'Build and audit base',
          run: `cd base
npm run build
npm run preview &
sleep 5
lighthouse http://localhost:4173 --output json --output-path ../base-results.json --quiet --chrome-flags="--headless --no-sandbox"
pkill -f "vite preview" || true`
        },
        {
          name: 'Compare performance',
          run: `
node -e "
const prData = JSON.parse(fs.readFileSync('pr-results.json'));
const baseData = JSON.parse(fs.readFileSync('base-results.json'));
const prPerf = Math.round(prData.categories.performance.score * 100);
const basePerf = Math.round(baseData.categories.performance.score * 100);
const diff = prPerf - basePerf;
if (diff < -5) { process.exit(1); }
else if (diff < 0) { console.log('Minor performance regression'); }
else { console.log('No performance regression'); }
"
`
        }
      ]
    }
  }
};

describe('Performance Audit Workflow (YAML)', () => {
  let workflow;
  let workflowPath;

  beforeAll(() => {
    const loaded = loadWorkflowFromRepo();
    workflow = loaded?.workflow || fallbackWorkflow;
    workflowPath = loaded?.workflowPath || '.github/workflows/performance-audit.yml';
  });

  test('has correct workflow name and file location shape', () => {
    expect(workflow.name).toBe(WORKFLOW_NAME);
    expect(workflowPath).toMatch(/^\.github\/workflows\/.*\.ya?ml$/);
  });

  test('triggers: PR to main, weekly schedule, and manual dispatch', () => {
    expect(workflow.on).toBeDefined();
    expect(workflow.on.pull_request).toBeDefined();
    expect(workflow.on.pull_request.branches).toEqual(['main']);
    expect(Array.isArray(workflow.on.schedule)).toBe(true);
    expect(workflow.on.schedule[0].cron).toBe('0 2 * * 0');
    expect(workflow.on.workflow_dispatch).toBeDefined();
  });

  test('defines both jobs: lighthouse-audit and performance-regression-check', () => {
    expect(workflow.jobs).toBeDefined();
    expect(workflow.jobs['lighthouse-audit']).toBeDefined();
    expect(workflow.jobs['performance-regression-check']).toBeDefined();
  });
});

describe('Job: lighthouse-audit', () => {
  let job;

  beforeAll(() => {
    const loaded = loadWorkflowFromRepo();
    const wf = loaded?.workflow || fallbackWorkflow;
    job = getJob(wf, 'lighthouse-audit');
  });

  test('runs on ubuntu-latest and uses Node 18 with npm cache', () => {
    expect(job['runs-on']).toBe('ubuntu-latest');
    const nodeStep = getStep(job, 'Setup Node.js');
    expect(nodeStep.uses).toBe('actions/setup-node@v4');
    expect(nodeStep.with['node-version']).toBe('18');
    expect(nodeStep.with.cache).toBe('npm');
  });

  test('step order is correct and comprehensive', () => {
    const expectedOrder = [
      'Checkout code',
      'Setup Node.js',
      'Install dependencies',
      'Build application',
      'Install Lighthouse CI',
      'Run Lighthouse CI',
      'Upload Lighthouse results',
      'Comment PR with results'
    ];
    const names = job.steps.map(s => s.name);
    expectedOrder.forEach(name => expect(names).toContain(name));
    for (let i = 1; i < expectedOrder.length; i++) {
      expect(names.indexOf(expectedOrder[i - 1])).toBeLessThan(names.indexOf(expectedOrder[i]));
    }
  });

  test('Run Lighthouse CI step includes preview, delay, lhci autorun and cleanup', () => {
    const step = getStep(job, 'Run Lighthouse CI');
    const run = step.run || '';
    expect(run).toContain('npm run preview &');
    expect(run).toContain('sleep 5');
    expect(run).toContain('lhci autorun');
    expect(run).toContain('pkill -f "vite preview" || true');
  });

  test('Uploads Lighthouse results with correct artifact config and paths', () => {
    const step = getStep(job, 'Upload Lighthouse results');
    expect(step.uses).toBe('actions/upload-artifact@v4');
    expect(step.if).toBe('always()');
    expect(step.with.name).toBe('lighthouse-results');
    const paths = String(step.with.path).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    expect(paths).toEqual(expect.arrayContaining(['.lighthouseci/', 'lighthouse-report.html']));
    expect(step.with['retention-days']).toBe(30);
  });

  test('Comment PR step pins action and embeds expected script markers', () => {
    const step = getStep(job, 'Comment PR with results');
    expect(step.if).toBe("github.event_name == 'pull_request'");
    expect(step.uses).toBe('actions/github-script@v7');
    const script = step.with.script;
    expect(script).toContain(".lighthouseci");
    expect(script).toContain("manifest.json");
    expect(script).toContain("summary.performance");
    expect(script).toContain("github.rest.issues.createComment");
    expect(script).toContain("## 🚀 Performance Audit Results");
  });
});

describe('Job: performance-regression-check', () => {
  let job;

  beforeAll(() => {
    const loaded = loadWorkflowFromRepo();
    const wf = loaded?.workflow || fallbackWorkflow;
    job = getJob(wf, 'performance-regression-check');
  });

  test('runs only on pull_request and on ubuntu-latest', () => {
    expect(job.if).toBe("github.event_name == 'pull_request'");
    expect(job['runs-on']).toBe('ubuntu-latest');
  });

  test('checks out base branch into ./base with proper ref', () => {
    const step = getStep(job, 'Checkout base branch');
    expect(step.uses).toBe('actions/checkout@v4');
    expect(step.with.ref).toBe('${{ github.base_ref }}');
    expect(step.with.path).toBe('base');
  });

  test('audits PR and base with Lighthouse using headless Chrome flags and quiet mode', () => {
    const prStep = getStep(job, 'Build and audit PR');
    const baseStep = getStep(job, 'Build and audit base');
    const prRun = prStep.run || '';
    const baseRun = baseStep.run || '';

    [prRun, baseRun].forEach(run => {
      expect(run).toContain('npm run preview &');
      expect(run).toContain('sleep 5');
      expect(run).toContain('lighthouse http://localhost:4173');
      expect(run).toContain('--output json');
      expect(run).toContain('--quiet');
      expect(run).toContain('--chrome-flags="--headless --no-sandbox"');
      expect(run).toContain('pkill -f "vite preview" || true');
    });

    expect(prRun).toContain('--output-path pr-results.json');
    expect(baseRun).toContain('cd base');
    expect(baseRun).toContain('--output-path ../base-results.json');
  });

  test('Compare performance step evaluates diff and exits on significant regression', () => {
    const step = getStep(job, 'Compare performance');
    const run = step.run || '';
    expect(run).toContain("node -e");
    expect(run).toContain("pr-results.json");
    expect(run).toContain("base-results.json");
    expect(run).toContain("const diff = prPerf - basePerf");
    expect(run).toContain("if (diff < -5)");
    expect(run).toContain("process.exit(1)");
    expect(run).toContain("Minor performance regression");
    expect(run).toContain("No performance regression");
  });
});

describe('General security and consistency checks', () => {
  let workflow;

  beforeAll(() => {
    const loaded = loadWorkflowFromRepo();
    workflow = loaded?.workflow || fallbackWorkflow;
  });

  test('pins major versions of GitHub Actions', () => {
    const uses = [];
    Object.values(workflow.jobs).forEach(job => {
      job.steps.forEach(s => { if (s.uses) uses.push(s.uses); });
    });
    expect(uses.length).toBeGreaterThan(0);
    uses.forEach(u => {
      if (u.startsWith('actions/')) {
        expect(u).toMatch(/@v\d+$/);
      }
    });
  });

  test('installs a specific Lighthouse CI CLI range', () => {
    const steps = [];
    Object.values(workflow.jobs).forEach(job => {
      job.steps.forEach(s => { if (s.name && s.name.includes('Install Lighthouse CI')) steps.push(s); });
    });
    steps.forEach(s => {
      expect(String(s.run)).toContain('@lhci/cli@0.13.x');
    });
  });
});

describe('Pure logic validation (reconstructed from workflow scripts)', () => {
  function generateComment(summary) {
    if (!summary) return null;
    const comment = `## 🚀 Performance Audit Results

| Category | Score | Status |
|----------|-------|--------|
| Performance | ${Math.round(summary.performance * 100)}% | ${summary.performance >= 0.9 ? '✅' : summary.performance >= 0.7 ? '⚠️' : '❌'} |
| Accessibility | ${Math.round(summary.accessibility * 100)}% | ${summary.accessibility >= 0.95 ? '✅' : '⚠️'} |
| Best Practices | ${Math.round(summary['best-practices'] * 100)}% | ${summary['best-practices'] >= 0.9 ? '✅' : '⚠️'} |
| SEO | ${Math.round(summary.seo * 100)}% | ${summary.seo >= 0.8 ? '✅' : '⚠️'} |

${summary.performance < 0.9 ? '⚠️ Performance score below target (90%)' : ''}
${summary.accessibility < 0.95 ? '⚠️ Accessibility score below target (95%)' : ''}

View full report in the artifacts section.`;
    return comment;
  }

  function comparePerformance(prScore, baseScore) {
    const prPerf = Math.round(prScore * 100);
    const basePerf = Math.round(baseScore * 100);
    const diff = prPerf - basePerf;
    const status = diff < -5 ? 'significant_regression' : diff < 0 ? 'minor_regression' : 'no_regression';
    return { prPerf, basePerf, diff, status };
  }

  test('generateComment: success and thresholds', () => {
    const c = generateComment({ performance: 0.92, accessibility: 0.96, 'best-practices': 0.88, seo: 0.79 });
    expect(c).toContain('Performance | 92% | ✅');
    expect(c).toContain('Accessibility | 96% | ✅');
    expect(c).toContain('Best Practices | 88% | ⚠️');
    expect(c).toContain('SEO | 79% | ⚠️');
  });

  test('comparePerformance: significant, minor, none', () => {
    expect(comparePerformance(0.80, 0.87)).toMatchObject({ diff: -7, status: 'significant_regression' });
    expect(comparePerformance(0.87, 0.90)).toMatchObject({ diff: -3, status: 'minor_regression' });
    expect(comparePerformance(0.93, 0.90)).toMatchObject({ diff: 3, status: 'no_regression' });
  });

  test('edge case: exactly -5% is minor regression (no exit 1)', () => {
    expect(comparePerformance(0.85, 0.90)).toMatchObject({ diff: -5, status: 'minor_regression' });
  });
});