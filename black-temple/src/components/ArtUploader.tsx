'use client';

import { useState, useRef, useEffect } from 'react';
import { useGallery } from '@/context/GalleryContext';

export default function ArtUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [showUploader, setShowUploader] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { addImage } = useGallery();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);
    setPreview(null);
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
    if (!selectedFile || !adminSecret || !isAuthenticated) return;

    setUploading(true);
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

      setUploadedUrl(data.url);
      
      addImage({
        public_id: data.id,
        secure_url: data.url,
        created_at: new Date().toISOString(),
      });

      resetFileInput();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAdminAuth = async () => {
    if (!adminSecret) return;
    
    try {
      const formData = new FormData();
      formData.append('ADMIN_SECRET', adminSecret);

      const response = await fetch('/api/auth', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setShowUploader(true);
      } else {
        setError('Invalid password');
        setAdminSecret('');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Authentication failed');
      setAdminSecret('');
    }
  };

  if (!showUploader) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowUploader(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Show Upload Form
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <input
            type="password"
            placeholder="Admin Password"
            value={adminSecret || ''}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="w-full p-2 border rounded-md"
            onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
          />
          <button
            onClick={() => {
              console.log('Auth button clicked');
              handleAdminAuth();
            }}
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
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
            disabled={uploading || !adminSecret}
            className="w-full mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
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
          Upload successful!
        </div>
      )}
    </div>
  );
} 