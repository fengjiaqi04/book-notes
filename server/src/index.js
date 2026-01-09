import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { pool, dbHealthcheck } from "./db.js";
import { requireAuth, signToken } from "./auth.js";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// ---------- Auth Routes ----------

app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email.toLowerCase(), hash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.json({ token, user });
  } catch (e) {
    // unique violation
    if (e.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(e);
    res.status(500).json({ error: "Failed to register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to login" });
  }
});

// (optional) whoami
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- Notes Routes (now per-user) ----------

// List notes for logged-in user
app.get("/api/notes", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              book_title AS "bookTitle",
              author,
              note,
              created_at AS "createdAt"
       FROM notes
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load notes" });
  }
});

// Get one note (must belong to user)
app.get("/api/notes/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const result = await pool.query(
      `SELECT id,
              book_title AS "bookTitle",
              author,
              note,
              created_at AS "createdAt"
       FROM notes
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load note" });
  }
});

// Create note (owned by user)
app.post("/api/notes", requireAuth, async (req, res) => {
  const schema = z.object({
    bookTitle: z.string().min(1),
    author: z.string().optional().default(""),
    note: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { bookTitle, author, note } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO notes (user_id, book_title, author, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 book_title AS "bookTitle",
                 author,
                 note,
                 created_at AS "createdAt"`,
      [req.user.id, bookTitle, author, note]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save note" });
  }
});

// Delete note (must belong to user)
app.delete("/api/notes/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const result = await pool.query(
      `DELETE FROM notes WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ---------- Start ----------
dbHealthcheck()
  .then((ok) => console.log("DB connected:", ok))
  .catch((e) => console.error("DB connection failed:", e.message));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS_ORIGIN = ${ORIGIN}`);
});
