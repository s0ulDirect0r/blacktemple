'use client';

import { useState, useRef, useCallback } from 'react';
import { useGallery } from '@/context/GalleryContext';

// Separate the authentication form into its own component
function AuthForm({ onAuth }: { onAuth: (secret: string) => Promise<void> }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAuth(secret);
    } catch (err) {
      setError('Authentication failed');
      setSecret('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        <input
          type="password"
          placeholder="Admin Password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Authenticate
        </button>
      </div>
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </form>
  );
}

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { addImage } = useGallery();

  const handleAuth = async (secret: string) => {
    const formData = new FormData();
    formData.append('ADMIN_SECRET', secret);

    const response = await fetch('/api/auth', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    setAdminSecret(secret);
    setIsAuthenticated(true);
  };

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
    if (!selectedFile || !adminSecret) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('ADMIN_SECRET', adminSecret);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      addImage({
        public_id: data.id,
        secure_url: data.url,
        created_at: new Date().toISOString(),
      });

      setSuccessMessage('Upload successful!');
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return <AuthForm onAuth={handleAuth} />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <FileUploadZone 
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
      />

      {preview && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Preview:</h2>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={preview}
              alt="Preview"
              className="object-contain w-full h-full"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-4 py-2 px-4 bg-blue-600 text-white rounded-md 
              hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload to Gallery'}
          </button>
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