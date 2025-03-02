import ArtGallery from "@/components/ArtGallery";
import { GalleryProvider } from "@/context/GalleryContext";

export default function Home() {
  return (
    <GalleryProvider>
      <main className="min-h-screen">
        <ArtGallery />
      </main>
    </GalleryProvider>
  );
}
