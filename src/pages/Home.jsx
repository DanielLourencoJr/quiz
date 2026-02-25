import { useNavigate } from "react-router-dom";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";

export default function Home() {
  const { questions, stats, topics, loading, error, refresh } = useQuiz();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <div className="spinner" />
        <p style={{ color: "var(--text3)", fontSize: "0.9rem" }}>Carregando questões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <div style={{ fontSize: "2.5rem" }}>⚠️</div>
        <h2>Erro de conexão</h2>
        <p style={{ fontSize: "0.9rem" }}>{error}</p>
        <button className="btn btn-primary" onClick={refresh}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-icon">⚗️</div>
        <h1>Quiz Interativo</h1>
        <p style={{ marginTop: "0.5rem" }}>
          Teste seus conhecimentos com questões de múltipla escolha, verdadeiro/falso e dissertativas.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total",        val: stats.total,        color: "var(--blue)" },
          { label: "Objetivas",    val: stats.mc + stats.tf, color: "var(--green)" },
          { label: "Dissertativas",val: stats.essay,        color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "0.9rem 0.5rem" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.1rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.75rem", color: "var(--text2)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Temas</h3>
          <div className="home-badges">
            {topics.map(t => (
              <span key={t} className="tag" style={{
                background: getTopicColor(t) + "20",
                color: getTopicColor(t),
                border: `1px solid ${getTopicColor(t)}40`,
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Type breakdown */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>Tipos de questão</h3>
        {[
          { label: "Múltipla Escolha",   count: stats.mc,    icon: "◉", color: "var(--blue)" },
          { label: "Verdadeiro ou Falso", count: stats.tf,    icon: "⊙", color: "var(--purple)" },
          { label: "Dissertativas",       count: stats.essay, icon: "✎", color: "var(--pink)" },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: r.color, fontSize: "1.1rem", width: "1.2rem" }}>{r.icon}</span>
            <span style={{ flex: 1, fontSize: "0.9rem" }}>{r.label}</span>
            <span style={{ fontWeight: 700, color: r.color }}>{r.count}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="btn btn-primary btn-full"
        onClick={() => navigate("/quiz")}
        disabled={questions.length === 0}
        style={{ fontSize: "1.05rem", gap: "0.5rem" }}
      >
        {questions.length === 0 ? "Nenhuma questão cadastrada" : "Começar Quiz →"}
      </button>

      <p style={{ textAlign: "center", fontSize: "0.8rem", marginTop: "1rem" }}>
        Use a aba <strong>Admin</strong> para adicionar ou editar questões.
      </p>
    </div>
  );
}