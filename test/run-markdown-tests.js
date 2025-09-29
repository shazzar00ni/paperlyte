#!/usr/bin/env node
try {
  require('./markdown_docs.test.js');
} catch (e) {
  console.error('❌ Test execution failed:', e.message);
  process.exit(1);
}