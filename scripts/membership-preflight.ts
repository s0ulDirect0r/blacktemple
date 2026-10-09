import dotenv from 'dotenv';
import { membershipPreflight, type DeploymentTarget } from '../src/lib/membership/preflight';

// Explicit env-file selection prevents accidental local-secret loading in hosted checks.
const args = process.argv.slice(2);
const target = args[0];
if (!['local', 'preview', 'production'].includes(target) || args.length > 3 || (args.length > 1 && (args[1] !== '--env-file' || !args[2]))) {
  console.error('Usage: tsx scripts/membership-preflight.ts local|preview|production [--env-file <path>]');
  process.exitCode = 2;
} else {
  if (args[2]) dotenv.config({ path: args[2], override: false });
  const result = membershipPreflight(process.env, target as DeploymentTarget);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
