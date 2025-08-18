import fs from 'node:fs';
import path from 'node:path';
import { compileFromFile } from 'json-schema-to-typescript';

async function main() {
  const root = process.cwd();
  const schemaDir = path.join(root, 'config', 'schema');
  const outFile = path.join(root, 'src', 'backend', 'config', 'types.d.ts');
  const files = fs
    .readdirSync(schemaDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(schemaDir, f));

  const banner = '/* auto-generated from /config/schema */\n\n';
  let out = banner;
  for (const file of files) {
    const ts = await compileFromFile(file, { bannerComment: '' });
    out += ts + '\n';
  }
  fs.writeFileSync(outFile, out, 'utf8');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
