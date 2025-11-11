import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(process.env.DATABASE_URL);

async function runMigrations() {
  try {
    // Read migrations directory
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = await fs.readdir(migrationsDir);
    
    // Sort files to ensure correct order
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('Found migration files:', migrationFiles);

    // Create migrations table
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Run each migration
    for (const file of migrationFiles) {
      const migrationExists = await sql`
        SELECT EXISTS(
          SELECT 1 FROM migrations WHERE name = ${file}
        );
      `;

      if (!migrationExists[0].exists) {
        const migrationPath = path.join(migrationsDir, file);
        const migration = await fs.readFile(migrationPath, 'utf8');
        
        console.log(`Running migration: ${file}`);
        
        // Split and execute each statement
        const statements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          // Use the function call syntax for raw SQL
          await sql(statement);
        }
        
        await sql`
          INSERT INTO migrations (name) 
          VALUES (${file});
        `;
        
        console.log(`Completed migration: ${file}`);
      } else {
        console.log(`Skipping already executed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 