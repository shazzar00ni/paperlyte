const { execSync } = require('child_process');
const path = require('path');

function runMarkdownTests() {
  const p = path.join(__dirname, 'run-markdown-tests.js');
  try {
    const out = execSync(`node ${p}`, { encoding: 'utf8' });
    console.log(out);
    return { success: true, output: out };
  } catch (e) {
    console.error('Markdown tests failed:', e.stdout || e.message);
    return { success: false, error: e.stdout || e.message };
  }
}

module.exports = {
  runMarkdownTests,
  // Jest
  testMarkdownDocumentation: () => {
    const r = runMarkdownTests();
    if (!r.success) throw new Error('Markdown documentation tests failed: ' + r.error);
  },
  // Mocha
  createMarkdownTests: (describe, it) => {
    describe('Markdown Documentation', () => {
      it('passes all validation checks', () => {
        const r = runMarkdownTests();
        if (!r.success) throw new Error('Markdown documentation tests failed: ' + r.error);
      });
    });
  }
};