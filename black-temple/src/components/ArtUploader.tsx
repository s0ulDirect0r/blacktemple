'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGallery } from '@/context/GalleryContext';
import { Project, ArtworkMetadata } from '@/types/artwork';
import ArtworkMetadataForm from './ArtworkMetadataForm';

// Separate the file upload UI into its own component
function FileUploadZone({ 
  onFileSelect, 
  isUploading 
}: { 
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}) {
  // File input is always uncontrolled
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center 
        hover:border-gray-400 transition-colors ${isUploading ? 'opacity-50' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
        disabled={isUploading}
      />
      <label htmlFor="file-upload" className="cursor-pointer block">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="text-gray-600">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </label>
    </div>
  );
}

// Main component orchestrates the others
export default function ArtUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { addImage, projects, fetchProjects } = useGallery();
  const [metadata, setMetadata] = useState<ArtworkMetadata | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setError(null);
    setSuccessMessage(null);

    // Cleanup previous preview URL if it exists
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleUpload = async () => {
    if (!selectedFile || !metadata) return;

    setIsUploading(true);
    setError(null);

    try {
      const token = sessionStorage.getItem('adminSession');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      addImage({
        id: data.id,
        url: data.url,
        metadata: metadata,
      });

      setSuccessMessage('Upload successful!');
      setSelectedFile(null);
      setPreview(null);
      setMetadata(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <FileUploadZone 
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
      />

      {preview && (
        <div className="mt-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Preview:</h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={preview}
                alt="Preview"
                className="object-contain w-full h-full"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Image Details:</h2>
            <ArtworkMetadataForm
              projects={projects}
              onSubmit={setMetadata}
              isUploading={isUploading}
            />
          </div>

          {metadata && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full mt-4 py-2 px-4 bg-blue-600 text-white rounded-md 
                hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Upload to Gallery'}
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 