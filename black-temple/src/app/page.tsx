import ArtGallery from "@/components/ArtGallery";
import { GalleryProvider } from "@/context/GalleryContext";

export default function Home() {
  return (
    <GalleryProvider>
      <main className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Black Temple Art Gallery</h1>
        <ArtGallery />
      </main>
    </GalleryProvider>
  );
}
