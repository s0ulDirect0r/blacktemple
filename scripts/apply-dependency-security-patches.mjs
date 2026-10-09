import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const checkOnly = process.argv.includes('--check');
if (process.argv.slice(2).some((arg) => arg !== '--check')) {
  throw new Error('Usage: node scripts/apply-dependency-security-patches.mjs [--check]');
}
const manifest = JSON.parse(await readFile(path.join(root, 'patches/dependency-security.json'), 'utf8'));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const hash = (source) => createHash('sha256').update(source).digest('hex');
const planned = [];
for (const patch of manifest.patches) {
  const installations = Object.keys(lock.packages).filter((name) =>
    name.endsWith(`node_modules/${patch.package}`));
  if (!installations.length) throw new Error(`Security patch target missing: ${patch.package}`);
  for (const installation of installations) {
    const targetRoot = path.join(root, installation);
    const metadata = JSON.parse(await readFile(path.join(targetRoot, 'package.json'), 'utf8'));
    if (metadata.version !== patch.version) {
      throw new Error(`Review local security patch before using ${patch.package}@${metadata.version}; expected ${patch.version}`);
    }
    const target = path.join(targetRoot, patch.file);
    let source = await readFile(target, 'utf8');
    if (hash(source) === patch.patchedSha256) continue;
    if (hash(source) !== patch.originalSha256) {
      throw new Error(`Security patch target changed unexpectedly: ${installation}/${patch.file}`);
    }
    if (checkOnly) throw new Error(`Local security patch is not applied: ${installation}/${patch.file}`);
    for (const replacement of patch.replacements) {
      if (source.split(replacement.before).length !== 2) {
        throw new Error(`Security patch anchor is not unique: ${installation}/${patch.file}`);
      }
      source = source.replace(replacement.before, replacement.after);
    }
    if (hash(source) !== patch.patchedSha256) {
      throw new Error(`Security patch output checksum failed: ${installation}/${patch.file}`);
    }
    planned.push({ target, source });
  }
}
// Validate every target before writing anything; fail closed on dependency drift.
for (const change of planned) await writeFile(change.target, change.source);
console.log(`Local dependency security patches verified${planned.length ? `; patched ${planned.length} files` : ''}. Upstream npm audit findings remain visible.`);
