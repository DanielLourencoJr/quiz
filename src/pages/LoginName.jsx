import { useState } from "react";
import { useUser } from "../contexts/UserContext";

export default function LoginName() {
  const { login } = useUser();
  const [name, setName]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "1.5rem",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", padding: "2rem 1.5rem",
        display: "flex", flexDirection: "column", gap: "1.5rem",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>⚗️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>Quiz Interativo</h1>
          <p style={{ fontSize: "0.9rem" }}>Como podemos te chamar?</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="Seu nome ou apelido..."
            maxLength={30}
            autoFocus
            disabled={loading}
            style={{
              textAlign: "center", fontSize: "1.1rem", fontWeight: 600,
              borderColor: error ? "var(--red)" : undefined,
            }}
          />
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)",
              borderRadius: "var(--radius-sm)", padding: "0.6rem 0.9rem",
            }}>
              <p style={{ color: "#fca5a5", fontSize: "0.82rem", textAlign: "center", margin: 0 }}>
                ⚠️ {error}
              </p>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !name.trim()}
            style={{ marginTop: "0.25rem", fontSize: "1rem" }}
          >
            {loading
              ? <span style={{ display:"flex", alignItems:"center", gap:"0.5rem", justifyContent:"center" }}>
                  <span className="spinner" style={{ width:18, height:18, borderWidth:2 }} /> Verificando...
                </span>
              : "Entrar →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text3)", margin: 0 }}>
          Seu nome será salvo para o ranking 🏆
        </p>
      </div>
    </div>
  );
}