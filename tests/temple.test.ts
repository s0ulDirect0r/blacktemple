import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { profileInput,postInput,webLink,uuid,pageCursor,filename,MAX_IMAGE_BYTES } from '../src/lib/temple/validation';
import { inspectImage } from '../src/lib/temple/media';
import { crc32,zip } from '../src/lib/temple/zip';
import { createHash } from 'node:crypto';
import { handle } from '../src/app/api/temple/[...path]/route';
import { boundedBytes } from '../src/lib/temple/request';
import { MemberError } from '../src/lib/membership/errors';

test('chosen identity is validated separately from private account fields',()=>{
  assert.deepEqual(profileInput({name:'Moon Weaver',alias:'Moon_Weaver',persona:'I make little worlds',email:'private@example.test',userId:'other'}),{name:'Moon Weaver',alias:'moon_weaver',persona:'I make little worlds',avatarId:null});
  for(const alias of ['xy','has spaces','<script>','a'.repeat(31)])assert.throws(()=>profileInput({name:'Valid',alias}));
});
test('offerings preserve poem line breaks and reject unsafe links and foreign request shapes',()=>{
  const poem='A small light\n\ninside the machine.';
  assert.equal(postInput({body:poem}).body,poem);
  for(const link of ['javascript:alert(1)','data:text/html,x','file:///secret','https://user:password@example.test','//example.test'])assert.throws(()=>webLink(link));
  assert.equal(webLink('https://example.test/work'),'https://example.test/work');
  assert.throws(()=>postInput({body:'',mediaIds:[]}));assert.throws(()=>postInput({body:'hello',mediaIds:'not a list'}));assert.throws(()=>postInput({body:'hello',offering:'true'}));
});
test('record and cursor inputs reject query injection and malformed values',()=>{
  assert.throws(()=>uuid("' OR 1=1"));assert.throws(()=>pageCursor('broken'));assert.throws(()=>pageCursor(Buffer.from('["bad","bad"]').toString('base64url')));
  assert.equal(filename('../../unsafe name.png'),'unsafe_name.png');
});
test('request bounds apply to streamed bodies even with missing or misleading lengths',async()=>{
  assert.equal((await boundedBytes(new Request('http://localhost',{method:'POST',body:'small'}),10)).toString(),'small');
  await assert.rejects(boundedBytes(new Request('http://localhost',{method:'POST',body:'too large',headers:{'content-length':'1'}}),4),e=>e instanceof MemberError&&e.status===413);
  await assert.rejects(boundedBytes(new Request('http://localhost',{method:'POST',body:'x',headers:{'content-length':'1000'}}),10),e=>e instanceof MemberError&&e.status===413);
});
test('images are fully decoded, retain original bytes and reject SVG, fake files and oversized inputs',async()=>{
  const bytes=await sharp({create:{width:12,height:8,channels:3,background:'#7350a0'}}).png().toBuffer();
  const result=await inspectImage(bytes,'picture.png','A violet rectangle');assert.equal(result.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(result.width,12);assert.equal(result.mime,'image/png');
  for(const invalid of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),Buffer.from('<html>fake</html>'),Buffer.alloc(MAX_IMAGE_BYTES+1)])await assert.rejects(inspectImage(invalid,'fake.png','Fake'));
  await assert.rejects(inspectImage(bytes,'valid.png',''));
});
test('ZIP uses standard CRC32 and UTF-8 entry names',async()=>{
  assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
  async function* entries(){yield {name:'manifest.json',bytes:Buffer.from('{"schemaVersion":1}')};yield {name:'media/art.png',bytes:Buffer.from([0,1,2,255])};}
  const chunks=[];for await(const part of zip(entries()))chunks.push(part);const archive=Buffer.concat(chunks);
  assert.equal(archive.readUInt32LE(0),0x04034b50);assert.equal(archive.readUInt32LE(archive.length-22),0x06054b50);assert.equal(archive.readUInt16LE(archive.length-14),2);
  async function* unsafe(){yield {name:'../secret',bytes:Buffer.from('no')};}await assert.rejects(async()=>{for await(const part of zip(unsafe()))void part;});
});
test('Temple API denies unauthenticated reads, exports and uploads without touching a database',async()=>{
  const previous={...process.env};try{
    delete process.env.MEMBERSHIP_DATABASE_URL;delete process.env.BETTER_AUTH_SECRET;process.env.BETTER_AUTH_URL='http://localhost:3003';
    for(const path of [['feed'],['export'],['identity'],['media','11111111-1111-4111-8111-111111111111'],['moderation']]){
      const response=await handle(new Request('http://localhost:3003/api/temple/'+path.join('/')),{params:Promise.resolve({path})});assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
    }
    const response=await handle(new Request('http://localhost:3003/api/temple/feed',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{}'}),{params:Promise.resolve({path:['feed']})});assert.equal(response.status,403);
    const upload=await handle(new Request('http://localhost:3003/api/temple/media',{method:'POST',headers:{origin:'https://evil.test','content-type':'multipart/form-data; boundary=x'},body:'bad'}),{params:Promise.resolve({path:['media']})});assert.equal(upload.status,403);
  }finally{process.env=previous;}
});
