const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// Postgres connection
// --------------------
// Uses your docker-compose env vars:
// PGHOST=db, PGPORT=5432, PGUSER=pint, PGPASSWORD=pintpass, PGDATABASE=pintdb
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// --------------------
// Create tables if missing
// --------------------
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGSERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("DB ready: tables notes, messages");
}

// --------------------
// Routes
// --------------------
app.get("/health", async (req, res) => {
  try {
    // quick DB ping too
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "api", db: "ok", time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, service: "api", db: "down", error: String(e) });
  }
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from API 👋" });
});

app.get("/api/info", (req, res) => {
  res.json({
    time: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: process.platform,
  });
});

// ---------- NOTES (Postgres) ----------
app.get("/api/notes", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, text, created_at
       FROM notes
       ORDER BY created_at DESC
       LIMIT 200`
    );

    res.json({
      notes: result.rows.map((r) => ({
        id: String(r.id),
        text: r.text,
        at: r.created_at.toISOString(),
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "text is required" });

    const result = await pool.query(
      `INSERT INTO notes (text) VALUES ($1)
       RETURNING id, text, created_at`,
      [text]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: String(row.id),
      text: row.text,
      at: row.created_at.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const id = String(req.params.id).trim();
    if (!id) return res.status(400).json({ error: "id is required" });

    const result = await pool.query(
      "DELETE FROM notes WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    return res.status(204).send(); // no content
  } catch (e) {
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});
// ---------- MESSAGES (Postgres) ----------
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, text, created_at
       FROM messages
       ORDER BY created_at DESC
       LIMIT 200`
    );

    const msgs = result.rows.map((r) => ({
      id: String(r.id),
      text: r.text,
      at: r.created_at.toISOString(),
    }));

    res.json({ count: msgs.length, messages: msgs });
  } catch (e) {
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "text is required" });

    const result = await pool.query(
      `INSERT INTO messages (text) VALUES ($1)
       RETURNING id, text, created_at`,
      [text]
    );

    const row = result.rows[0];
    res.json({
      id: String(row.id),
      text: row.text,
      at: row.created_at.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: "db_error", detail: String(e) });
  }
});

// ---------- ECHO (no DB, just test) ----------
app.post("/api/echo", (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Please send { text: string }" });
  }

  res.json({
    received: text,
    length: text.length,
    at: new Date().toISOString(),
  });
});

// Helpful 404
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
  });
});

// --------------------
// Start
// --------------------
const { execSync } = require("child_process");
const PORT = process.env.PORT || 3001;

(async () => {
  try {
    // run migrations before server starts
    execSync("node migrate.js", { stdio: "inherit" });

    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  } catch (e) {
    console.error("Startup failed:", e);
    process.exit(1);
  }
})();