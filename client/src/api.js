const BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000/api").replace(/\/$/, "");


export async function listNotes() {
  const res = await fetch(`${BASE}/notes`);
  if (!res.ok) throw new Error("Failed to load notes");
  return res.json();
}

export async function getNote(id) {
  const res = await fetch(`${BASE}/notes/${id}`);
  if (!res.ok) throw new Error("Failed to load note");
  return res.json();
}

export async function createNote(payload) {
  const res = await fetch(`${BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}

export async function deleteNote(id) {
  const res = await fetch(`${BASE}/notes/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete note");
  return res.json();
}
