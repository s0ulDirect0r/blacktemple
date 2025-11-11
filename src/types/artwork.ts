export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ArtworkMetadata {
  title: string;
  description?: string;
  projectId?: string;  // optional, as some art might not belong to a project
  order?: number;      // for ordering within a project
  tags?: string[];     // for additional categorization
  created_at: string;
  updated_at: string;
}

export interface ArtworkImage {
  id: string;
  url: string;  // single URL field
  metadata: ArtworkMetadata;
} 