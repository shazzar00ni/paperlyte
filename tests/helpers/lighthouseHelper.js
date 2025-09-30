/**
 * Lighthouse Helper
 * 
 * Utility functions for reading and parsing Lighthouse CI results
 */

import fs from 'fs';
import path from 'path';

/**
 * Read the latest Lighthouse CI results
 * @returns {Object|null} Lighthouse results or null if not found
 */
export function readLatestLighthouseResults() {
  const lhciDir = path.resolve(process.cwd(), '.lighthouseci');
  const manifestPath = path.join(lhciDir, 'manifest.json');
  
  // Check if Lighthouse CI has been run
  if (!fs.existsSync(manifestPath)) {
    console.warn('Lighthouse CI results not found. Run `npm run lighthouse:ci` first.');
    return null;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    // Get the latest run
    if (!manifest || manifest.length === 0) {
      console.warn('No Lighthouse runs found in manifest.');
      return null;
    }

    const latestRun = manifest[0];
    const resultsPath = path.join(lhciDir, latestRun.jsonPath);
    
    if (!fs.existsSync(resultsPath)) {
      console.warn(`Lighthouse results file not found: ${resultsPath}`);
      return null;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    return parseLighthouseResults(results);
  } catch (error) {
    console.error('Error reading Lighthouse results:', error.message);
    return null;
  }
}

/**
 * Parse Lighthouse results into a usable format
 * @param {Object} results - Raw Lighthouse results
 * @returns {Object} Parsed results with scores and metrics
 */
function parseLighthouseResults(results) {
  const categories = results.categories || {};
  const audits = results.audits || {};

  return {
    lighthouse: {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
    },
    coreWebVitals: {
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      tbt: audits['total-blocking-time']?.numericValue || 0,
    },
    metrics: {
      speedIndex: audits['speed-index']?.numericValue || 0,
      timeToInteractive: audits['interactive']?.numericValue || 0,
      totalByteWeight: audits['total-byte-weight']?.numericValue || 0,
    }
  };
}

/**
 * Get performance targets from lighthouserc.json
 * @returns {Object} Performance targets
 */
export function getPerformanceTargets() {
  const configPath = path.resolve(process.cwd(), 'lighthouserc.json');
  
  if (!fs.existsSync(configPath)) {
    console.warn('lighthouserc.json not found, using default targets');
    return getDefaultTargets();
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const assertions = config.ci?.assert?.assertions || {};

    return {
      lighthouse: {
        performance: (assertions['categories:performance']?.[1]?.minScore || 0.9) * 100,
        accessibility: (assertions['categories:accessibility']?.[1]?.minScore || 1.0) * 100,
        bestPractices: (assertions['categories:best-practices']?.[1]?.minScore || 0.95) * 100,
        seo: (assertions['categories:seo']?.[1]?.minScore || 0.85) * 100,
      },
      coreWebVitals: {
        fcp: assertions['first-contentful-paint']?.[1]?.maxNumericValue || 1800,
        lcp: assertions['largest-contentful-paint']?.[1]?.maxNumericValue || 2500,
        cls: assertions['cumulative-layout-shift']?.[1]?.maxNumericValue || 0.1,
        tbt: assertions['total-blocking-time']?.[1]?.maxNumericValue || 300,
      }
    };
  } catch (error) {
    console.error('Error reading lighthouserc.json:', error.message);
    return getDefaultTargets();
  }
}

/**
 * Get default performance targets
 * @returns {Object} Default targets
 */
function getDefaultTargets() {
  return {
    lighthouse: {
      performance: 90,
      accessibility: 100,
      bestPractices: 95,
      seo: 85,
    },
    coreWebVitals: {
      fcp: 1800,
      lcp: 2500,
      cls: 0.1,
      tbt: 300,
    }
  };
}

/**
 * Get mock results for testing when Lighthouse hasn't been run
 * @returns {Object} Mock results based on documented audit findings
 */
export function getMockResults() {
  return {
    lighthouse: {
      performance: 96,
      accessibility: 100,
      bestPractices: 100,
      seo: 91,
    },
    coreWebVitals: {
      fcp: 1200,
      lcp: 1400,
      cls: 0.0,
      tbt: 230,
    }
  };
}