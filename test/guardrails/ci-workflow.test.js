import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const lines = workflow.split(/\r?\n/);

function leadingSpaces(line) {
  return (line.match(/^ */)?.[0].length ?? 0);
}

function indexOfSection(linesToSearch, startFrom, key, indent) {
  return linesToSearch.findIndex((line, index) => {
    if (index < startFrom) return false;
    const trimmed = line.trim();
    return trimmed === `${key}:` && leadingSpaces(line) === indent;
  });
}

function listFrom(linesToSearch, listStartLine, baseIndent) {
  if (listStartLine < 0) return [];

  const listIndent = baseIndent + 2;
  const items = [];

  for (let i = listStartLine + 1; i < linesToSearch.length; i += 1) {
    const line = linesToSearch[i];
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (leadingSpaces(line) <= baseIndent) break;
    if (leadingSpaces(line) < listIndent) continue;

    const match = trimmed.match(/^-\s+(.*?)(\s+#.*)?$/);
    if (match) {
      const item = match[1].trim().replace(/^['"]|['"]$/g, '');
      items.push(item);
    }
  }

  return items;
}

test('CI workflow: push targets main and concurrency stays stable by workflow and ref', () => {
  const onLine = indexOfSection(lines, 0, 'on', 0);
  assert.notEqual(onLine, -1, 'The "on" section must be present.');

  const pushLine = indexOfSection(lines, onLine + 1, 'push', 2);
  assert.notEqual(pushLine, -1, 'The push trigger must be present.');
  const pushBranchesLine = indexOfSection(lines, pushLine + 1, 'branches', 4);
  assert.notEqual(pushBranchesLine, -1, 'push.branches must be present.');

  const pullRequestLine = indexOfSection(lines, onLine + 1, 'pull_request', 2);
  assert.notEqual(pullRequestLine, -1, 'The pull_request trigger must be present.');
  const pullRequestBranchesLine = indexOfSection(lines, pullRequestLine + 1, 'branches', 4);
  assert.notEqual(pullRequestBranchesLine, -1, 'pull_request.branches must be present.');

  const pushBranches = listFrom(lines, pushBranchesLine, leadingSpaces(lines[pushBranchesLine]));
  assert.ok(
    pushBranches.includes('main'),
    'push must target main'
  );

  const pullRequestBranches = listFrom(lines, pullRequestBranchesLine, leadingSpaces(lines[pullRequestBranchesLine]));
  assert.ok(
    pullRequestBranches.includes('main'),
    'pull_request must remain limited to main'
  );

  assert.match(
    workflow,
    /^\s*group:\s*\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/m,
    'group must use github.workflow and github.ref'
  );
  assert.doesNotMatch(
    workflow,
    /^\s*group:.*(?:github\.sha|pull_request\.head\.sha)/m,
    'group must not depend on a commit SHA'
  );
});
