// src/lib/db/index.ts
// Drizzle ORM database client

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "test") {
  console.warn(
    "DATABASE_URL is not set. Database operations will fail. Set DATABASE_URL in Vercel / .env.local"
  );
}

// Global caching for connection pool in serverless environments
declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined;
}

const pool =
  global.__db_pool ||
  new Pool({
    connectionString: connectionString || "postgresql://localhost:5432/telecloud",
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl:
      !connectionString ||
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.__db_pool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
export type DB = typeof db;

