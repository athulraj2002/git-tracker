#!/usr/bin/env node
// Enforces "Type: subject" + a detailed body for every commit message.
const fs = require('node:fs');

const TYPES = [
  'Feat',
  'Fix',
  'UI',
  'Chore',
  'Docs',
  'Refactor',
  'Test',
  'Perf',
  'Build',
  'CI',
  'Style',
];
const SUBJECT_PATTERN = new RegExp(`^(${TYPES.join('|')}): .+`);
const TRAILER_PATTERN = /^[A-Za-z-]+:\s.*$/;
const SKIP_PATTERN = /^(Merge |Revert |fixup!|squash!)/;

function stripComments(lines) {
  return lines.filter((line) => !line.startsWith('#'));
}

function main() {
  const msgPath = process.argv[2];
  const raw = fs.readFileSync(msgPath, 'utf8');
  const lines = stripComments(raw.split('\n'));
  const subject = lines[0] ?? '';

  if (SKIP_PATTERN.test(subject)) {
    return;
  }

  if (!SUBJECT_PATTERN.test(subject)) {
    console.error(
      `\nCommit blocked: subject line must start with one of ${TYPES.map((t) => `"${t}:"`).join(', ')}\n` +
        `  Got: "${subject}"\n` +
        `  Example: "Feat: add GitLab OAuth sign-in"\n`,
    );
    process.exit(1);
  }

  const body = lines
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .filter((line) => !TRAILER_PATTERN.test(line));

  if (body.length === 0) {
    console.error(
      '\nCommit blocked: add a detailed summary of the change below the subject line ' +
        '(what changed and why), separated by a blank line.\n',
    );
    process.exit(1);
  }
}

main();
