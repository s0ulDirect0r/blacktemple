import 'next/dist/server/node-environment-baseline';
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAccess, paidCoverage, safeReturnPath, TIERS, MEMBERSHIP_TERM_MONTHS, type MembershipAccess } from '@/lib/membership/config';
import { jsonObject, MemberError } from '@/lib/membership/http';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const start = new Date('2026-10-09T00:00:00Z'), end = new Date('2027-01-09T00:00:00Z');
const firstEnd = new Date('2026-11-09T00:00:00Z'), secondEnd = new Date('2026-12-09T00:00:00Z');
const record: MembershipAccess = { tier:'witness',status:'active',term_start:start,term_end:end,paid_through:firstEnd,revoked_at:null };

test('offers have the approved three-payment USD amounts', () => {
  assert.equal(MEMBERSHIP_TERM_MONTHS,3);
  assert.deepEqual(TIERS.map(tier=>[tier.monthlyCents,tier.monthlyCents*3]), [[2000,6000],[10000,30000],[100000,300000]]);
});
test('free, unconfirmed, failed and revoked memberships stay locked', () => {
  assert.equal(hasAccess(null,'studio',start),false);
  for (const status of ['activating','incomplete','incomplete_expired','unpaid']) assert.equal(hasAccess({...record,status},'studio',start),false,status);
  assert.equal(hasAccess({...record,paid_through:null},'studio',start),false);
  assert.equal(hasAccess({...record,revoked_at:start},'studio',start),false);
  assert.equal(hasAccess({...record,status:'canceled',revoked_at:start},'studio',start),false);
});
test('a canceled membership keeps access only through the month already paid', () => {
  const canceled = {...record,status:'canceled'};
  assert.equal(hasAccess(canceled,'studio',start),true);
  assert.equal(hasAccess(canceled,'studio',firstEnd),false);
  assert.equal(hasAccess({...canceled,paid_through:null},'studio',start),false);
  assert.equal(hasAccess({...canceled,paid_through:end},'studio',end),false);
});
test('access is bounded by both paid month and fixed term, even if subscription status is stale', () => {
  assert.equal(hasAccess(record,'studio',new Date(start.getTime()-1)),false);
  assert.equal(hasAccess(record,'studio',start),true);
  assert.equal(hasAccess({...record,status:'past_due'},'studio',new Date(firstEnd.getTime()-1)),true);
  assert.equal(hasAccess(record,'studio',firstEnd),false);
  assert.equal(hasAccess({...record,paid_through:new Date('2027-02-01')},'studio',end),false);
});
test('tier permissions separate studio, gatherings and private conversations', () => {
  for (const [tier,expected] of [['witness',[true,false,false]],['companion',[true,true,false]],['champion',[true,true,true]]] as const) {
    assert.deepEqual(['studio','gatherings','conversations'].map(feature=>hasAccess({...record,tier},feature as 'studio'|'gatherings'|'conversations',start)),expected);
  }
});
test('invoice ordering and duplicates cannot extend coverage past gaps or the term', () => {
  const periods = [{start:firstEnd,end:secondEnd},{start:start,end:firstEnd},{start:secondEnd,end:end},{start:start,end:firstEnd}];
  assert.deepEqual(paidCoverage(start,end,periods),end);
  assert.deepEqual(paidCoverage(start,end,[periods[1],periods[2]]),firstEnd);
  assert.equal(paidCoverage(start,end,[periods[0]]),null);
  assert.equal(paidCoverage(start,end,[{start,end:new Date('2027-02-09')}]),null);
});
test('login return paths reject external origins, encoded escapes and unrelated routes', () => {
  for (const value of ['https://evil.example','//evil.example','/\\evil.example','/members/../../calls','/api/members/studio','/members\n','/%2f%2fevil.example']) assert.equal(safeReturnPath(value),'/members');
  assert.equal(safeReturnPath('/membership/checkout?tier=companion'),'/membership/checkout?tier=companion');
  assert.equal(safeReturnPath('/members/support'),'/members/support');
});
test('malformed, null and array JSON receive a client error', async () => {
  for (const body of ['{','null','[]','"text"']) await assert.rejects(jsonObject(new Request('http://localhost',{method:'POST',body})), error=>error instanceof MemberError && error.status===400);
});
test('member proxy redirects anonymous visitors and does not trust a cookie as authentication', () => {
  const response = proxy(new NextRequest('http://localhost:3002/membership/checkout?tier=champion'));
  assert.equal(response.status,307);
  assert.equal(new URL(response.headers.get('location')!).pathname,'/login');
  assert.equal(new URL(response.headers.get('location')!).searchParams.get('next'),'/membership/checkout?tier=champion');
  const forged = proxy(new NextRequest('http://localhost:3002/members',{headers:{cookie:'blacktemple_member.session_token=forged'}}));
  assert.equal(forged.headers.get('x-middleware-next'),'1'); // Real page/API checks still required.
  assert.equal(forged.headers.get('cache-control'),'private, no-store');
});
