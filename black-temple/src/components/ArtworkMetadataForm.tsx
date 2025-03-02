'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types/artwork';

interface ArtworkMetadataFormProps {
  initialMetadata?: Partial<ArtworkMetadata>;
  projects: Project[];
  onSubmit: (metadata: ArtworkMetadata) => void;
  isUploading?: boolean;
}

export interface ArtworkMetadata {
  title: string;
  description?: string;
  projectId?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export default function ArtworkMetadataForm({
  initialMetadata,
  projects,
  onSubmit,
  isUploading
}: ArtworkMetadataFormProps) {
  const [metadata, setMetadata] = useState<Partial<ArtworkMetadata>>({
    title: '',
    description: '',
    projectId: '',
    tags: [],
    ...initialMetadata
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setMetadata(prev => ({
      ...prev,
      ...initialMetadata
    }));
  }, [initialMetadata]);

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags?.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...metadata,
      created_at: metadata.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as ArtworkMetadata);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Title
          <input
            type="text"
            value={metadata.title || ''}
            onChange={e => setMetadata(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
          <textarea
            value={metadata.description || ''}
            onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Project
          <select
            value={metadata.projectId || ''}
            onChange={e => setMetadata(prev => ({ ...prev, projectId: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">No Project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tags
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add a tag"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {metadata.tags?.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isUploading ? 'Uploading...' : 'Save Metadata'}
      </button>
    </form>
  );
} 