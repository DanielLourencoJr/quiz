import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";

const MEDALS = ["🥇", "🥈", "🥉"];
const MIN_PCT_TO_RANK = 0.30;

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function getLevel(totalAnswered) {
  if (totalAnswered >= 200) return { label: "Mestre",        emoji: "🔥", color: "#f59e0b" };
  if (totalAnswered >= 100) return { label: "Avançado",      emoji: "⚡", color: "#8b5cf6" };
  if (totalAnswered >=  50) return { label: "Intermediário", emoji: "📈", color: "#3b82f6" };
  if (totalAnswered >=  20) return { label: "Iniciante",     emoji: "🌱", color: "#10b981" };
  return                           { label: "Novato",        emoji: "🐣", color: "#94a3b8" };
}

/**
 * Agrega todas as linhas brutas em um Map<username, {correct, total, topics}>
 * Se selectedTopic for passado, considera apenas linhas que incluem esse tópico
 * e soma somente o correct/total dessas linhas.
 */
function aggregate(rawRows, selectedTopic = "") {
  const map = new Map();

  for (const row of rawRows) {
    const rowTopics = Array.isArray(row.topics) ? row.topics : [];

    // Geral: soma tudo. Por tópico: só soma sessões que têm aquele tópico
    if (selectedTopic && !rowTopics.includes(selectedTopic)) continue;

    const existing = map.get(row.username);
    if (!existing) {
      map.set(row.username, {
        username: row.username,
        correct:  row.correct  ?? 0,
        total:    row.total    ?? 0,
        topics:   [...rowTopics],
      });
    } else {
      existing.correct += row.correct ?? 0;
      existing.total   += row.total   ?? 0;
      // União de tópicos (sem duplicatas)
      for (const t of rowTopics) {
        if (!existing.topics.includes(t)) existing.topics.push(t);
      }
    }
  }

  return [...map.values()];
}

