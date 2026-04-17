import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

let _db: ReturnType<typeof drizzle> | null = null;

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const connectionString = process.env.SUPABASE_POSTGRES_URL ?? process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('SUPABASE_POSTGRES_URL or DATABASE_URL must be set');
      }
      const client = postgres(connectionString, {
        prepare: false,       // required for connection poolers (Supavisor/PgBouncer)
        idle_timeout: 20,     // close idle connections after 20s
        connect_timeout: 10,  // fail fast instead of hanging for 30s
      });
      _db = drizzle(client, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
