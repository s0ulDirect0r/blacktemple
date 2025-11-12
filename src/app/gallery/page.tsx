import ArtGallery from "@/components/ArtGallery";
import HorizontalProjectFilter from "@/components/HorizontalProjectFilter";
import { GalleryProvider } from "@/context/GalleryContext";
import { getGalleryImages, getGalleryProjects, getProjectCountSummary } from "@/lib/gallery";
import { GALLERY_PAGE_SIZE } from "@/constants/gallery";

export default async function GalleryPage() {
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
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mt-8 mb-4">Gallery</h1>
          <HorizontalProjectFilter />
          <ArtGallery />
        </div>
      </div>
    </GalleryProvider>
  );
}
