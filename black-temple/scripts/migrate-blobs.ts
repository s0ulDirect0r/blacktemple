import { neon } from '@neondatabase/serverless';
import { list } from '@vercel/blob';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function migrateBlobsToDb() {
  try {
    // List all blobs
    const { blobs } = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN!
    });

    console.log(`Found ${blobs.length} blobs to migrate`);

    // Insert each blob into the database
    for (const blob of blobs) {
      const exists = await sql`
        SELECT EXISTS(
          SELECT 1 FROM artworks WHERE url = ${blob.url}
        );
      `;

      if (!exists[0].exists) {
        await sql`
          INSERT INTO artworks (
            url,
            title,
            description,
            created_at,
            updated_at
          ) VALUES (
            ${blob.url},
            ${blob.pathname},
            ${null},
            ${blob.uploadedAt},
            ${blob.uploadedAt}
          );
        `;
        console.log(`Migrated: ${blob.url}`);
      } else {
        console.log(`Skipping existing: ${blob.url}`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateBlobsToDb();
