import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const forbiddenCapabilities = [
  /\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /\bWebSocket\b/i,
  /\bEventSource\b/i, /\bsendBeacon\s*\(/i,
  /\blocation\.(assign|replace|reload)\s*\(/i,
  /\.\s*(click|submit)\s*\(/i,
  /\b(localStorage|sessionStorage)\b/i,
  /\bnavigator\.clipboard\b/i,
  /\b(setTimeout|setInterval|queueMicrotask)\s*\(/i,
  /\b(child_process|spawn|exec|fork)\b/i
];

const rawValues = [
  /https?:\/\//i,
  /\b(?:csrf|turnstile|token|task[_-]?id|url|value)\b\s*[:=]\s*['"](?!\[)[^'"]{8,}/i,
  /['"][A-Za-z0-9+/_=-]{80,}['"]/
];

const rawIds = [
  /\b(?:buttonIds?|id)\s*[:=]\s*(?:\[[^\]]*['"][^'"]+['"][^\]]*\]|['"][^'"]+['"])/i
];

const scanDirectories = ['src/observer', 'src/policy', 'test/fixtures', 'test/observer', 'test/policy'];

test('relevant sources, fixtures, and tests stay inert and redacted', () => {
  for (const file of scanDirectories.flatMap(filesUnder)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      assert.equal(forbiddenCapabilities.some((pattern) => pattern.test(line)), false, `${file}:${index + 1}`);
      assert.equal(rawValues.some((pattern) => pattern.test(line)), false, `${file}:${index + 1}`);
      assert.equal(rawIds.some((pattern) => pattern.test(line)), false, `${file}:${index + 1}`);
    }
  }
});
