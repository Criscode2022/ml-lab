import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { SCHEMA_SQL } from './schema-sql';
import { schema } from './schema';

export type AppDatabase = PostgresJsDatabase<typeof schema> | PgliteDb;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PgliteDb = any;

let pgClient: ReturnType<typeof postgres> | null = null;

export async function createPostgresDatabase(url: string): Promise<PostgresJsDatabase<typeof schema>> {
  pgClient = postgres(url, { max: 8, ssl: 'require', prepare: false, onnotice: () => undefined });
  return drizzlePg(pgClient, { schema });
}

export async function closeDatabase(): Promise<void> {
  if (pgClient) {
    await pgClient.end({ timeout: 2 });
    pgClient = null;
  }
}

export async function createPgliteDatabase(): Promise<PgliteDb> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite();
  return drizzle(client, { schema });
}

export async function ensureSchema(db: { execute: (q: never) => Promise<unknown> }): Promise<void> {
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    // drizzle execute accepts SQLWrapper; schema statements are static DDL.
    await db.execute(sql.raw(statement) as never);
  }
}

export async function createDatabaseFromEnv(): Promise<AppDatabase> {
  if (process.env.DATABASE_DRIVER === 'pglite' || !process.env.DATABASE_URL) {
    const db = await createPgliteDatabase();
    await ensureSchema(db);
    return db;
  }
  const db = await createPostgresDatabase(process.env.DATABASE_URL);
  await ensureSchema(db);
  return db;
}
