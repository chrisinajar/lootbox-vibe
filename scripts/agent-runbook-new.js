#!/usr/bin/env node
/**
 * Create a new runbook from the template.
 * Usage: yarn agent:runbook:new <id> "Title"
 */
const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function main() {
  const [, , id, ...titleParts] = process.argv;
  const title = titleParts.join(' ').trim();

  if (!id) fail('Missing <id>. Example: yarn agent:runbook:new deploy-app "Faster deploys"');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id))
    fail('Invalid id. Use kebab-case: lowercase letters, numbers, hyphens.');
  if (!title)
    fail('Missing "Title" string. Example: yarn agent:runbook:new deploy-app "Faster deploys"');

  const root = process.cwd();
  const templatePath = path.join(root, 'docs', 'runbooks', '_template.md');
  const outDir = path.join(root, 'docs', 'runbooks');
  const outPath = path.join(outDir, `${id}.md`);

  if (!fs.existsSync(templatePath)) fail(`Template not found at ${templatePath}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(outPath)) fail(`Runbook already exists: docs/runbooks/${id}.md`);

  const template = fs.readFileSync(templatePath, 'utf8');
  const filled = template
    .replace(/^id:\s*template-id/m, `id: ${id}`)
    .replace(/^description:\s*Short, action-oriented description/m, `description: ${title}`)
    .replace(/^Summary:\s*One-sentence goal of this runbook\./m, `Summary: ${title}`);

  fs.writeFileSync(outPath, filled, 'utf8');

  console.log(`Created: docs/runbooks/${id}.md`);
  console.log('Next steps:');
  console.log('- Edit owner, triggers, and checklist.');
  console.log('- Add a brief entry to docs/runbooks/index.md.');
}

main();
