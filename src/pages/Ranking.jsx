import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";

const MEDALS = ["🥇", "🥈", "🥉"];

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function pctColor(p) {
  if (p >= 70) return "var(--green)";
  if (p >= 40) return "var(--orange)";
  return "var(--red)";
}

/**
 * Deduplica e agrega todas as linhas por usuário.
 * selectedTopic: se passado, soma apenas sessões que incluem esse tópico.
 * maxTotal: teto para evitar inflação por duplicatas.
 */
function aggregate(rawRows, selectedTopic, maxTotal) {
  const seen = new Set();
  const deduped = rawRows.filter(row => {
    const key = `${row.username}|${row.correct}|${row.total}|${JSON.stringify(row.topics)}|${row.created_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const map = new Map();
  for (const row of deduped) {
    const rowTopics = Array.isArray(row.topics) ? row.topics : [];
    if (selectedTopic && !rowTopics.includes(selectedTopic)) continue;

    const ex = map.get(row.username);
    if (!ex) {
      map.set(row.username, {
        username: row.username,
        correct:  row.correct ?? 0,
        total:    row.total   ?? 0,
        topics:   [...rowTopics],
      });
    } else {
      ex.correct += row.correct ?? 0;
      ex.total   += row.total   ?? 0;
      for (const t of rowTopics) {
        if (!ex.topics.includes(t)) ex.topics.push(t);
      }
    }
  }

  return [...map.values()].map(s => {
    if (maxTotal > 0 && s.total > maxTotal) {
      const ratio = maxTotal / s.total;
      return { ...s, correct: Math.round(s.correct * ratio), total: maxTotal };
    }
    return s;
  });
}

function ScoreRow({ s, rank, isMe, totalQuestions }) {
  const p         = pct(s.correct, s.total);
  const color     = pctColor(p);
  const topics    = s.topics ?? [];
  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c54" : "var(--text3)";
  const [expanded, setExpanded] = useState(false);

  const coveredPct = totalQuestions > 0
    ? Math.min(100, Math.round((s.total / totalQuestions) * 100))
    : 0;

  return (
    <div style={{
      borderRadius: "var(--radius)",
      background: isMe ? "rgba(59,130,246,0.08)" : "var(--card)",
      border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
      overflow: "hidden",
    }}>
      {/* Linha principal */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Badge rank */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: rank <= 3 ? rankColor + "20" : "var(--bg3)",
          border: `2px solid ${rank <= 3 ? rankColor : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: rank <= 3 ? "1.1rem" : "0.8rem", fontWeight: 700, color: rankColor,
        }}>
          {rank <= 3 ? MEDALS[rank - 1] : rank}
        </div>

        {/* Nome + barra */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
            <span style={{
              fontSize: "0.9rem", fontWeight: isMe ? 700 : 600,
              color: isMe ? "var(--blue)" : "var(--text)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {s.username}
            </span>
            {isMe && (
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, color: "var(--blue)",
                background: "rgba(59,130,246,0.15)", padding: "0.1rem 0.4rem",
                borderRadius: "999px", flexShrink: 0,
              }}>você</span>
            )}
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 99 }}>
            <div style={{
              height: "100%", borderRadius: 99, width: `${p}%`,
              background: color,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Placar */}
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 56 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color }}>
            {p}%
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>
            {s.correct}/{s.total}
          </div>
        </div>

        <div style={{
          color: "var(--text3)", fontSize: "0.7rem", flexShrink: 0,
          transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none",
        }}>▾</div>
      </div>

      {/* Painel expandido */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1rem", background: "var(--bg3)" }}>

          {/* Cards acertos/erros/% */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {[
              { label: "acertos",   val: s.correct,            c: "var(--green)" },
              { label: "erros",     val: s.total - s.correct,  c: "var(--red)"   },
              { label: "aproveit.", val: `${p}%`,               c: color          },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, borderRadius: "var(--radius-sm)", padding: "0.5rem",
                background: item.c + "10", border: `1px solid ${item.c}30`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: item.c }}>{item.val}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text3)" }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Cobertura do banco */}
          <div style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.25rem" }}>
              <span>📚 Questões tentadas</span>
              <span style={{ fontWeight: 700, color: "var(--text2)" }}>
                {s.total} / {totalQuestions} ({coveredPct}%)
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${coveredPct}%`, background: "var(--blue)", transition: "width 0.5s" }} />
            </div>
          </div>

          {/* Temas */}
          {topics.length > 0 && (
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginBottom: "0.35rem", fontWeight: 600 }}>
                🎯 Temas estudados ({topics.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {topics.map(t => {
                  const tc = getTopicColor(t);
                  return (
                    <span key={t} style={{
                      fontSize: "0.65rem", fontWeight: 600,
                      color: tc, background: tc + "18",
                      border: `1px solid ${tc}30`,
                      padding: "0.1rem 0.5rem", borderRadius: "999px",
                    }}>{t}</span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Ranking() {
  const { username }  = useUser();
  const { questions } = useQuiz();
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [selectedTopic, setSelectedTopic] = useState("");

  useEffect(() => {
    fetchRanking();
    window.addEventListener("focus", fetchRanking);
    return () => window.removeEventListener("focus", fetchRanking);
  }, []);

  async function fetchRanking() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("scores")
        .select("username, correct, total, topics, created_at")
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      setRawRows(data ?? []);
    } catch (err) {
      console.error("[Ranking]", err);
      setError("Não foi possível carregar o ranking.");
    } finally {
      setLoading(false);
    }
  }

  const totalByTopic = useMemo(() => {
    const map = {};
    for (const q of questions) {
      if (q.type === "essay") continue;
      map[q.topic] = (map[q.topic] ?? 0) + 1;
    }
    return map;
  }, [questions]);

  const totalObjectiveQuestions = useMemo(() =>
    questions.filter(q => q.type !== "essay").length,
  [questions]);

  const allTopics = useMemo(() =>
    [...new Set(questions.map(q => q.topic))].sort(),
  [questions]);

  const maxForFilter = selectedTopic
    ? (totalByTopic[selectedTopic] ?? 0)
    : totalObjectiveQuestions;

  const scores = useMemo(() => {
    const entries = aggregate(rawRows, selectedTopic, maxForFilter)
      .filter(s => s.total >= 1);

    return entries.sort((a, b) => {
      const pa = pct(a.correct, a.total);
      const pb = pct(b.correct, b.total);
      if (pb !== pa) return pb - pa;
      if (b.correct !== a.correct) return b.correct - a.correct;
      return b.total - a.total;
    });
  }, [rawRows, selectedTopic, maxForFilter]);

  const myRank  = scores.findIndex(s => s.username === username) + 1;
  const myScore = myRank > 0 ? scores[myRank - 1] : null;

  return (
    <div className="page">
      <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
        <h1 style={{ marginBottom: "0.25rem" }}>Ranking</h1>
        <p style={{ fontSize: "0.9rem" }}>Ordenado por % de acerto</p>
      </div>

      {/* Filtro por tópico */}
      {allTopics.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedTopic("")}
              style={{
                fontSize: "0.75rem", fontWeight: 700,
                padding: "0.35rem 0.75rem", borderRadius: "999px",
                border: `1.5px solid ${!selectedTopic ? "var(--blue)" : "var(--border)"}`,
                background: !selectedTopic ? "rgba(59,130,246,0.15)" : "var(--bg3)",
                color: !selectedTopic ? "var(--blue)" : "var(--text3)",
                cursor: "pointer",
              }}
            >
              🌐 Geral
            </button>
            {allTopics.map(t => {
              const tc = getTopicColor(t);
              const isActive = selectedTopic === t;
              return (
                <button key={t} onClick={() => setSelectedTopic(t)} style={{
                  fontSize: "0.75rem", fontWeight: 700,
                  padding: "0.35rem 0.75rem", borderRadius: "999px",
                  border: `1.5px solid ${isActive ? tc : "var(--border)"}`,
                  background: isActive ? tc + "20" : "var(--bg3)",
                  color: isActive ? tc : "var(--text3)",
                  cursor: "pointer",
                }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Minha posição */}
      {username && myRank > 0 && myScore && (
        <div className="card" style={{
          marginBottom: "1.25rem", textAlign: "center",
          background: "rgba(59,130,246,0.08)", borderColor: "var(--blue)",
        }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.2rem" }}>
            {selectedTopic ? `Sua posição em "${selectedTopic}"` : "Sua posição geral"}
          </p>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--blue)" }}>
            {myRank <= 3 ? MEDALS[myRank - 1] : `#${myRank}`}
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginTop: "0.15rem" }}>
            {myScore.correct} acertos de {myScore.total} tentadas —{" "}
            <strong style={{ color: pctColor(pct(myScore.correct, myScore.total)) }}>
              {pct(myScore.correct, myScore.total)}%
            </strong>
          </p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)",
          borderRadius: "var(--radius)", padding: "0.9rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ color: "#fca5a5", fontSize: "0.85rem", margin: 0 }}>⚠️ {error}</p>
          <button onClick={fetchRanking} style={{ color: "var(--red)", fontSize: "0.8rem", fontWeight: 700 }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: 64, borderRadius: "var(--radius)",
              background: "var(--card)", border: "1px solid var(--border)", opacity: 0.35,
            }} />
          ))}
        </div>
      )}

      {/* Vazio */}
      {!loading && scores.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
          <p>{selectedTopic ? `Ninguém respondeu "${selectedTopic}" ainda.` : "Nenhuma pontuação ainda. Seja o primeiro!"}</p>
        </div>
      )}

      {/* Lista */}
      {!loading && scores.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text3)", textAlign: "center", marginBottom: "0.25rem" }}>
            Toque em um usuário para ver detalhes
          </p>
          {scores.map((s, i) => (
            <ScoreRow
              key={s.username}
              s={s}
              rank={i + 1}
              isMe={s.username === username}
              totalQuestions={maxForFilter}
            />
          ))}
        </div>
      )}

      <button onClick={fetchRanking} className="btn btn-ghost btn-full" style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}>
        🔄 Atualizar ranking
      </button>
      <div style={{ height: "1rem" }} />
    </div>
  );
}