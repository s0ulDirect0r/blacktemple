'use client';

import { useEffect } from 'react';
import { useGallery } from '@/context/GalleryContext';

export default function ProjectFilter() {
  const { projects, setProjects, selectedProjectId, setSelectedProjectId } = useGallery();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };

    fetchProjects();
  }, [setProjects]);

  return (
    <div className="mb-6">
      <select
        value={selectedProjectId || ''}
        onChange={(e) => setSelectedProjectId(e.target.value || null)}
        className="w-full md:w-auto px-4 py-2 border rounded-lg"
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
} 