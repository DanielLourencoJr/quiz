import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuiz } from "../contexts/QuizContext";
import { useProgress } from "../hooks/useProgress";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../supabase/supabaseClient";
import { getTopicColor } from "../data/defaultQuestions";

function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "1.5rem",
        maxWidth: 320, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>Reiniciar progresso?</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          Todo o seu histórico de respostas e pontuação no ranking serão apagados. Essa ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: "0.65rem",
              borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
              background: "var(--bg3)", color: "var(--text2)",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: "0.65rem",
              borderRadius: "var(--radius-sm)", border: "none",
              background: "var(--red)", color: "#fff",
              fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
              opacity: loading ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}
          >
            {loading
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: "#fff3", borderTopColor: "#fff" }} /> Apagando...</>
              : "🔄 Reiniciar"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { questions, stats, topics, loading, error, refresh } = useQuiz();
  const { answeredCount, resetProgress, hasAnswered }         = useProgress();
  const { username }                                          = useUser();
  const navigate                                              = useNavigate();

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [resetError, setResetError]         = useState("");

  const remaining = questions.length - answeredCount;
  const allDone   = questions.length > 0 && remaining === 0;
  const pct       = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const filteredPending = questions.filter(q => {
    const topicMatch = selectedTopics.length === 0 || selectedTopics.includes(q.topic);
    return topicMatch && !hasAnswered(q.id);
  });

  function toggleTopic(t) {
    setSelectedTopics(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  function handleStart() {
    navigate("/quiz", { state: { topics: selectedTopics } });
  }

  async function handleResetConfirmed() {
    console.log("Resetando usuário:", username); // ← adiciona isso
    setResetting(true);
    setResetError("");

    try {
      // Apaga scores do Supabase se o usuário estiver logado
      if (username) {
        const { error } = await supabase
          .from("scores")
          .delete()
          .eq("username", username);

        if (error) {
          console.error("[Home] Erro ao apagar scores:", error);
          setResetError("Não foi possível apagar o ranking. Tente novamente.");
          setResetting(false);
          return;
        }
      }

      // Limpa o progresso local
      resetProgress();
      setShowConfirm(false);
    } catch (err) {
      console.error("[Home] Exceção ao resetar:", err);
      setResetError("Erro inesperado. Tente novamente.");
    } finally {
      setResetting(false);
    }
  }

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
      {showConfirm && (
        <ConfirmModal
          loading={resetting}
          onConfirm={handleResetConfirmed}
          onCancel={() => { if (!resetting) { setShowConfirm(false); setResetError(""); } }}
        />
      )}

      <div className="home-hero">
        <div className="home-icon">⚗️</div>
        <h1>Quiz Interativo</h1>
        <p style={{ marginTop: "0.5rem" }}>
          Teste seus conhecimentos com questões de múltipla escolha, verdadeiro/falso e dissertativas.
        </p>
      </div>

      {/* Progress */}
      {questions.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text2)" }}>Seu progresso geral</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: allDone ? "var(--green)" : "var(--blue)" }}>
              {answeredCount} / {questions.length}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-bar-fill" style={{
              width: `${pct}%`,
              background: allDone
                ? "linear-gradient(90deg, var(--green), #34d399)"
                : "linear-gradient(90deg, var(--blue), var(--purple))",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
              {allDone ? "🎉 Todas respondidas!" : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: allDone ? "var(--green)" : "var(--text3)" }}>
              {pct}%
            </span>
          </div>

          {answeredCount > 0 && (
            <>
              <button onClick={() => { setResetError(""); setShowConfirm(true); }} style={{
                marginTop: "0.75rem", width: "100%", padding: "0.5rem",
                borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                background: "var(--bg3)", color: "var(--text3)",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              }}>
                🔄 Reiniciar progresso
              </button>
              {resetError && (
                <p style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "var(--red)", textAlign: "center" }}>
                  ⚠️ {resetError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total",         val: stats.total,         color: "var(--blue)"   },
          { label: "Objetivas",     val: stats.mc + stats.tf, color: "var(--green)"  },
          { label: "Dissertativas", val: stats.essay,         color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "0.9rem 0.5rem" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.1rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Topic selector */}
      {topics.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ color: "var(--text2)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Escolher temas
            </h3>
            {selectedTopics.length > 0 && (
              <button
                onClick={() => setSelectedTopics([])}
                style={{ fontSize: "0.75rem", color: "var(--text3)", cursor: "pointer", fontWeight: 600 }}
              >
                Limpar seleção
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {topics.map(t => {
              const color      = getTopicColor(t);
              const isSelected = selectedTopics.includes(t);
              const total      = questions.filter(q => q.topic === t).length;
              const done       = questions.filter(q => q.topic === t && hasAnswered(q.id)).length;
              const topicPct   = total > 0 ? Math.round((done / total) * 100) : 0;
              const topicDone  = done === total;

              return (
                <button
                  key={t}
                  onClick={() => toggleTopic(t)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.85rem 1rem", borderRadius: "var(--radius)",
                    border: `2px solid ${isSelected ? color : "var(--border)"}`,
                    background: isSelected ? color + "15" : "var(--card)",
                    cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                    background: color,
                    boxShadow: isSelected ? `0 0 8px ${color}80` : "none",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.875rem", fontWeight: 600,
                      color: isSelected ? color : "var(--text)",
                      marginBottom: "0.3rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {t}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--border)" }}>
                        <div style={{
                          height: "100%", borderRadius: 99, width: `${topicPct}%`,
                          background: topicDone ? "var(--green)" : color,
                          transition: "width 0.3s",
                        }} />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text3)", whiteSpace: "nowrap" }}>
                        {done}/{total}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? color : "var(--border)"}`,
                    background: isSelected ? color : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", color: "#fff", fontWeight: 700,
                    transition: "all 0.15s",
                  }}>
                    {topicDone ? "✓" : isSelected ? "✓" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTopics.length > 0 && (
            <div style={{
              marginTop: "0.75rem", padding: "0.6rem 0.9rem",
              borderRadius: "var(--radius-sm)", background: "var(--bg3)",
              border: "1px solid var(--border)",
              fontSize: "0.8rem", color: "var(--text2)",
            }}>
              {filteredPending.length === 0
                ? "✅ Todos os temas selecionados já foram respondidos!"
                : `📚 ${filteredPending.length} questões disponíveis nos temas selecionados`}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {allDone && selectedTopics.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "1.25rem", background: "rgba(16,185,129,0.08)", borderColor: "var(--green)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
            <p style={{ color: "var(--green)", fontWeight: 600, fontSize: "0.95rem" }}>
              Você respondeu todas as questões disponíveis!
            </p>
          </div>
          <button className="btn btn-primary btn-full" onClick={() => { setResetError(""); setShowConfirm(true); }} style={{ fontSize: "1.05rem" }}>
            🔄 Recomeçar do zero
          </button>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={handleStart}
          disabled={questions.length === 0 || filteredPending.length === 0}
          style={{ fontSize: "1.05rem" }}
        >
          {questions.length === 0
            ? "Nenhuma questão cadastrada"
            : filteredPending.length === 0
              ? "✅ Temas selecionados já respondidos"
              : selectedTopics.length > 0
                ? `Começar — ${selectedTopics.length} tema${selectedTopics.length !== 1 ? "s" : ""} selecionado${selectedTopics.length !== 1 ? "s" : ""} →`
                : answeredCount > 0
                  ? `Continuar Quiz → (${remaining} restante${remaining !== 1 ? "s" : ""})`
                  : "Começar Quiz →"}
        </button>
      )}

      <p style={{ textAlign: "center", fontSize: "0.8rem", marginTop: "1rem" }}>
        Use a aba <strong>Admin</strong> para adicionar ou editar questões.
      </p>
    </div>
  );
}