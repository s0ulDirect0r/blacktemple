'use client';

import { useState } from 'react';
import { useGallery } from '@/context/GalleryContext';

export default function ArtUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addImage } = useGallery();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setUploadedUrl(data.url);
      
      addImage({
        public_id: data.publicId,
        secure_url: data.url,
        created_at: new Date().toISOString(),
      });

      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer block"
        >
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

      {preview && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Preview:</h2>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={preview}
              alt="Preview"
              className="object-contain w-full h-full"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload to Gallery'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {uploadedUrl && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          Upload successful! Your image is now available at:{' '}
          <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="underline">
            View Image
          </a>
        </div>
      )}
    </div>
  );
} 