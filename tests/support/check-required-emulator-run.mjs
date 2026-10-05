#!/usr/bin/env node
/**
 * Post-run guard for the CI emulator job: "zero executed tests is not a pass".
 * Reads vitest's JSON report and fails unless every emulator-backed suite
 * listed in emulatorSuites.json ran at least one test, and nothing in the whole
 * run was skipped, todo, or failed.
 *
 *   node tests/support/check-required-emulator-run.mjs test-results/vitest-emulators.json
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('usage: check-required-emulator-run.mjs <vitest-json-report>');
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const required = JSON.parse(readFileSync(new URL('./emulatorSuites.json', import.meta.url), 'utf8'));
const problems = [];

const byFile = new Map(report.testResults.map((r) => [path.relative(process.cwd(), r.name), r]));
let emulatorPassed = 0;
for (const file of required) {
  const result = byFile.get(file);
  if (!result) {
    problems.push(`${file}: not collected in this run`);
    continue;
  }
  const count = (status) => result.assertionResults.filter((t) => t.status === status).length;
  const passed = count('passed');
  emulatorPassed += passed;
  if (passed === 0) problems.push(`${file}: executed zero passing tests`);
  for (const bad of ['skipped', 'pending', 'todo', 'failed']) {
    if (count(bad) > 0) problems.push(`${file}: ${count(bad)} ${bad} test(s)`);
  }
}
for (const key of ['numPendingTests', 'numTodoTests', 'numFailedTests', 'numFailedTestSuites']) {
  if (report[key] > 0) problems.push(`run total ${key} = ${report[key]}`);
}

if (problems.length > 0) {
  console.error('Required emulator run is not a pass:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(
  `Required emulator run OK: ${emulatorPassed} emulator-backed tests passed across ${required.length} suites; ` +
    `${report.numPassedTests} total passed, 0 skipped.`
);
