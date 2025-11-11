import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function verifySchema() {
  try {
    // Check table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'artworks'
      ORDER BY ordinal_position;
    `;

    console.log('Artwork table structure:');
    console.table(columns);

    // Check a sample record
    const sample = await sql`
      SELECT * FROM artworks LIMIT 1;
    `;

    console.log('\nSample record:');
    console.log(sample[0]);

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifySchema(); 