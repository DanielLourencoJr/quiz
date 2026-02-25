import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    navigate("/admin/panel");
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (login(pass)) {
        navigate("/admin/panel");
      } else {
        setError("Senha incorreta. Tente novamente.");
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="page" style={{ justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛡️</div>
        <h1>Área Admin</h1>
        <p>Entre com sua senha para gerenciar as questões do quiz.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="form-group">
          <label>Senha</label>
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(""); }}
            placeholder="••••••••"
            autoComplete="current-password"
            autoFocus
          />
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: "var(--radius-sm)", padding: "0.75rem", color: "var(--red)", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !pass}
        >
          {loading ? "Verificando…" : "Entrar →"}
        </button>
      </form>

      <div className="card" style={{ marginTop: "1.5rem", background: "var(--bg2)" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text3)", textAlign: "center" }}>
          Logue como: <strong style={{ color: "var(--text2)" }}>Admin</strong><br />
          Para poder adicionar questões.
        </p>
      </div>
    </div>
  );
}
