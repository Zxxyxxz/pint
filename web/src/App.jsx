import { useEffect, useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function loadNotes() {
    const r = await fetch("/api/notes");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setNotes(data.notes || []);
  }

  useEffect(() => {
    loadNotes().catch((e) => setErr(String(e)));
  }, []);

  async function addNote() {
    setErr("");
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setText("");
      await loadNotes();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function deleteNote(id) {
    setErr("");
    setBusyId(id);
    try {
      const r = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!(r.status === 204 || r.ok)) throw new Error(`HTTP ${r.status}`);
      await loadNotes();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Pint</h1>

      <h2>Add a note</h2>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note..."
        style={{ padding: 8, width: 360 }}
      />
      <button onClick={addNote} style={{ marginLeft: 8, padding: "8px 12px" }}>
        Add
      </button>

      {err && <pre style={{ color: "crimson" }}>{err}</pre>}

      <h2 style={{ marginTop: 24 }}>Notes</h2>
      {notes.length === 0 ? (
        <p>No notes yet.</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {notes.map((n) => (
            <li key={n.id} style={{ marginBottom: 8 }}>
              <span>{n.text} </span>
              <small style={{ opacity: 0.6 }}>({n.at})</small>

              <button
                onClick={() => deleteNote(n.id)}
                disabled={busyId === n.id}
                style={{ marginLeft: 12, padding: "2px 8px" }}
              >
                {busyId === n.id ? "Deleting..." : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}