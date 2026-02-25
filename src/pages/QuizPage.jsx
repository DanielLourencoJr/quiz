import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuiz } from "../contexts/QuizContext";
import { useProgress } from "../hooks/useProgress";
import { getTopicColor } from "../data/defaultQuestions";

const TYPE_LABEL = { mc: "Múltipla Escolha", tf: "Verdadeiro ou Falso", essay: "Dissertativa" };
const TYPE_ICON  = { mc: "◉", tf: "⊙", essay: "✎" };

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

export default function QuizPage() {
  const { questions } = useQuiz();
  const { hasAnswered, markAnswered, answeredCount } = useProgress();
  const navigate = useNavigate();

  // Filtra questões ainda não respondidas
  const pending = useMemo(
    () => questions.filter(q => !hasAnswered(q.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions] // recalcula só quando questions muda, não a cada resposta
  );

  const [idx, setIdx]         = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [essays, setEssays]   = useState({});
  const [models, setModels]   = useState({});

  // Sem questões pendentes
  if (pending.length === 0) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <div style={{ fontSize: "3rem" }}>🎉</div>
        <h2>Tudo respondido!</h2>
        <p style={{ margin: "0.5rem 0 1.5rem" }}>
          Você já respondeu todas as questões disponíveis.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>← Voltar ao Início</button>
      </div>
    );
  }

  const q          = pending[idx];
  const total      = pending.length;
  const progress   = (idx / total) * 100;
  const topicColor = getTopicColor(q.topic);
  const isLast     = idx === total - 1;
  const isRevealed = !!revealed[q.id];
  const chosen     = answers[q.id];
  const isCorrect  = isRevealed && chosen === q.answer;

  function answer(val) {
    if (revealed[q.id]) return;
    setAnswers(a => ({ ...a, [q.id]: val }));
    setRevealed(r => ({ ...r, [q.id]: true }));
  }

  function goNext() {
    // Marca como respondida ao avançar (ou finalizar)
    markAnswered(q.id);

    if (isLast) {
      // Marca a última antes de ir para resultados
      navigate("/results", { state: { answers, essays, questions: pending } });
    } else {
      setIdx(i => i + 1);
      window.scrollTo(0, 0);
    }
  }

  function goPrev() {
    if (idx > 0) { setIdx(i => i - 1); window.scrollTo(0, 0); }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div className="top-bar" style={{ maxWidth: "100%", padding: "0.7rem 1rem" }}>
        <button className="icon-btn" onClick={() => navigate("/")} style={{ flexShrink: 0 }}>
          <BackIcon />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)", fontWeight: 600 }}>
              {idx + 1} / {total}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "1rem", paddingBottom: "6rem" }}>

        {/* Topic + type */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <span className="tag" style={{ background: topicColor + "20", color: topicColor, border: `1px solid ${topicColor}40` }}>
            {q.topic}
          </span>
          <span className="chip">{TYPE_ICON[q.type]} {TYPE_LABEL[q.type]}</span>
        </div>

        {/* Question */}
        <div className="card" style={{ borderLeft: `3px solid ${topicColor}`, marginBottom: "1rem" }}>
          <p style={{ color: "var(--text)", fontSize: "1rem", lineHeight: "1.65" }}>{q.question}</p>
        </div>

        {/* Multiple Choice */}
        {q.type === "mc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {q.options.map((opt, i) => {
              const isRight = i === q.answer;
              const isSel   = chosen === i;
              let cls = "answer-btn";
              if (isRevealed) {
                if (isRight)     cls += " correct";
                else if (isSel)  cls += " wrong";
              } else if (isSel)  cls += " selected";

              return (
                <button key={i} className={cls} onClick={() => answer(i)} disabled={isRevealed}>
                  <span className="answer-letter">
                    {isRevealed && isRight ? "✓" : isRevealed && isSel ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* True / False */}
        {q.type === "tf" && (
          <div className="tf-grid">
            {[true, false].map(val => {
              const isRight = val === q.answer;
              const isSel   = chosen === val;
              let cls = "tf-btn";
              if (isRevealed) {
                if (isRight)     cls += " correct";
                else if (isSel)  cls += " wrong";
              } else if (isSel)  cls += " selected";

              return (
                <button key={String(val)} className={cls} onClick={() => answer(val)} disabled={isRevealed}>
                  <span className="tf-icon">{val ? "✓" : "✗"}</span>
                  {val ? "Verdadeiro" : "Falso"}
                </button>
              );
            })}
          </div>
        )}

        {/* Essay */}
        {q.type === "essay" && (
          <div>
            {q.tips?.length > 0 && (
              <div className="card" style={{ marginBottom: "0.75rem", background: "var(--bg2)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text3)", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "0.5rem" }}>
                  💡 DICAS
                </div>
                {q.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: "0.9rem", color: "var(--text2)", display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: topicColor }}>›</span> {tip}
                  </div>
                ))}
              </div>
            )}
            <textarea
              value={essays[q.id] || ""}
              onChange={e => setEssays(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Escreva sua resposta aqui..."
              rows={5}
              style={{ borderColor: essays[q.id]?.trim() ? topicColor + "80" : undefined, marginBottom: "0.5rem" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
                {(essays[q.id] || "").trim().split(/\s+/).filter(Boolean).length} palavras
              </span>
              {q.model && (
                <button
                  onClick={() => setModels(m => ({ ...m, [q.id]: !m[q.id] }))}
                  style={{
                    fontSize: "0.85rem", color: topicColor,
                    border: `1px solid ${topicColor}60`,
                    borderRadius: "var(--radius-sm)",
                    padding: "0.3rem 0.75rem",
                  }}
                >
                  {models[q.id] ? "Ocultar" : "Ver"} gabarito
                </button>
              )}
            </div>
            {models[q.id] && q.model && (
              <div className="card" style={{ background: topicColor + "15", borderColor: topicColor + "40" }}>
                <div style={{ fontSize: "0.75rem", color: topicColor, fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                  RESPOSTA MODELO
                </div>
                <p style={{ color: "var(--text)", fontSize: "0.9rem", lineHeight: "1.65" }}>{q.model}</p>
              </div>
            )}
          </div>
        )}

        {/* Explanation */}
        {isRevealed && q.type !== "essay" && q.explanation && (
          <div className={`explanation ${isCorrect ? "correct" : "wrong"}`}>
            <span className="explanation-label">{isCorrect ? "✓ CORRETO!" : "✗ INCORRETO"}</span>
            {q.explanation}
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          {idx > 0 && (
            <button className="btn btn-ghost" onClick={goPrev} style={{ flex: "none" }}>
              ← Anterior
            </button>
          )}
          <button
            className={`btn btn-full ${isLast ? "btn-primary" : "btn-ghost"}`}
            onClick={goNext}
            style={{
              flex: 1,
              background: isLast ? "linear-gradient(135deg,var(--blue),var(--purple))" : undefined,
              color: isLast ? "#fff" : undefined,
              border: isLast ? "none" : undefined,
            }}
          >
            {isLast ? "Ver Resultado →" : "Próxima →"}
          </button>
        </div>

        {/* Dot nav */}
        <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginTop: "1rem", flexWrap: "wrap" }}>
          {pending.map((qq, i) => {
            const done = qq.type === "essay"
              ? !!essays[qq.id]?.trim()
              : answers[qq.id] !== undefined;
            return (
              <button
                key={i}
                onClick={() => { setIdx(i); window.scrollTo(0, 0); }}
                style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: i === idx ? topicColor : done ? "var(--border2)" : "var(--border)",
                  transition: "background 0.2s",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}