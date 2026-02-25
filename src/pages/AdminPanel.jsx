import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";
import { showToast } from "../components/Toast";

const TYPE_LABEL = { mc: "MC", tf: "V/F", essay: "Dis." };
const TYPE_COLOR = { mc: "var(--blue)", tf: "var(--purple)", essay: "var(--pink)" };

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function AdminPanel() {
  const { isAdmin, logout }                                          = useAuth();
  const { questions, deleteQuestion, stats, loading, error, refresh } = useQuiz();
  const navigate                                                     = useNavigate();
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [filter, setFilter]       = useState("all");

  if (!isAdmin) { navigate("/admin"); return null; }

  const filtered = filter === "all"
    ? questions
    : questions.filter(q => q.type === filter);

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await deleteQuestion(id);
      showToast("Questão removida.", "success");
    } catch (err) {
      showToast(err.message || "Erro ao remover.", "error");
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  }

  return (
    <>
      <div className="top-bar">
        <h2 style={{ flex: 1 }}>Painel Admin</h2>
        <button className="icon-btn" title="Recarregar" onClick={refresh} style={{ marginRight: "0.25rem" }}>
          <RefreshIcon />
        </button>
        <button className="icon-btn" title="Sair" onClick={() => { logout(); navigate("/"); }}>
          <LogoutIcon />
        </button>
      </div>

      <div className="page">

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)",
            borderRadius: "var(--radius)", padding: "0.75rem 1rem",
            color: "#fca5a5", fontSize: "0.85rem", marginBottom: "1rem",
            display: "flex", gap: "0.5rem", alignItems: "center",
          }}>
            ⚠️ {error}
            <button onClick={refresh} style={{ marginLeft: "auto", color: "var(--red)", fontSize: "0.8rem", fontWeight: 700 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.4rem", margin: "0.75rem 0 1rem" }}>
          {[
            { label: "Total", val: stats.total, color: "var(--text)" },
            { label: "MC",    val: stats.mc,    color: "var(--blue)" },
            { label: "V/F",   val: stats.tf,    color: "var(--purple)" },
            { label: "Dis.",  val: stats.essay, color: "var(--pink)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "0.6rem 0.25rem" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ gap: "0.4rem", marginBottom: "1rem" }}
          onClick={() => navigate("/admin/add")}
        >
          <PlusIcon /> Nova Questão
        </button>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { key: "all",   label: "Todas" },
            { key: "mc",    label: "Múltipla Escolha" },
            { key: "tf",    label: "V/F" },
            { key: "essay", label: "Dissertativa" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              fontSize: "0.75rem", fontWeight: 600,
              padding: "0.3rem 0.65rem", borderRadius: "999px",
              border: `1px solid ${filter === f.key ? "var(--blue)" : "var(--border)"}`,
              background: filter === f.key ? "rgba(59,130,246,0.15)" : "var(--bg3)",
              color: filter === f.key ? "var(--blue)" : "var(--text3)",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[1,2,3].map(i => (
              <div key={i} className="q-item" style={{ opacity: 0.35 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--border)" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ height: 11, borderRadius: 6, background: "var(--border)", width: "55%" }} />
                  <div style={{ height: 10, borderRadius: 6, background: "var(--border)", width: "85%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text3)" }}>
                {filter === "all" ? "Nenhuma questão cadastrada ainda." : "Nenhuma questão desse tipo."}
              </div>
            )}
            {filtered.map(q => {
              const color = getTopicColor(q.topic);
              return (
                <div key={q.id} className="q-item" style={{ borderLeft: `3px solid ${color}` }}>
                  <div style={{
                    width: 28, height: 28, flexShrink: 0, borderRadius: 8,
                    background: "var(--bg2)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, color: "var(--text3)",
                  }}>
                    {questions.indexOf(q) + 1}
                  </div>

                  <div className="q-item-body">
                    <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                      <span className="tag" style={{
                        background: color + "20", color,
                        border: `1px solid ${color}30`, fontSize: "0.68rem",
                      }}>
                        {q.topic}
                      </span>
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 700,
                        color: TYPE_COLOR[q.type],
                        background: TYPE_COLOR[q.type] + "20",
                        border: `1px solid ${TYPE_COLOR[q.type]}30`,
                        padding: "0.15rem 0.5rem", borderRadius: "999px",
                      }}>
                        {TYPE_LABEL[q.type]}
                      </span>
                    </div>
                    <div className="q-item-text">{q.question}</div>
                  </div>

                  <div className="q-item-actions">
                    <button className="icon-btn" title="Editar" onClick={() => navigate(`/admin/edit/${q.id}`)}>
                      <EditIcon />
                    </button>
                    <button className="icon-btn danger" title="Excluir" onClick={() => setConfirmId(q.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: "1rem" }} />
      </div>

      {confirmId && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: "0.5rem" }}>Excluir questão?</h3>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Essa ação remove do banco de dados e não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-ghost btn-full" onClick={() => setConfirmId(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(confirmId)} disabled={deleting}>
                {deleting ? "Removendo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}