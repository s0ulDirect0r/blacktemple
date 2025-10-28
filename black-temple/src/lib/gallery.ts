import { sql } from '@/lib/db';
import { GALLERY_PAGE_SIZE } from '@/constants/gallery';
import { ArtworkImage, Project } from '@/types/artwork';
import { ProjectCountSummary } from '@/types/gallery';


interface ArtworkRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  project_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ProjectCountRow {
  id: string;
  name: string;
  image_count: string | number;
}
function mapRowToArtwork(row: ArtworkRow): ArtworkImage {
  return {
    id: row.id,
    url: row.url,
    metadata: {
      title: row.title,
      description: row.description ?? undefined,
      projectId: row.project_id ?? undefined,
      tags: row.tags ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function getGalleryImages({
  projectId = null,
  limit,
}: {
  projectId?: string | null;
  limit?: number;
} = {}): Promise<ArtworkImage[]> {
  const whereClause =
    projectId === 'unassigned'
      ? sql`WHERE project_id IS NULL`
      : projectId
      ? sql`WHERE project_id = ${projectId}`
      : sql``;

  let effectiveLimit: number | undefined;
  if (typeof limit === 'number' && !Number.isNaN(limit)) {
    if (limit <= 0) {
      effectiveLimit = undefined;
    } else {
      effectiveLimit = Math.min(limit, 60);
    }
  } else {
    effectiveLimit = GALLERY_PAGE_SIZE;
  }

  const limitClause = typeof effectiveLimit === 'number' ? sql`LIMIT ${effectiveLimit}` : sql``;

  const rows = await sql`
    SELECT 
      id,
      url,
      title,
      description,
      project_id,
      tags,
      created_at,
      updated_at
    FROM artworks
    ${whereClause}
    ORDER BY created_at DESC
    ${limitClause};
  `;

  return rows.map(mapRowToArtwork);
}

export async function getGalleryProjects(): Promise<Project[]> {
  const rows = await sql`
    SELECT id, name, description, created_at
    FROM projects
    ORDER BY name;
  `;

  return rows.map((row: ProjectRow) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    created_at: row.created_at,
  }));
}

export async function getProjectCountSummary(): Promise<ProjectCountSummary> {
  const [projectCounts, unassignedCount, totalCount] = await Promise.all([
    sql`
      SELECT 
        p.id,
        p.name,
        COUNT(a.id) AS image_count
      FROM projects p
      LEFT JOIN artworks a ON p.id::text = a.project_id
      GROUP BY p.id, p.name
      ORDER BY p.name;
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM artworks
      WHERE project_id IS NULL;
    `,
    sql`
      SELECT COUNT(*) AS count
      FROM artworks;
    `,
  ]);

  return {
    projects: projectCounts.map((p: ProjectCountRow) => ({
      id: p.id,
      name: p.name,
      count: Number(p.image_count),
    })),
    unassigned: Number(unassignedCount[0]?.count ?? 0),
    total: Number(totalCount[0]?.count ?? 0),
  };
}
