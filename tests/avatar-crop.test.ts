import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarCrop, avatarImageHeader } from '../src/lib/temple/avatar-crop';

test('avatar source crops stay square and inside portrait, landscape and square pictures at every control extreme',()=>{
  for(const [width,height] of [[2400,1200],[1200,2400],[1024,1024]])for(const zoom of [1,2,4])for(const x of [0,50,100])for(const y of [0,50,100]){
    const crop=avatarCrop(width,height,zoom,x,y);assert(crop.side>0);assert(crop.x>=0&&crop.y>=0);assert(crop.x+crop.side<=width);assert(crop.y+crop.side<=height);
  }
  assert.deepEqual(avatarCrop(200,100,2,100,0),{x:150,y:0,side:50});
  assert.deepEqual(avatarCrop(100,200,1,50,100),{x:0,y:100,side:100});
  assert.throws(()=>avatarCrop(0,100,1,50,50));assert.throws(()=>avatarCrop(100,100,NaN,50,50));
});
test('avatar input identifies supported binary formats and rejects SVG or HTML disguised as an image',()=>{
  assert(avatarImageHeader(new Uint8Array([137,80,78,71,13,10,26,10])));assert(avatarImageHeader(new Uint8Array([255,216,255])));
  assert(avatarImageHeader(new TextEncoder().encode('RIFF1234WEBP')));
  assert.equal(avatarImageHeader(new TextEncoder().encode('<svg></svg>')),false);assert.equal(avatarImageHeader(new TextEncoder().encode('<html>')),false);
});
