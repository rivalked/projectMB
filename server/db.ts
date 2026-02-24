import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool);
}

export type DbClient = ReturnType<typeof createDb>;



