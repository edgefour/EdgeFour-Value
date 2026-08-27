/**
 * Lightweight DB ping for GitHub Actions keepalive.
 * Uses the same postgres.js + prepare:false pattern as src/db/index.ts
 * so Supavisor pooler URLs work (unlike raw psql URI parsing).
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
});

try {
  const rows = await sql`select 1 as keepalive`;
  const result = rows[0]?.keepalive;
  if (result !== 1) {
    console.error(`Unexpected query result (expected 1, got ${String(result)})`);
    process.exit(1);
  }
  console.log(String(result));
} finally {
  await sql.end({ timeout: 5 });
}
