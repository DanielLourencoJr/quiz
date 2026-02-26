import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuiz } from "../contexts/QuizContext";
import { useProgress } from "../hooks/useProgress";
import { getTopicColor } from "../data/defaultQuestions";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";

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
  const { questions }                 = useQuiz();
  const { hasAnswered, markAnswered } = useProgress();
  const { username }                  = useUser();
  const navigate                      = useNavigate();
  const location                      = useLocation();

  const selectedTopics = location.state?.topics ?? [];

  const pending = useMemo(() => {
    return questions.filter(q => {
      const topicMatch = selectedTopics.length === 0 || selectedTopics.includes(q.topic);
      return topicMatch && !hasAnswered(q.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  const [idx, setIdx]           = useState(0);
  const [answers, setAnswers]   = useState({});
  const [revealed, setRevealed] = useState({});
  const [essays, setEssays]     = useState({});
  const [models, setModels]     = useState({});

  // Ref sempre atualizado com o estado mais recente (para uso no cleanup/beforeunload)
  const stateRef = useRef({ answers: {}, pending, username });
  useEffect(() => {
    stateRef.current = { answers, pending, username };
  }, [answers, pending, username]);

  // Flag para evitar double-save (saída + chegada em Results)
  const savedRef = useRef(false);

  // ── Função de save parcial ──────────────────────────────────────────────────
  const savePartial = useCallback(async (currentAnswers, currentPending, currentUsername) => {
    if (savedRef.current) return;

    const objQs   = currentPending.filter(q => q.type !== "essay");
    const answered = objQs.filter(q => currentAnswers[q.id] !== undefined);

    // Só salva se houve pelo menos 1 resposta objetiva
    if (!currentUsername || answered.length === 0) return;

    savedRef.current = true;

    const correct = answered.filter(q => currentAnswers[q.id] === q.answer).length;
    const total   = answered.length;
    const topics  = [...new Set(answered.map(q => q.topic))];

    const payload = { username: currentUsername, correct, total, topics };
    console.log("[QuizPage] Salvando saída parcial:", payload);

    try {
      const { error } = await supabase.from("scores").insert([payload]);
      if (error) console.error("[QuizPage] Erro ao salvar parcial:", error);
      else console.log("[QuizPage] Parcial salvo OK");
    } catch (err) {
      console.error("[QuizPage] Exceção ao salvar parcial:", err);
    }
  }, []);

  // ── Save síncrono via sendBeacon (para fechar aba/janela) ──────────────────
  // sendBeacon é o único método que funciona com garantia no beforeunload
  const saveBeacon = useCallback(() => {
    if (savedRef.current) return;
    const { answers: ans, pending: pend, username: user } = stateRef.current;

    const objQs   = pend.filter(q => q.type !== "essay");
    const answered = objQs.filter(q => ans[q.id] !== undefined);
    if (!user || answered.length === 0) return;

    savedRef.current = true;

    const correct = answered.filter(q => ans[q.id] === q.answer).length;
    const total   = answered.length;
    const topics  = [...new Set(answered.map(q => q.topic))];

    // sendBeacon funciona mesmo durante o unload da página
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const blob = new Blob(
      [JSON.stringify({ username: user, correct, total, topics })],
      { type: "application/json" }
    );
    navigator.sendBeacon(
      `${supabaseUrl}/rest/v1/scores`,
      // sendBeacon não suporta headers customizados nativamente,
      // então usamos fetch em keepalive como fallback mais confiável
    );

    // Fallback keepalive (funciona na maioria dos casos modernos)
    fetch(`${supabaseUrl}/rest/v1/scores`, {
      method: "POST",
      keepalive: true,          // ← chave: mantém a requisição mesmo após unload
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ username: user, correct, total, topics }),
    }).catch(() => {}); // silencia erros (página pode já estar fechando)
  }, []);

  // ── Registra os listeners de saída ────────────────────────────────────────
  useEffect(() => {
    // Fechar aba / F5 / navegar para outra origem
    window.addEventListener("beforeunload", saveBeacon);

    return () => {
      window.removeEventListener("beforeunload", saveBeacon);

      // Navegar para outra rota dentro do app (voltar, ir pro ranking, etc.)
      // Só salva se ainda não foi salvo (ex: não veio de goNext → Results)
      const { answers: ans, pending: pend, username: user } = stateRef.current;
      savePartial(ans, pend, user);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lógica normal do quiz ─────────────────────────────────────────────────
  if (pending.length === 0) {
    return (
      <div className="page" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <div style={{ fontSize: "3rem" }}>🎉</div>
        <h2>Tudo respondido!</h2>
        <p style={{ margin: "0.5rem 0 1.5rem" }}>
          {selectedTopics.length > 0
            ? "Você já respondeu todas as questões dos temas selecionados."
            : "Você já respondeu todas as questões disponíveis."}
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
    markAnswered(q.id);
    if (isLast) {
      // Marca como salvo para o cleanup do useEffect não salvar de novo
      savedRef.current = true;
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
              {selectedTopics.length > 0 && (
                <span style={{ color: "var(--text3)", fontWeight: 400 }}>
                  {" "}· {selectedTopics.length} tema{selectedTopics.length !== 1 ? "s" : ""}
                </span>
              )}
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
                if (isRight)    cls += " correct";
                else if (isSel) cls += " wrong";
              } else if (isSel) cls += " selected";

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
                if (isRight)    cls += " correct";
                else if (isSel) cls += " wrong";
              } else if (isSel) cls += " selected";

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

        {/* Nav */}
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