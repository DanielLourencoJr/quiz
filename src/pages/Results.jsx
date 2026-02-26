import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTopicColor } from "../data/defaultQuestions";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../supabase/supabaseClient";

const TYPE_LABEL = { mc: "Múltipla Escolha", tf: "Verdadeiro/Falso", essay: "Dissertativa" };

export default function Results() {
  const { state }    = useLocation();
  const navigate     = useNavigate();
  const { username } = useUser();
  const savedRef     = useRef(false);
  const [saveStatus, setSaveStatus] = useState("saving");
  const [saveError,  setSaveError]  = useState("");

  if (!state) { navigate("/"); return null; }
  const { answers, essays, questions } = state;

  const objQs   = questions.filter(q => q.type !== "essay");
  const correct = objQs.filter(q => answers[q.id] === q.answer).length;
  const total   = objQs.length;
  const pct     = total ? Math.round((correct / total) * 100) : 0;

  const medal     = pct >= 90 ? "🥇" : pct >= 70 ? "🥈" : pct >= 50 ? "🥉" : "📚";
  const msg       = pct >= 90 ? "Excelente!" : pct >= 70 ? "Muito bom!" : pct >= 50 ? "Continue estudando!" : "Revise o conteúdo!";
  const ringColor = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const R = 46, C = 52, circ = 2 * Math.PI * R;
  const offset = circ * (1 - pct / 100);

  // Tópicos únicos desta sessão (só questões objetivas)
  const sessionTopics = [...new Set(objQs.map(q => q.topic))];

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    if (!username || total === 0) {
      setSaveStatus("ok");
      return;
    }

    async function saveScore() {
      try {
        const payload = {
          username,
          correct,
          total,
          topics: sessionTopics,
        };

        console.log("[Scores] Inserindo:", payload);

        const { data, error } = await supabase
          .from("scores")
          .insert([payload])
          .select();

        if (error) {
          console.error("[Scores] Erro:", error);
          setSaveError(`${error.code} — ${error.message}`);
          setSaveStatus("error");
          return;
        }

        console.log("[Scores] OK:", data);
        setSaveStatus("ok");
      } catch (err) {
        console.error("[Scores] Exceção:", err);
        setSaveError(err.message);
        setSaveStatus("error");
      }
    }

    saveScore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const R2 = 46, C2 = 52;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{medal}</div>
        <h1 style={{ marginBottom: "0.25rem" }}>{msg}</h1>
        {username && (
          <p style={{ fontSize: "0.85rem", color: "var(--blue)", fontWeight: 600 }}>{username}</p>
        )}
        <p style={{ fontSize: "0.85rem" }}>Sessão concluída!</p>

        {/* Score ring */}
        <div className="score-ring" style={{ margin: "1.5rem auto", width: C2 * 2, height: C2 * 2 }}>
          <svg width={C2 * 2} height={C2 * 2}>
            <circle cx={C2} cy={C2} r={R2} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx={C2} cy={C2} r={R2} fill="none"
              stroke={ringColor} strokeWidth="8"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transform: `rotate(-90deg)`, transformOrigin: `${C2}px ${C2}px`, transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="score-ring-label">
            <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text)" }}>{pct}%</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{correct}/{total} obj.</span>
          </div>
        </div>

        {/* Status save */}
        <div style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
          background: "var(--bg3)",
          border: `1px solid ${saveStatus === "error" ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)", padding: "0.4rem 1rem",
          fontSize: "0.75rem",
          color: saveStatus === "error" ? "#fca5a5" : "var(--text3)",
        }}>
          {saveStatus === "saving" && "⏳ Salvando pontuação..."}
          {saveStatus === "ok"     && "📊 Pontuação salva no ranking"}
          {saveStatus === "error"  && (
            <>
              <span>⚠️ Erro ao salvar — verifique o console</span>
              {saveError && <span style={{ fontSize: "0.65rem", color: "#fca5a5" }}>{saveError}</span>}
            </>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="results-grid" style={{ marginBottom: "1.5rem" }}>
        {[
          { label: "Corretas",      val: correct,                                          color: "var(--green)"  },
          { label: "Erradas",       val: total - correct,                                  color: "var(--red)"    },
          { label: "Objetivas",     val: total,                                            color: "var(--blue)"   },
          { label: "Dissertativas", val: questions.filter(q => q.type === "essay").length, color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} className="result-stat">
            <div className="result-stat-num" style={{ color: s.color }}>{s.val}</div>
            <div className="result-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revisão */}
      <h3 style={{ marginBottom: "0.75rem", color: "var(--text2)", fontSize: "0.8rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        Revisão
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {questions.map((q) => {
          const color = getTopicColor(q.topic);
          const isObj = q.type !== "essay";
          const ok    = isObj && answers[q.id] === q.answer;
          const bad   = isObj && answers[q.id] !== undefined && !ok;
          const done  = q.type === "essay" && !!essays[q.id]?.trim();

          return (
            <div key={q.id} style={{
              background: "var(--bg3)",
              border: `1px solid ${bad ? "var(--red)" : ok ? "var(--green)" : "var(--border)"}30`,
              borderRadius: "var(--radius)", padding: "0.85rem",
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: isObj ? (ok ? "#14532d" : bad ? "#450a0a" : "var(--bg2)") : "var(--bg2)",
                color: isObj ? (ok ? "#34d399" : bad ? "#f87171" : "var(--text3)") : "var(--text3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
              }}>
                {isObj ? (ok ? "✓" : bad ? "✗" : "—") : "✎"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                  <span className="tag" style={{ background: color + "20", color, border: `1px solid ${color}30`, fontSize: "0.7rem" }}>{q.topic}</span>
                  <span className="chip" style={{ fontSize: "0.7rem" }}>{TYPE_LABEL[q.type]}</span>
                </div>
                <p style={{
                  color: "var(--text)", fontSize: "0.9rem", lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {q.question}
                </p>
                {isObj && answers[q.id] !== undefined && (
                  <p style={{ fontSize: "0.8rem", color: ok ? "var(--green)" : "var(--red)", marginTop: "0.25rem" }}>
                    {ok ? "Resposta correta!" : q.explanation}
                  </p>
                )}
                {q.type === "essay" && (
                  <p style={{ fontSize: "0.8rem", color: done ? "var(--orange)" : "var(--text3)", marginTop: "0.25rem" }}>
                    {done ? "✎ Respondida" : "— Não respondida"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          className="btn btn-primary btn-full"
          style={{ background: "linear-gradient(135deg,var(--blue),var(--purple))" }}
          onClick={() => navigate("/quiz")}
        >
          Continuar Estudando →
        </button>
        <button className="btn btn-ghost btn-full" onClick={() => navigate("/ranking")}>🏆 Ver Ranking</button>
        <button className="btn btn-ghost btn-full" onClick={() => navigate("/")}>← Voltar ao Início</button>
      </div>
      <div style={{ height: "1rem" }} />
    </div>
  );
}