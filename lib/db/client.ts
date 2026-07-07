import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// `prepare: false` is recommended for the Railway/PgBouncer-style proxy.
const globalForDb = globalThis as typeof globalThis & {
  postgresClient?: ReturnType<typeof postgres>;
};

const queryClient =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    prepare: false,
    max: Number(process.env.POSTGRES_MAX_CONNECTIONS ?? 5),
  });

globalForDb.postgresClient = queryClient;

export const db = drizzle(queryClient, { schema });
export type DB = typeof db;
