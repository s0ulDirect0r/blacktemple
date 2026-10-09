import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { getImagesResponse } from '@/lib/gallery-response';
import type { ArtworkImage } from '@/types/artwork';

const sampleImage: ArtworkImage = {
  id: '1',
  url: 'https://example.com/image-1.jpg',
  metadata: {
    title: 'Sample Image',
    description: 'A sample image for testing',
    tags: ['sample'],
    created_at: new Date('2024-01-01T00:00:00Z').toISOString(),
    updated_at: new Date('2024-01-02T00:00:00Z').toISOString(),
  },
};

test('GET /api/images returns gallery payload', async () => {
  const getGalleryImagesMock = mock.fn(
    async (_options?: Parameters<Parameters<typeof getImagesResponse>[1]>[0]) => ({
      images: [sampleImage],
      hasMore: true,
    })
  );

  const response = await getImagesResponse(new Request('https://example.com/api/images'), getGalleryImagesMock);

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

test('GET /api/images passes filters and pagination params', async () => {
  const getGalleryImagesMock = mock.fn(
    async (_options?: Parameters<Parameters<typeof getImagesResponse>[1]>[0]) => ({
      images: [],
      hasMore: false,
    })
  );

  const response = await getImagesResponse(
    new Request('https://example.com/api/images?unassigned=true&limit=10&offset=30'),
    getGalleryImagesMock
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


test('images response passes project IDs and ignores nonnumeric pagination', async () => {
  const loadImages = mock.fn(async (_options?: Parameters<Parameters<typeof getImagesResponse>[1]>[0]) => ({ images: [], hasMore: false }));
  await getImagesResponse(new Request('https://example.com/api/images?projectId=project-1&limit=invalid&offset=invalid'), loadImages);
  assert.deepEqual(loadImages.mock.calls[0]?.arguments[0], { projectId: 'project-1', limit: undefined, offset: undefined });
});

test('images response returns a generic error when the gallery fails', async (t) => {
  const loggedError = mock.method(console, 'error', () => {});
  t.after(() => loggedError.mock.restore());
  const response = await getImagesResponse(new Request('https://example.com/api/images'), async () => {
    throw new Error('private database detail');
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to fetch images' });
  assert.equal(loggedError.mock.calls.length, 1);
});
