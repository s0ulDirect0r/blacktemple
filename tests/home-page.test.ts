import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import Home from '@/app/page';
import { GalleryProvider } from '@/context/GalleryContext';
import * as galleryModule from '@/lib/gallery';
import type { ArtworkImage, Project } from '@/types/artwork';
import type { ProjectCountSummary } from '@/types/gallery';

const sampleImage: ArtworkImage = {
  id: '42',
  url: 'https://example.com/artwork-42.jpg',
  metadata: {
    title: 'Gallery Test Image',
    description: 'Used to verify server-side gallery hydration',
    projectId: 'project-1',
    tags: ['test'],
    created_at: new Date('2024-02-01T00:00:00Z').toISOString(),
    updated_at: new Date('2024-02-02T00:00:00Z').toISOString(),
  },
};

const sampleProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Test Project',
    description: 'Project seeded for testing',
    created_at: new Date('2023-12-31T00:00:00Z').toISOString(),
  },
];

const sampleCounts: ProjectCountSummary = {
  projects: [{ id: 'project-1', name: 'Test Project', count: 1 }],
  unassigned: 0,
  total: 1,
};

test('Home preloads gallery data on the server', async (t) => {
  const getGalleryImagesMock = mock.method(
    galleryModule,
    'getGalleryImages',
    async () => ({ images: [sampleImage], hasMore: true })
  );
  const getGalleryProjectsMock = mock.method(
    galleryModule,
    'getGalleryProjects',
    async () => sampleProjects
  );
  const getProjectCountSummaryMock = mock.method(
    galleryModule,
    'getProjectCountSummary',
    async () => sampleCounts
  );

  t.after(() => {
    getGalleryImagesMock.mock.restore();
    getGalleryProjectsMock.mock.restore();
    getProjectCountSummaryMock.mock.restore();
  });

  const element = await Home();

  assert.equal(getGalleryImagesMock.mock.calls.length, 1);
  assert.deepEqual(getGalleryImagesMock.mock.calls[0]?.arguments[0], {
    limit: 30,
  });

  assert.equal(getGalleryProjectsMock.mock.calls.length, 1);
  assert.equal(getProjectCountSummaryMock.mock.calls.length, 1);

  assert.equal(element.type, GalleryProvider);
  assert.deepEqual(element.props.initialImages, [sampleImage]);
  assert.deepEqual(element.props.initialProjects, sampleProjects);
  assert.deepEqual(element.props.initialProjectCounts, sampleCounts);
  assert.equal(element.props.initialHasMore, true);

  const child = element.props.children;
  assert.ok(child, 'GalleryProvider should render children');
});
