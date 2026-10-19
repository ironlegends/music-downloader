import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { validateReleaseQa } from '../../tools/verify-release-qa.mjs';

const root = new URL('../../', import.meta.url);

test('release scripts do not interpolate GitHub expressions into shell code', () => {
  const workflow = fs.readFileSync(new URL('.github/workflows/release.yml', root), 'utf8');
  let inScript = false;
  for (const line of workflow.split(/\r?\n/)) {
    if (/^        run: \|/.test(line)) { inScript = true; continue; }
    if (inScript && line.trim() && !/^          /.test(line)) inScript = false;
    if (inScript) assert.equal(line.includes('${{'), false, 'Pass dispatch inputs through environment variables');
  }
  assert.match(workflow, /REQUESTED_TAG: \$\{\{ inputs\.tag \}\}/);
  assert.match(workflow, /ref: \$\{\{ steps\.validate_tag\.outputs\.commit \}\}/);
  assert.match(workflow, /tools\/verify-release-qa\.mjs/);
});

test('release QA fails closed for missing, pending, incomplete and unsupported evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-qa-'));
  const file = path.join(dir, 'qa.md');
  const requiredChecks = ['Installation', 'Page scope', 'Manual Turnstile', 'Conversion', 'Individual download', 'Batch download', 'Keyboard access', 'No hidden downloads'];
  const platformEvidence = (platform) => `## Chrome on ${platform}\n\n**Status: PASS**\n\n- OS version: ${platform} 99.0\n- Chrome version: 155.0.0.0\n- Evidence: synthetic-${platform}-evidence.txt\n\n${requiredChecks.map((check) => `- [x] **${check}**: Synthetic completed check.`).join('\n')}\n`;
  const complete = '**Status: PASS**\n\n' + platformEvidence('Windows') + '\n' + platformEvidence('macOS');
  try {
    assert.throws(() => validateReleaseQa(file), /missing/i);
    for (const text of [
      complete.replace('PASS', 'PENDING'),
      '**Status: PENDING**\n' + complete,
      complete + '\n**Status: PENDING**\n',
      complete.replace('[x]', '[ ]'),
      '**Status: PASS**',
      complete.replace('macOS', 'Linux'),
      '**Status: PASS**\n' + platformEvidence('Windows') + '\n## Chrome on macOS\n',
      '**Status: PASS**\n## Chrome on Windows\n' + platformEvidence('macOS'),
      complete.replace('OS version: macOS 99.0', 'OS version: PENDING'),
      complete.replace('Chrome version: 155.0.0.0', 'Chrome version: PENDING'),
      complete.replace('Chrome version: 155.0.0.0', 'Chrome version: 99.0.0.0'),
      complete.replace('**Status: PASS**\n\n', ''),
      complete.replace('Evidence: synthetic-macOS-evidence.txt', 'Evidence: '),
      complete.replace('**Keyboard access**: Synthetic completed check.', 'Other completed check.'),
      complete + '\n' + platformEvidence('macOS')
    ]) {
      fs.writeFileSync(file, text);
      assert.throws(() => validateReleaseQa(file));
    }
    fs.writeFileSync(file, complete);
    assert.equal(validateReleaseQa(file), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tag validation rejects shell payloads and resolves an older annotated tag exactly', () => {
  const bash = process.platform === 'win32'
    ? path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Git/bin/bash.exe')
    : 'bash';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-tag-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const workflow = fs.readFileSync(new URL('.github/workflows/release.yml', root), 'utf8').replace(/\r\n/g, '\n');
  const script = workflow.split('id: validate_tag')[1].split('run: |\n')[1]
    .split('\n      - name:')[0].replace(/^          /gm, '');
  const output = path.join(dir, 'output').replaceAll('\\', '/');
  const validate = (tag) => spawnSync(bash, ['--noprofile', '--norc', '-c', script], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, BASH_ENV: '', REQUESTED_TAG: tag, QA_CONFIRMED: 'true', GITHUB_OUTPUT: output }
  });
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Synthetic Test');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'tag.gpgsign', 'false');
    git('config', 'core.hooksPath', path.join(dir, 'empty-hooks'));
    fs.writeFileSync(path.join(dir, 'source.txt'), 'tagged source');
    git('add', 'source.txt');
    git('commit', '-m', 'Synthetic tagged source');
    const taggedCommit = git('rev-parse', 'HEAD');
    git('tag', '-a', 'v2.0.0', '-m', 'Synthetic release');
    fs.writeFileSync(path.join(dir, 'source.txt'), 'later source');
    git('commit', '-am', 'Synthetic later source');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    assert.notEqual(git('rev-parse', 'HEAD'), taggedCommit);

    const valid = validate('v2.0.0');
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(fs.readFileSync(output, 'utf8').trim(), `commit=${taggedCommit}`);
    fs.unlinkSync(output);

    for (const input of ['v2.0.0"; touch injected-marker; #', 'v02.0.0', '--help', 'v2.0.0\ncommit=forged']) {
      const invalid = validate(input);
      assert.equal(invalid.status, 1, `Expected rejection for ${JSON.stringify(input)}`);
      assert.equal(fs.existsSync(output), false);
      assert.equal(fs.existsSync(path.join(dir, 'injected-marker')), false);
    }
    git('tag', 'v2.1.0');
    assert.equal(validate('v2.1.0').status, 1, 'Lightweight tags must be rejected');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
