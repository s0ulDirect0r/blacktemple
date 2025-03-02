'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types/artwork';
import { useGallery } from '@/context/GalleryContext';

export default function ProjectManager() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { projects, fetchProjects, addProject } = useGallery();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = sessionStorage.getItem('adminSession');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json() as Project;
      addProject(newProject);
      setName('');
      setDescription('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Project Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </label>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Project
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Existing Projects</h3>
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 border rounded-md"
            >
              <h4 className="font-medium">{project.name}</h4>
              {project.description && (
                <p className="text-gray-600 mt-1">{project.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 