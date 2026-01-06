console.log("BACKEND FILE LOADED ✅");

import express from "express";
import cors from "cors";
import { z } from "zod";
import db from "./db.js";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// Validation schema
const NoteSchema = z.object({
  bookTitle: z.string().min(1).max(200),
  author: z.string().min(1).max(200),
  note: z.string().min(1).max(5000),
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// List notes (latest first)
app.get("/api/notes", (req, res) => {
  const rows = db
    .prepare("SELECT id, bookTitle, author, createdAt FROM notes ORDER BY id DESC")
    .all();
  res.json(rows);
});

// Get one note
app.get("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const row = db
    .prepare("SELECT id, bookTitle, author, note, createdAt FROM notes WHERE id = ?")
    .get(id);

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Create note
app.post("/api/notes", (req, res) => {
  const parsed = NoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { bookTitle, author, note } = parsed.data;
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO notes (bookTitle, author, note, createdAt) VALUES (?, ?, ?, ?)"
  );
  const info = stmt.run(bookTitle, author, note, createdAt);

  res.status(201).json({ id: info.lastInsertRowid, createdAt });
});

// Delete note
app.delete("/api/notes/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

