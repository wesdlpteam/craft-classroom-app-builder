import { neon } from "@neondatabase/serverless";

let _sql = null;
let _ready = false;

export function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Table lives in the same Neon cluster as Springboard but is entirely its own.
export async function ensureTable() {
  if (_ready) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS craft_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ts timestamptz NOT NULL DEFAULT now(),
      event text NOT NULL,
      years text,
      subject text,
      activity text
    )`;
  _ready = true;
}
