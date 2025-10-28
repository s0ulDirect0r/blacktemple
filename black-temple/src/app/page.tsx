import ArtGallery from "@/components/ArtGallery";
import { GalleryProvider } from "@/context/GalleryContext";
import { getGalleryImages, getGalleryProjects, getProjectCountSummary } from "@/lib/gallery";
import { GALLERY_PAGE_SIZE } from "@/constants/gallery";

export default async function Home() {
  const [initialGallery, projects, projectCounts] = await Promise.all([
    getGalleryImages({ limit: GALLERY_PAGE_SIZE }),
    getGalleryProjects(),
    getProjectCountSummary(),
  ]);

  return (
    <GalleryProvider
      initialImages={initialGallery.images}
      initialProjects={projects}
      initialProjectCounts={projectCounts}
      initialHasMore={initialGallery.hasMore}
    >
      <main className="min-h-screen">
        <ArtGallery />
      </main>
    </GalleryProvider>
  );
}
