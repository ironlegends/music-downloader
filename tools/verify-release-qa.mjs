import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateReleaseQa(filePath) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Release QA evidence is missing');
  const text = fs.readFileSync(filePath, 'utf8');
  const statuses = [...text.matchAll(/^\*\*Status: ([A-Z]+)\*\*\s*$/gm)].map((match) => match[1]);
  if (statuses.length === 0 || statuses.some((status) => status !== 'PASS')) {
    throw new Error('Release QA status must be PASS');
  }
  const checkboxes = text.match(/^\s*- \[[ xX]\]/gm) ?? [];
  if (checkboxes.some((entry) => entry.includes('[ ]'))) {
    throw new Error('Every release QA checklist item must be completed');
  }
  const requiredChecks = ['Installation', 'Page scope', 'Manual Turnstile', 'Conversion', 'Individual download', 'Batch download', 'Keyboard access', 'No hidden downloads'];
  const headings = [...text.matchAll(/^## ([^\r\n]+)\r?$/gm)];
  if (!/^\*\*Status: PASS\*\*[ \t]*\r?$/m.test(text.slice(0, headings[0]?.index ?? text.length))) {
    throw new Error('Overall release QA status must be PASS');
  }
  for (const platform of ['Windows', 'macOS']) {
    const matching = headings.filter((heading) => heading[1] === `Chrome on ${platform}`);
    if (matching.length !== 1) throw new Error(`Release QA requires one Chrome on ${platform} section`);
    const heading = matching[0];
    const nextHeading = headings[headings.indexOf(heading) + 1];
    const section = text.slice(heading.index + heading[0].length, nextHeading?.index ?? text.length);
    if (!/^\*\*Status: PASS\*\*[ \t]*\r?$/m.test(section)) {
      throw new Error(`${platform} QA status must be PASS`);
    }
    for (const check of requiredChecks) {
      const completed = [...section.matchAll(/^[ \t]*- \[[xX]\] (.+)$/gm)];
      if (!completed.some((match) => match[1].startsWith(`**${check}**:`))) {
        throw new Error(`${platform} QA is missing the completed ${check} check`);
      }
    }
    const fields = {};
    for (const field of ['OS version', 'Chrome version', 'Evidence']) {
      const value = section.match(new RegExp(`^- ${field}:[ \\t]*([^\\r\\n]*)$`, 'm'))?.[1].trim();
      if (!value || /\b(?:PENDING|UNKNOWN|TODO|TBD|NOT (?:RUN|TESTED))\b|^N\/A$|^<.*>$/i.test(value)) {
        throw new Error(`${platform} QA requires recorded ${field}`);
      }
      fields[field] = value;
    }
    const chromeVersion = fields['Chrome version'].match(/\b(\d+)\.\d+/);
    if (!new RegExp(platform, 'i').test(fields['OS version']) || !/\d/.test(fields['OS version']) || !chromeVersion || Number(chromeVersion[1]) < 120) {
      throw new Error(`${platform} QA requires actual OS and Chrome versions`);
    }
  }
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validateReleaseQa(process.argv[2]);
    console.log('Release QA evidence passed');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
