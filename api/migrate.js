const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getRanFilenames() {
  const r = await pool.query(`SELECT filename FROM schema_migrations ORDER BY filename ASC`);
  return new Set(r.rows.map(x => x.filename));
}

async function run() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort()
    : [];

  await ensureMigrationsTable();
  const ran = await getRanFilenames();

  for (const f of files) {
    if (ran.has(f)) continue;

    const full = path.join(dir, f);
    const sql = fs.readFileSync(full, "utf8");

    console.log(`[migrate] running ${f}...`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [f]);
      await pool.query("COMMIT");
      console.log(`[migrate] done ${f}`);
    } catch (e) {
      await pool.query("ROLLBACK");
      console.error(`[migrate] FAILED ${f}`, e);
      throw e;
    }
  }

  await pool.end();
  console.log("[migrate] all migrations applied");
}

run().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});