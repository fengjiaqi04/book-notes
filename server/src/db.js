import Database from "better-sqlite3";

const db = new Database("notes.db");

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookTitle TEXT NOT NULL,
    author TEXT NOT NULL,
    note TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

export default db;