function ScoreRow({ s, rank, isMe, totalQuestions }) {
  const p      = pct(s.correct, s.total);
  const level  = getLevel(s.total);
  const topics = s.topics ?? [];
  const rankColor = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c54" : "var(--text3)";
  const [expanded, setExpanded] = useState(false);

  const overallPct = totalQuestions > 0
    ? Math.min(100, Math.round((s.total / totalQuestions) * 100))
    : 0;

  return (
    <div style={{
      borderRadius: "var(--radius)",
      background: isMe ? "rgba(59,130,246,0.08)" : "var(--card)",
      border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
      overflow: "hidden",
    }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Rank */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
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
            <span style={{
              fontSize: "0.6rem", fontWeight: 700,
              color: level.color, background: level.color + "18",
              border: `1px solid ${level.color}30`,
              padding: "0.1rem 0.45rem", borderRadius: "999px", flexShrink: 0,
            }}>
              {level.emoji} {level.label}
            </span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
            <div style={{
              height: "100%", borderRadius: 99, width: `${p}%`,
              background: p >= 70 ? "var(--green)" : p >= 40 ? "var(--orange)" : "var(--red)",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Placar */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
            {s.correct}
            <span style={{ fontSize: "0.7rem", color: "var(--text3)", fontWeight: 400 }}>/{s.total}</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{p}%</div>
        </div>

        <div style={{
          color: "var(--text3)", fontSize: "0.7rem", flexShrink: 0,
          transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none",
        }}>▾</div>
      </div>

      {/* Expandido */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1rem", background: "var(--bg3)" }}>

          {/* Progresso geral */}
          <div style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.25rem" }}>
              <span>📚 Questões respondidas</span>
              <span style={{ fontWeight: 700, color: "var(--text2)" }}>{s.total} / {totalQuestions} ({overallPct}%)</span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${overallPct}%`, background: level.color, transition: "width 0.5s" }} />
            </div>
          </div>

          {/* Próximo nível */}
          {(() => {
            const thresholds = [20, 50, 100, 200];
            const next = thresholds.find(t => t > s.total);
            if (!next) return (
              <div style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600, marginBottom: "0.5rem" }}>
                🔥 Nível máximo atingido!
              </div>
            );
            const prev     = thresholds[thresholds.indexOf(next) - 1] ?? 0;
            const prog     = Math.round(((s.total - prev) / (next - prev)) * 100);
            const nextLvl  = getLevel(next);
            return (
              <div style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.25rem" }}>
                  <span>⬆️ Próximo: {nextLvl.emoji} {nextLvl.label}</span>
                  <span style={{ fontWeight: 700, color: "var(--text2)" }}>{next - s.total} restantes</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${prog}%`, background: nextLvl.color, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })()}

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
        .select("username, correct, total, topics")
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

  // Total de questões objetivas por tópico (para calcular mínimo)
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

  // Agrega e ordena
  const scores = useMemo(() => {
    let entries = aggregate(rawRows, selectedTopic);

    // Filtro mínimo por tópico
    if (selectedTopic) {
      const topicTotal = totalByTopic[selectedTopic] ?? 0;
      const minQ       = topicTotal > 0 ? Math.ceil(topicTotal * MIN_PCT_TO_RANK) : 1;
      entries = entries.filter(s => s.total >= minQ);
    }

    // Ordena: % desc, depois acertos absolutos desc
    return entries.sort((a, b) => {
      const pa = pct(a.correct, a.total);
      const pb = pct(b.correct, b.total);
      return pb !== pa ? pb - pa : b.correct - a.correct;
    });
  }, [rawRows, selectedTopic, totalByTopic]);

  const myRank  = scores.findIndex(s => s.username === username) + 1;
  const myScore = myRank > 0 ? scores[myRank - 1] : null;

  const minQForTopic = selectedTopic
    ? Math.ceil((totalByTopic[selectedTopic] ?? 0) * MIN_PCT_TO_RANK)
    : 0;

  // Quanto o usuário já respondeu neste tópico (para barra de progresso no aviso)
  const myDoneInTopic = useMemo(() => {
    if (!selectedTopic || !username) return 0;
    return rawRows
      .filter(r => r.username === username && (r.topics ?? []).includes(selectedTopic))
      .reduce((acc, r) => acc + (r.total ?? 0), 0);
  }, [rawRows, selectedTopic, username]);

  return (
    <div className="page">
      <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
        <h1 style={{ marginBottom: "0.25rem" }}>Ranking</h1>
        <p style={{ fontSize: "0.9rem" }}>Os melhores alunos do quiz</p>
      </div>

      {/* Legenda de níveis */}
      <div style={{
        marginBottom: "1.25rem", padding: "0.6rem 0.9rem",
        borderRadius: "var(--radius-sm)", background: "var(--bg3)",
        border: "1px solid var(--border)",
        display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center",
      }}>
        {[
          { label: "Novato",        emoji: "🐣", color: "#94a3b8", min: 0   },
          { label: "Iniciante",     emoji: "🌱", color: "#10b981", min: 20  },
          { label: "Intermediário", emoji: "📈", color: "#3b82f6", min: 50  },
          { label: "Avançado",      emoji: "⚡", color: "#8b5cf6", min: 100 },
          { label: "Mestre",        emoji: "🔥", color: "#f59e0b", min: 200 },
        ].map(l => (
          <span key={l.label} style={{
            fontSize: "0.65rem", fontWeight: 600,
            color: l.color, background: l.color + "15",
            border: `1px solid ${l.color}30`,
            padding: "0.15rem 0.5rem", borderRadius: "999px",
          }}>
            {l.emoji} {l.label} ({l.min}+)
          </span>
        ))}
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
          {selectedTopic && minQForTopic > 0 && (
            <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>⚡ Mínimo para entrar:</span>
              <strong style={{ color: "var(--text2)" }}>{minQForTopic} questões</strong>
              <span>({Math.round(MIN_PCT_TO_RANK * 100)}% de {totalByTopic[selectedTopic] ?? "?"})</span>
            </div>
          )}
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
            {myScore.correct} acertos de {myScore.total} questões — {pct(myScore.correct, myScore.total)}%
          </p>
          {(() => {
            const level = getLevel(myScore.total);
            return (
              <span style={{
                display: "inline-block", marginTop: "0.4rem",
                fontSize: "0.7rem", fontWeight: 700,
                color: level.color, background: level.color + "18",
                border: `1px solid ${level.color}30`,
                padding: "0.15rem 0.6rem", borderRadius: "999px",
              }}>
                {level.emoji} {level.label}
              </span>
            );
          })()}
        </div>
      )}

      {/* Usuário não atingiu mínimo */}
      {username && selectedTopic && myRank === 0 && !loading && minQForTopic > 0 && (
        <div className="card" style={{
          marginBottom: "1.25rem", textAlign: "center",
          background: "rgba(245,158,11,0.08)", borderColor: "var(--orange)",
        }}>
          <p style={{ fontSize: "0.8rem", color: "var(--orange)", fontWeight: 600 }}>
            ⚡ Você ainda não entrou neste ranking
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "0.25rem" }}>
            {myDoneInTopic > 0
              ? <>Faltam <strong style={{ color: "var(--text2)" }}>{minQForTopic - myDoneInTopic}</strong> questões de <strong style={{ color: getTopicColor(selectedTopic) }}>{selectedTopic}</strong></>
              : <>Responda <strong style={{ color: "var(--text2)" }}>{minQForTopic} questões</strong> de <strong style={{ color: getTopicColor(selectedTopic) }}>{selectedTopic}</strong> para entrar</>
            }
          </p>
          {myDoneInTopic > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${Math.min(100, Math.round((myDoneInTopic / minQForTopic) * 100))}%`,
                  background: "var(--orange)",
                }} />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: "0.25rem", display: "block" }}>
                {myDoneInTopic} / {minQForTopic}
              </span>
            </div>
          )}
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

      {/* Loading */}
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
          <p>
            {selectedTopic
              ? `Ninguém atingiu o mínimo em "${selectedTopic}" ainda.`
              : "Nenhuma pontuação ainda. Seja o primeiro!"}
          </p>
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
              totalQuestions={totalObjectiveQuestions}
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