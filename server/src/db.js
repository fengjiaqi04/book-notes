import "dotenv/config";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in server/.env");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function dbHealthcheck() {
  const res = await pool.query("SELECT 1 as ok;");
  return res.rows?.[0]?.ok === 1;
}
