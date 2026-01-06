import express from "express";
import cors from "cors";
import { z } from "zod";
import db from "./db.js";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const app = express(); 

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// ---------- Routes ----------

// List all notes
app.get("/api/notes", (req, res) => {
  const rows = db
    .prepare("SELECT id, bookTitle, author, note, createdAt FROM notes ORDER BY id DESC")
    .all();
  res.json(rows);
});

// Get one note
app.get("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare("SELECT id, bookTitle, author, note, createdAt FROM notes WHERE id = ?")
    .get(id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Create note
app.post("/api/notes", (req, res) => {
  const schema = z.object({
    bookTitle: z.string().min(1),
    author: z.string().optional().default(""),
    note: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { bookTitle, author, note } = parsed.data;
  const createdAt = new Date().toISOString();

  const info = db
    .prepare("INSERT INTO notes (bookTitle, author, note, createdAt) VALUES (?, ?, ?, ?)")
    .run(bookTitle, author, note, createdAt);

  res.json({ id: info.lastInsertRowid, bookTitle, author, note, createdAt });
});

// Delete note
app.delete("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS_ORIGIN = ${ORIGIN}`);
});
