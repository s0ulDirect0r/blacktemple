import ArtGallery from "@/components/ArtGallery";
import { GalleryProvider } from "@/context/GalleryContext";

export default function Home() {
  return (
    <GalleryProvider>
      <main className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Black Temple Art Gallery</h1>
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Gallery</h2>
            <ArtGallery />
          </section>
        </div>
      </main>
    </GalleryProvider>
  );
}
