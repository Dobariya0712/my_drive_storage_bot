// src/lib/db/index.ts
// Drizzle ORM database client

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "test") {
  console.warn(
    "DATABASE_URL is not set. Database operations will fail. Set DATABASE_URL in .env.local"
  );
}

// Create a pg Pool with connection pooling
const pool = new Pool({
  connectionString: connectionString || "postgresql://localhost:5432/telecloud",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
export { pool };
export type DB = typeof db;
