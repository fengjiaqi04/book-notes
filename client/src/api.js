const BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4000/api").replace(
  /\/$/,
  ""
);

// --- token helpers ---
export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

// --- fetch wrapper that injects Authorization header when token exists ---
async function authFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Only set JSON header when we're sending a body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // If token is invalid/expired, clear it so UI can re-login
  if (res.status === 401) {
    setToken("");
  }

  return res;
}

// --- auth endpoints ---
export async function register(payload) {
  const res = await authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to register");
  return data; // { token, user }
}

export async function login(payload) {
  const res = await authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to login");
  return data; // { token, user }
}

export async function me() {
  const res = await authFetch("/me");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load user");
  return data; // { user }
}

// --- notes endpoints (now require auth) ---
export async function listNotes() {
  const res = await authFetch("/notes");
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load notes");
  return data;
}

export async function getNote(id) {
  const res = await authFetch(`/notes/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load note");
  return data;
}

export async function createNote(payload) {
  const res = await authFetch("/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to create note");
  return data;
}

export async function deleteNote(id) {
  const res = await authFetch(`/notes/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to delete note");
  return data;
}

const AI_WEBHOOK = "https://fengjiaqi04.app.n8n.cloud/webhook/booknotes-ai";

export async function aiEnhanceNote(noteText, { timeoutMs = 25000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(AI_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteText }),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) throw new Error(`AI webhook failed (${res.status}): ${raw}`);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`AI webhook did not return JSON: ${raw}`);
    }

    if (!data?.summary || typeof data.summary !== "string") {
      throw new Error("AI response missing `summary` string");
    }

    return data.summary;
  } finally {
    clearTimeout(timer);
  }
}
