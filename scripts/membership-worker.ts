import 'next/dist/server/node-environment-baseline';
import dotenv from 'dotenv';
import { processNextAccountEmail } from '../src/lib/membership/email';
import { processNextMembershipEvent } from '../src/lib/membership/jobs';
import { membershipDatabase } from '../src/lib/membership/database';

dotenv.config({path:'.env.local'});
let active = true;
process.on('SIGTERM',()=>{active=false;});
process.on('SIGINT',()=>{active=false;});
async function main() {
  const url = process.env.MEMBERSHIP_DATABASE_URL;
  if (!url || !['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname) || process.env.MEMBERSHIP_BILLING_MODE !== 'test') throw new Error('This worker command is for local sandbox testing only.');
  console.log('Membership sandbox worker started.');
  while(active) {
    try {
      const billing = await processNextMembershipEvent();
      const email = await processNextAccountEmail();
      if(billing || email) continue;
    }
    catch(error) { console.error('Worker retry:',error instanceof Error ? error.name : 'UnknownError'); }
    await new Promise(resolve=>setTimeout(resolve,1500));
  }
}
main().catch(error=>{console.error(error instanceof Error ? error.message:'Worker failed');process.exitCode=1;}).finally(()=>membershipDatabase().end());
