import { useEffect, useMemo, useState } from "react";
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  login,
  register,
  me,
  getToken,
  setToken,
  aiEnhanceNote,
} from "./api";

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// --- Collapsible text helpers (used for BOTH original + AI text) ---
function splitLines(text) {
  return String(text || "").replace(/\r\n/g, "\n").split("\n");
}

function isTooLong(text, maxLines = 6) {
  return splitLines(text).length > maxLines;
}

function getCollapsedText(text, maxLines = 6) {
  const lines = splitLines(text);
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + "\n…";
}

export default function App() {
  // -------- Auth state --------
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  // -------- Notes state --------
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  // -------- AI enhance/summarize --------
  const [aiNote, setAiNote] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveChoice, setSaveChoice] = useState("original"); // "original" | "ai"

  // -------- Collapse/Expand state (NEW) --------
  const [aiExpanded, setAiExpanded] = useState(false);
  const [originalExpanded, setOriginalExpanded] = useState(false);

  const canAuthSubmit = useMemo(
    () =>
      authEmail.trim() &&
      authPassword.trim().length >= (authMode === "register" ? 6 : 1),
    [authEmail, authPassword, authMode]
  );

  const canSaveChosen = useMemo(() => {
    const baseOk = bookTitle.trim() && author.trim();
    if (!baseOk) return false;
    if (saveChoice === "ai") return aiNote.trim().length > 0;
    return note.trim().length > 0;
  }, [bookTitle, author, note, aiNote, saveChoice]);

  // --- load user if token exists ---
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    me()
      .then((data) => setUser(data.user))
      .catch((e) => {
        // token invalid/expired
        setToken("");
        setTokenState("");
        setUser(null);
        setAuthStatus(String(e.message || e));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function refreshNotes() {
    const data = await listNotes();
    setNotes(data);
  }

  // Load notes only after login
  useEffect(() => {
    if (!user) return;
    refreshNotes().catch((e) => setStatus(String(e.message || e)));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (selectedId == null) {
      setSelected(null);
      return;
    }
    getNote(selectedId)
      .then((data) => {
        setSelected(data);
        // When switching notes, collapse preview by default
        setOriginalExpanded(false);
      })
      .catch((e) => setStatus(String(e.message || e)));
  }, [selectedId, user]);

  async function onDelete(id) {
    setStatus("");
    try {
      await deleteNote(id);
      if (selectedId === id) setSelectedId(null);
      await refreshNotes();
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    setAuthStatus("");

    try {
      const fn = authMode === "login" ? login : register;
      const data = await fn({ email: authEmail, password: authPassword });

      setToken(data.token);
      setTokenState(data.token);
      setUser(data.user);

      // reset auth form
      setAuthEmail("");
      setAuthPassword("");
    } catch (e) {
      setAuthStatus(String(e.message || e));
    }
  }

  function onLogout() {
    setToken("");
    setTokenState("");
    setUser(null);

    // clear app state
    setNotes([]);
    setSelectedId(null);
    setSelected(null);
    setBookTitle("");
    setAuthor("");
    setNote("");
    setStatus("");
    setAuthStatus("");

    // clear AI state
    setAiNote("");
    setAiError("");
    setAiLoading(false);
    setSaveChoice("original");

    // clear collapse state
    setAiExpanded(false);
    setOriginalExpanded(false);
  }

  async function onAiGenerate() {
    setAiError("");
    setStatus("");

    if (!note.trim()) {
      setAiError("Write something in the note box first.");
      return;
    }

    setAiLoading(true);
    try {
      const out = await aiEnhanceNote(note);
      setAiNote(out);
      setSaveChoice("ai"); // default to AI after generation
      setAiExpanded(false); // collapse by default
    } catch (e) {
      setAiError(String(e.message || e));
    } finally {
      setAiLoading(false);
    }
  }

  async function onSaveChosen(e) {
    e.preventDefault();
    setStatus("");
    setAiError("");

    const finalNote = saveChoice === "ai" ? aiNote : note;

    if (!bookTitle.trim() || !author.trim() || !finalNote.trim()) {
      setStatus("Please fill Book title, Author, and the chosen note content.");
      return;
    }

    try {
      await createNote({ bookTitle, author, note: finalNote });

      // reset form
      setBookTitle("");
      setAuthor("");
      setNote("");
      setStatus("");

      // reset AI + collapse
      setAiNote("");
      setAiError("");
      setAiLoading(false);
      setSaveChoice("original");
      setAiExpanded(false);
      setOriginalExpanded(false);

      await refreshNotes();
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f6f7fb",
      color: "#111827",
      padding: "24px 24px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    },

    container: {
      width: "100%",
      maxWidth: "none",
      margin: "0 auto",
    },

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 16,
      padding: "0 8px",
    },
    title: { margin: 0, fontSize: 34, letterSpacing: -0.5 },
    subtitle: { margin: 0, opacity: 0.7, fontSize: 14 },

    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(340px, 520px) minmax(700px, 1fr)",
      gap: 24,
      alignItems: "start",
      width: "100%",
    },

    card: {
      background: "white",
      borderRadius: 14,
      boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.06)",
      padding: 16,
      width: "100%",
    },

    cardTitle: { margin: "0 0 12px 0", fontSize: 16 },

    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.12)",
      outline: "none",
      fontSize: 14,
      background: "white",
    },

    textarea: {
      width: "100%",
      padding: "12px 12px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.12)",
      outline: "none",
      fontSize: 14,
      background: "white",
      minHeight: 360,
      resize: "vertical",
      fontFamily: "inherit",
    },

    button: (disabled) => ({
      padding: "10px 12px",
      borderRadius: 10,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "rgba(17,24,39,0.15)" : "#111827",
      color: disabled ? "rgba(17,24,39,0.55)" : "white",
      fontWeight: 700,
      fontSize: 14,
      width: "100%",
    }),

    smallBtn: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "white",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
    },

    listItem: (active) => ({
      display: "flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 12px",
      borderRadius: 12,
      border: active ? "1px solid rgba(17,24,39,0.25)" : "1px solid transparent",
      background: active ? "rgba(17,24,39,0.05)" : "transparent",
      cursor: "pointer",
    }),

    pill: { fontSize: 12, opacity: 0.75, marginTop: 4 },

    iconBtn: {
      border: "1px solid rgba(0,0,0,0.12)",
      background: "white",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
    },

    empty: { opacity: 0.7, fontSize: 14, padding: "10px 0" },

    status: {
      marginTop: 10,
      color: "#b91c1c",
      whiteSpace: "pre-wrap",
      fontSize: 13,
    },

    previewTitle: { margin: 0, fontSize: 22 },

    previewMeta: { margin: "6px 0 12px 0", opacity: 0.7, fontSize: 13 },

    previewBody: {
      margin: 0,
      whiteSpace: "pre-wrap",
      lineHeight: 1.65,
      fontSize: 14,
    },

    topRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12,
    },

    aiPanel: {
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.10)",
      background: "rgba(17,24,39,0.02)",
      padding: 12,
    },

    radioRow: {
      display: "flex",
      gap: 16,
      alignItems: "center",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "rgba(17,24,39,0.02)",
      marginTop: 10,
    },

    toggleBtn: {
      marginTop: 8,
      background: "transparent",
      border: "none",
      padding: 0,
      color: "#2563eb",
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  // ---------- AUTH SCREEN ----------
  if (!user) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.container, maxWidth: 520 }}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>📚 Book Notes</h1>
              <p style={styles.subtitle}>Log in to access your personal notes.</p>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              {authMode === "login" ? "Log in" : "Create an account"}
            </h2>

            <form onSubmit={onAuthSubmit} style={{ display: "grid", gap: 12 }}>
              <input
                style={styles.input}
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />

              <button
                type="submit"
                style={styles.button(!canAuthSubmit)}
                disabled={!canAuthSubmit}
              >
                {authMode === "login" ? "Log in" : "Register"}
              </button>

              <button
                type="button"
                style={styles.smallBtn}
                onClick={() =>
                  setAuthMode((m) => (m === "login" ? "register" : "login"))
                }
              >
                {authMode === "login"
                  ? "New here? Register instead"
                  : "Already have an account? Log in"}
              </button>
            </form>

            {authStatus ? <div style={styles.status}>{authStatus}</div> : null}

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              Password rule:{" "}
              {authMode === "register"
                ? "min 6 characters"
                : "enter your password"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- APP SCREEN ----------
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>📚 Book Notes</h1>
            <p style={styles.subtitle}>
              Quickly save notes per book. Click a note to preview.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{user.email}</div>
            <button style={styles.smallBtn} onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>

        <div style={styles.grid}>
          {/* LEFT: list */}
          <div style={styles.card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={styles.cardTitle}>Your notes</h2>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {notes.length} items
              </span>
            </div>

            {notes.length === 0 ? (
              <div style={styles.empty}>No notes yet. Create one on the right.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    style={styles.listItem(selectedId === n.id)}
                    onClick={() => setSelectedId(n.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {n.bookTitle}
                      </div>
                      <div style={styles.pill}>
                        {n.author} • {fmt(n.createdAt)}
                      </div>
                    </div>

                    <button
                      style={styles.iconBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: editor + preview */}
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Create a note</h2>

              <form onSubmit={onSaveChosen} style={{ display: "grid", gap: 12 }}>
                <div style={styles.topRow}>
                  <input
                    style={styles.input}
                    placeholder="Book title"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                  />
                  <input
                    style={styles.input}
                    placeholder="Author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </div>

                <textarea
                  style={styles.textarea}
                  placeholder="Your note (quotes, reflections, key ideas...)"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setOriginalExpanded(false); // collapse original when editing
                  }}
                />

                <button
                  type="button"
                  style={styles.button(aiLoading || !note.trim())}
                  disabled={aiLoading || !note.trim()}
                  onClick={onAiGenerate}
                >
                  {aiLoading ? "Generating..." : "AI Enhance / Summarize"}
                </button>

                {aiError ? <div style={styles.status}>{aiError}</div> : null}

                {aiNote ? (
                  <div style={styles.aiPanel}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>
                      AI note (preview)
                    </div>

                    <p style={styles.previewBody}>
                      {aiExpanded ? aiNote : getCollapsedText(aiNote, 6)}
                    </p>

                    {isTooLong(aiNote, 6) && (
                      <button
                        type="button"
                        style={styles.toggleBtn}
                        onClick={() => setAiExpanded((v) => !v)}
                      >
                        {aiExpanded ? "Show less" : "Show more"}
                      </button>
                    )}

                    <div style={styles.radioRow}>
                      <strong>Save:</strong>

                      <label
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="radio"
                          name="saveChoice"
                          checked={saveChoice === "original"}
                          onChange={() => setSaveChoice("original")}
                        />
                        Original note
                      </label>

                      <label
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="radio"
                          name="saveChoice"
                          checked={saveChoice === "ai"}
                          onChange={() => setSaveChoice("ai")}
                        />
                        AI note
                      </label>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  style={styles.button(!canSaveChosen)}
                  disabled={!canSaveChosen}
                >
                  Save {saveChoice === "ai" ? "AI note" : "original note"}
                </button>
              </form>

              {status ? <div style={styles.status}>{status}</div> : null}
            </div>

            <div style={{ position: "sticky", top: 16 }}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Preview</h2>

                {selected ? (
                  <>
                    <h3 style={styles.previewTitle}>{selected.bookTitle}</h3>
                    <div style={styles.previewMeta}>
                      {selected.author} • {fmt(selected.createdAt)}
                    </div>

                    <p style={styles.previewBody}>
                      {originalExpanded
                        ? selected.note
                        : getCollapsedText(selected.note, 10)}
                    </p>

                    {isTooLong(selected.note, 10) && (
                      <button
                        type="button"
                        style={styles.toggleBtn}
                        onClick={() => setOriginalExpanded((v) => !v)}
                      >
                        {originalExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </>
                ) : (
                  <div style={styles.empty}>
                    Click a note on the left to preview it here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
