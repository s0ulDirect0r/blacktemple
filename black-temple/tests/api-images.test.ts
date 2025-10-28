import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '@/app/api/images/route';
import * as galleryModule from '@/lib/gallery';
import type { ArtworkImage } from '@/types/artwork';

const sampleImage: ArtworkImage = {
  id: '1',
  url: 'https://example.com/image-1.jpg',
  metadata: {
    title: 'Sample Image',
    description: 'A sample image for testing',
    projectId: null,
    tags: ['sample'],
    created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2024-01-02T00:00:00Z').toISOString(),
  },
};

test('GET /api/images returns gallery payload', async (t) => {
  const getGalleryImagesMock = mock.method(
    galleryModule,
    'getGalleryImages',
    async () => ({
      images: [sampleImage],
      hasMore: true,
    })
  );

  t.after(() => {
    getGalleryImagesMock.mock.restore();
  });

  const response = await GET(new Request('https://example.com/api/images'));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
    images: [sampleImage],
    hasMore: true,
  });

  const callArgs = getGalleryImagesMock.mock.calls[0]?.arguments[0];
  assert.deepEqual(callArgs, {
    projectId: null,
    limit: undefined,
    offset: undefined,
  });
});

test('GET /api/images passes filters and pagination params', async (t) => {
  const getGalleryImagesMock = mock.method(
    galleryModule,
    'getGalleryImages',
    async () => ({
      images: [],
      hasMore: false,
    })
  );

  t.after(() => {
    getGalleryImagesMock.mock.restore();
  });

  const response = await GET(
    new Request('https://example.com/api/images?unassigned=true&limit=10&offset=30')
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, { images: [], hasMore: false });

  const callArgs = getGalleryImagesMock.mock.calls[0]?.arguments[0];
  assert.deepEqual(callArgs, {
    projectId: 'unassigned',
    limit: 10,
    offset: 30,
  });
});
