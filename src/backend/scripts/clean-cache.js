import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const targets = [join(root, 'uploads'), join(root, '.tmp')];

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  console.log(`Cleared ${target}`);
}
