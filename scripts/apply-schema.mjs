import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sqlText = readFileSync(join(root, 'packages/db/src/schema-sql.ts'), 'utf8');
const match = sqlText.match(/export const SCHEMA_SQL = `([\s\S]*?)`;/);
if (!match) throw new Error('SCHEMA_SQL not found');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing');
const client = postgres(url, { ssl: 'require', max: 1 });
const statements = match[1]
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
for (const statement of statements) {
  await client.unsafe(statement);
}
await client.end();
console.log('schema applied', statements.length, 'statements');
