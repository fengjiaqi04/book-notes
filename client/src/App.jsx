import { useEffect, useMemo, useState } from "react";
import { createNote, deleteNote, getNote, listNotes } from "./api";

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);

  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  const canSubmit = useMemo(
    () => bookTitle.trim() && author.trim() && note.trim(),
    [bookTitle, author, note]
  );

  async function refresh() {
    const data = await listNotes();
    setNotes(data);
  }

  useEffect(() => {
    refresh().catch((e) => setStatus(String(e.message || e)));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setSelected(null);
      return;
    }
    getNote(selectedId)
      .then(setSelected)
      .catch((e) => setStatus(String(e.message || e)));
  }, [selectedId]);

  async function onCreate(e) {
    e.preventDefault();
    setStatus("");
    try {
      await createNote({ bookTitle, author, note });
      setBookTitle("");
      setAuthor("");
      setNote("");
      await refresh();
    } catch (e) {
      setStatus(String(e.message || e));
    }
  }

  async function onDelete(id) {
    setStatus("");
    try {
      await deleteNote(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
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

    // ✅ truly full width
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

    // ✅ fills screen, gives right column much more space
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
      width: "100%", // ✅ allow cards to expand fully
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
      minHeight: 360, // ✅ bigger so right side feels full
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
  };

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
          <div style={{ opacity: 0.6, fontSize: 13 }}>
            Backend: <code>localhost:4000</code>
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

              <form onSubmit={onCreate} style={{ display: "grid", gap: 12 }}>
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
                  onChange={(e) => setNote(e.target.value)}
                />

                <button
                  type="submit"
                  style={styles.button(!canSubmit)}
                  disabled={!canSubmit}
                >
                  Save note
                </button>
              </form>

              {status ? <div style={styles.status}>{status}</div> : null}
            </div>

            {/* ✅ make preview sticky so right side feels full while scrolling */}
            <div style={{ position: "sticky", top: 16 }}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Preview</h2>

                {selected ? (
                  <>
                    <h3 style={styles.previewTitle}>{selected.bookTitle}</h3>
                    <div style={styles.previewMeta}>
                      {selected.author} • {fmt(selected.createdAt)}
                    </div>
                    <p style={styles.previewBody}>{selected.note}</p>
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

        {/* extra bottom padding so it doesn’t feel cut off */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
