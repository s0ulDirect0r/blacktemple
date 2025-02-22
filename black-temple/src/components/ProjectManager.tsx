'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types/artwork';

interface ProjectManagerProps {
  adminSecret: string;
}

export default function ProjectManager({ adminSecret }: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ADMIN_SECRET', adminSecret);
      formData.append('name', newProject.name);
      formData.append('description', newProject.description);

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to create project');

      const data = await response.json();
      setProjects(prev => [data, ...prev]);
      setNewProject({ name: '', description: '' });
    } catch (err) {
      setError('Failed to create project');
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Project Name
            <input
              type="text"
              value={newProject.name}
              onChange={e => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              value={newProject.description}
              onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
        <h2 className="text-xl font-semibold">Existing Projects</h2>
        {projects.length === 0 ? (
          <p className="text-gray-500">No projects yet</p>
        ) : (
          <div className="space-y-4">
            {projects.map(project => (
              <div
                key={project.id}
                className="p-4 border rounded-lg hover:border-blue-500 transition-colors"
              >
                <h3 className="font-medium">{project.name}</h3>
                {project.description && (
                  <p className="mt-1 text-gray-600">{project.description}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 