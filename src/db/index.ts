import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

let _db: ReturnType<typeof drizzle> | null = null;

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_POSTGRES_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL or SUPABASE_POSTGRES_URL must be set');
      }
      const client = postgres(connectionString);
      _db = drizzle(client, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
