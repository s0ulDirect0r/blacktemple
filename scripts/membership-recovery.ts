import { runBoundedRecovery } from '../src/lib/membership/recovery';

// Intentionally no dotenv loading: credentials/approval must be explicitly supplied at action time.
runBoundedRecovery(process.env).catch(() => {
  console.error('Membership recovery stopped. Review configuration, action approval and private endpoint logs.');
  process.exitCode = 1;
});
