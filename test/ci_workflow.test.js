/*
  Testing framework: Vitest
  How to run: npm test
*/
const fs = require('fs');
const yaml = require('js-yaml');

describe('CI Workflow Configuration (.github/workflows/ci.yml)', () => {
  let workflowContent;
  let workflowConfig;
  const workflowPath = '.github/workflows/ci.yml';

  beforeAll(() => {
    workflowContent = fs.readFileSync(workflowPath, 'utf8');
    workflowConfig = yaml.load(workflowContent);
  });

  describe('Basic Structure', () => {
    test('parses as valid YAML', () => {
      expect(() => yaml.load(workflowContent)).not.toThrow();
    });

    test('has required top-level keys', () => {
      expect(workflowConfig).toMatchObject({
        name: expect.any(String),
        on: expect.any(Object),
        jobs: expect.any(Object),
      });
    });

    test('workflow has expected name', () => {
      expect(workflowConfig.name).toBe('CI');
    });
  });

  describe('Triggers', () => {
    test('push to main and develop', () => {
      expect(workflowConfig.on).toHaveProperty('push');
      expect(workflowConfig.on.push.branches).toEqual(['main', 'develop']);
    });

    test('pull_request to main and develop', () => {
      expect(workflowConfig.on).toHaveProperty('pull_request');
      expect(workflowConfig.on.pull_request.branches).toEqual(['main', 'develop']);
    });

    test('no unexpected trigger events', () => {
      const allowed = ['push', 'pull_request'];
      expect(Object.keys(workflowConfig.on)).toEqual(allowed);
    });
  });

  describe('Jobs Presence and Names', () => {
    const expected = {
      'lint-and-format': 'Lint and Format Check',
      'type-check': 'TypeScript Type Check',
      'build': 'Build Application',
      'security-audit': 'Security Audit',
    };

    test('has exactly expected jobs', () => {
      expect(Object.keys(workflowConfig.jobs).sort()).toEqual(Object.keys(expected).sort());
    });

    test('each job has the correct display name', () => {
      for (const [jobKey, jobName] of Object.entries(expected)) {
        expect(workflowConfig.jobs[jobKey].name).toBe(jobName);
      }
    });

    test('all jobs use ubuntu-latest', () => {
      for (const job of Object.values(workflowConfig.jobs)) {
        expect(job['runs-on']).toBe('ubuntu-latest');
      }
    });
  });

  describe('Common Steps Order', () => {
    const jobs = ['lint-and-format', 'type-check', 'build', 'security-audit'];

    test.each(jobs)('%s has checkout -> setup-node -> npm ci as first 3 steps', (jobKey) => {
      const steps = workflowConfig.jobs[jobKey].steps;
      expect(steps[0]).toMatchObject({ name: 'Checkout code', uses: 'actions/checkout@v4' });
      expect(steps[1]).toMatchObject({
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: { 'node-version': '18', cache: 'npm' },
      });
      expect(steps[2]).toMatchObject({ name: 'Install dependencies', run: 'npm ci' });
    });
  });

  describe('Job-specific Steps', () => {
    test('lint-and-format has ESLint and Prettier checks and 5 total steps', () => {
      const steps = workflowConfig.jobs['lint-and-format'].steps;
      const eslint = steps.find(s => s.name === 'Run ESLint');
      const prettier = steps.find(s => s.name === 'Check Prettier formatting');
      expect(eslint).toBeDefined();
      expect(eslint.run).toBe('npm run lint');
      expect(prettier).toBeDefined();
      expect(prettier.run).toBe('npm run format:check');
      expect(steps).toHaveLength(5);
    });

    test('type-check runs tsc and has 4 total steps', () => {
      const steps = workflowConfig.jobs['type-check'].steps;
      const tsc = steps.find(s => s.name === 'Run TypeScript compiler');
      expect(tsc).toBeDefined();
      expect(tsc.run).toBe('npm run type-check');
      expect(steps).toHaveLength(4);
    });

    test('build runs build and uploads artifacts, 5 total steps', () => {
      const steps = workflowConfig.jobs.build.steps;
      const build = steps.find(s => s.name === 'Build application');
      const upload = steps.find(s => s.name === 'Upload build artifacts');
      expect(build).toBeDefined();
      expect(build.run).toBe('npm run build');
      expect(upload).toBeDefined();
      expect(upload.uses).toBe('actions/upload-artifact@v4');
      expect(upload.with).toMatchObject({ name: 'build-files', path: 'dist/' });
      expect(steps).toHaveLength(5);
    });

    test('security-audit runs npm audit and has 4 total steps', () => {
      const steps = workflowConfig.jobs['security-audit'].steps;
      const audit = steps.find(s => s.name === 'Run security audit');
      expect(audit).toBeDefined();
      expect(audit.run).toBe('npm run security-audit');
      expect(steps).toHaveLength(4);
    });
  });

  describe('Action Pinning and Versions', () => {
    test('checkout/setup-node/upload-artifact pinned to v4', () => {
      const expected = {
        'actions/checkout': 'v4',
        'actions/setup-node': 'v4',
        'actions/upload-artifact': 'v4',
      };
      for (const job of Object.values(workflowConfig.jobs)) {
        for (const step of job.steps) {
          if (step.uses) {
            const [name, version] = step.uses.split('@');
            if (expected[name]) {
              expect(version).toBe(expected[name]);
            }
            // Enforce that every "uses" has a pinned version
            expect(step.uses.includes('@')).toBe(true);
          }
        }
      }
    });
  });

  describe('Consistency', () => {
    test('all setup-node steps use Node 18 and npm cache', () => {
      for (const job of Object.values(workflowConfig.jobs)) {
        const node = job.steps.find(s => s.uses && s.uses.includes('actions/setup-node'));
        expect(node).toBeDefined();
        expect(node.with['node-version']).toBe('18');
        expect(node.with.cache).toBe('npm');
      }
    });

    test('no step uses npm install (prefer npm ci)', () => {
      for (const job of Object.values(workflowConfig.jobs)) {
        for (const step of job.steps) {
          if (typeof step.run === 'string') {
            expect(step.run.includes('npm install')).toBe(false);
          }
        }
      }
    });

    test('no duplicate step names within a job', () => {
      for (const job of Object.values(workflowConfig.jobs)) {
        const names = job.steps.map(s => s.name).filter(Boolean);
        const set = new Set(names);
        expect(set.size).toBe(names.length);
      }
    });
  });

  describe('Formatting & Hygiene', () => {
    test('indentation uses multiples of 2 spaces', () => {
      for (const line of workflowContent.split('\n')) {
        if (line.trim().length && line.startsWith(' ')) {
          const count = (line.match(/^ +/) || [''])[0].length;
          expect(count % 2).toBe(0);
        }
      }
    });

    test('no obvious hardcoded secrets in YAML', () => {
      const sensitive = [
        /token\s*[:=]\s*["\'][^"\']+["\']/i,
        /password\s*[:=]\s*["\'][^"\']+["\']/i,
        /secret\s*[:=]\s*["\'][^"\']+["\']/i,
        /\b(api[-_ ]?key|access[-_ ]?key)\b\s*[:=]\s*["\'][^"\']+["\']/i,
      ];
      for (const rx of sensitive) {
        expect(workflowContent).not.toMatch(rx);
      }
    });
  });

  describe('Edge Cases', () => {
    test('reading a non-existent workflow file throws', () => {
      expect(() => fs.readFileSync('.github/workflows/__missing__.yml', 'utf8')).toThrow();
    });
  });
});