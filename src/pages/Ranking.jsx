import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";

const MEDALS = ["🥇", "🥈", "🥉"];

// Mínimo de questões respondidas para entrar no ranking de um tema (30%)
const MIN_PCT_TO_RANK = 0.30;

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function ScoreRow({ s, rank, isMe }) {
  const p     = pct(s.correct, s.total);
  const color = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c54" : "var(--text3)";
  const topics = s.topics ?? [];

  return (
    <div style={{
      borderRadius: "var(--radius)",
      background: isMe ? "rgba(59,130,246,0.08)" : "var(--card)",
      border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
      overflow: "hidden",
    }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem" }}>
        {/* Rank badge */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: rank <= 3 ? color + "20" : "var(--bg3)",
          border: `2px solid ${rank <= 3 ? color : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: rank <= 3 ? "1.1rem" : "0.8rem",
          fontWeight: 700, color,
        }}>
          {rank <= 3 ? MEDALS[rank - 1] : rank}
        </div>

        {/* Name + bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
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
          <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
            <div style={{
              height: "100%", borderRadius: 99, width: `${p}%`,
              background: p >= 70 ? "var(--green)" : p >= 40 ? "var(--orange)" : "var(--red)",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
            {s.correct}
            <span style={{ fontSize: "0.7rem", color: "var(--text3)", fontWeight: 400 }}>/{s.total}</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{p}%</div>
        </div>
      </div>

      {/* Topics row */}
      {topics.length > 0 && (
        <div style={{
          padding: "0.4rem 1rem 0.6rem",
          borderTop: "1px solid var(--border)",
          display: "flex", flexWrap: "wrap", gap: "0.3rem",
        }}>
          {topics.map(t => {
            const tc = getTopicColor(t);
            return (
              <span key={t} style={{
                fontSize: "0.65rem", fontWeight: 600,
                color: tc, background: tc + "18",
                border: `1px solid ${tc}30`,
                padding: "0.1rem 0.5rem", borderRadius: "999px",
              }}>
                {t}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Ranking() {
  const { username }  = useUser();
  const { questions } = useQuiz();
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedTopic, setSelectedTopic] = useState("");

  useEffect(() => { fetchRanking(); }, []);

  async function fetchRanking() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("scores")
        .select("*")
        .order("correct", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      setAllScores(data ?? []);
    } catch {
      setError("Não foi possível carregar o ranking.");
    } finally {
      setLoading(false);
    }
  }

  // Total de questões objetivas por tema
  const totalByTopic = useMemo(() => {
    const map = {};
    for (const q of questions) {
      if (q.type === "essay") continue;
      map[q.topic] = (map[q.topic] ?? 0) + 1;
    }
    return map;
  }, [questions]);

  const allTopics = useMemo(() => {
    const set = new Set();
    for (const s of allScores) {
      for (const t of s.topics ?? []) set.add(t);
    }
    return [...set].sort();
  }, [allScores]);

  const scores = useMemo(() => {
    const map = new Map();

    for (const row of allScores) {
      const existing = map.get(row.username);

      if (!selectedTopic) {
        // Modo Geral: soma todas as sessões
        if (!existing) {
          map.set(row.username, {
            ...row,
            correct: row.correct,
            total:   row.total,
            topics:  [...(row.topics ?? [])],
          });
        } else {
          existing.correct += row.correct;
          existing.total   += row.total;
          for (const t of row.topics ?? []) {
            if (!existing.topics.includes(t)) existing.topics.push(t);
          }
        }
      } else {
        // Modo tema: soma só sessões que incluem esse tema
        if (!(row.topics ?? []).includes(selectedTopic)) continue;
        if (!existing) {
          map.set(row.username, {
            ...row,
            correct: row.correct,
            total:   row.total,
            topics:  [...(row.topics ?? [])],
          });
        } else {
          existing.correct += row.correct;
          existing.total   += row.total;
        }
      }
    }

    let entries = [...map.values()];

    // Filtra pelo mínimo de questões no tema selecionado
    if (selectedTopic) {
      const topicTotal = totalByTopic[selectedTopic] ?? 0;
      const minQ       = topicTotal > 0 ? Math.ceil(topicTotal * MIN_PCT_TO_RANK) : 1;
      entries = entries.filter(s => s.total >= minQ);
    }

    // Ordena por % → desempate por acertos absolutos
    return entries.sort((a, b) => {
      const pa = pct(a.correct, a.total);
      const pb = pct(b.correct, b.total);
      if (pb !== pa) return pb - pa;
      return b.correct - a.correct;
    });
  }, [allScores, selectedTopic, totalByTopic]);

  const myRank  = scores.findIndex(s => s.username === username) + 1;
  const myScore = myRank > 0 ? scores[myRank - 1] : null;

  const minQForTopic = selectedTopic
    ? Math.ceil((totalByTopic[selectedTopic] ?? 0) * MIN_PCT_TO_RANK)
    : 0;

  // Quanto o usuário já fez nesse tema
  const myDoneInTopic = useMemo(() => {
    if (!selectedTopic || !username) return 0;
    return allScores
      .filter(s => s.username === username && (s.topics ?? []).includes(selectedTopic))
      .reduce((acc, r) => acc + r.total, 0);
  }, [allScores, selectedTopic, username]);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: "center", padding: "2rem 0 1rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
        <h1 style={{ marginBottom: "0.25rem" }}>Ranking</h1>
        <p style={{ fontSize: "0.9rem" }}>Os melhores alunos do quiz</p>
      </div>

      {/* Topic filter */}
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
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              🌐 Geral
            </button>
            {allTopics.map(t => {
              const tc       = getTopicColor(t);
              const isActive = selectedTopic === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTopic(t)}
                  style={{
                    fontSize: "0.75rem", fontWeight: 700,
                    padding: "0.35rem 0.75rem", borderRadius: "999px",
                    border: `1.5px solid ${isActive ? tc : "var(--border)"}`,
                    background: isActive ? tc + "20" : "var(--bg3)",
                    color: isActive ? tc : "var(--text3)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Aviso do mínimo */}
          {selectedTopic && minQForTopic > 0 && (
            <div style={{
              marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--text3)",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <span>⚡</span>
              <span>
                Mínimo para entrar:{" "}
                <strong style={{ color: "var(--text2)" }}>{minQForTopic} questões</strong>
                {" "}({Math.round(MIN_PCT_TO_RANK * 100)}% de {totalByTopic[selectedTopic] ?? "?"})
              </span>
            </div>
          )}
        </div>
      )}

      {/* My position */}
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
          {(myScore.topics ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", justifyContent: "center", marginTop: "0.5rem" }}>
              {myScore.topics.map(t => {
                const tc = getTopicColor(t);
                return (
                  <span key={t} style={{
                    fontSize: "0.65rem", fontWeight: 600, color: tc,
                    background: tc + "18", border: `1px solid ${tc}30`,
                    padding: "0.1rem 0.5rem", borderRadius: "999px",
                  }}>{t}</span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Usuário ainda não atingiu o mínimo no tema */}
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
              ? <>Faltam <strong style={{ color: "var(--text2)" }}>{minQForTopic - myDoneInTopic} questão{minQForTopic - myDoneInTopic !== 1 ? "ões" : ""}</strong> de <strong style={{ color: getTopicColor(selectedTopic) }}>{selectedTopic}</strong> para aparecer aqui.</>
              : <>Responda pelo menos <strong style={{ color: "var(--text2)" }}>{minQForTopic} questões</strong> de <strong style={{ color: getTopicColor(selectedTopic) }}>{selectedTopic}</strong> para entrar no ranking.</>
            }
          </p>
          {myDoneInTopic > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${Math.min(100, Math.round((myDoneInTopic / minQForTopic) * 100))}%`,
                  background: "var(--orange)", transition: "width 0.5s",
                }} />
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: "0.25rem", display: "block" }}>
                {myDoneInTopic} / {minQForTopic}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
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

      {/* Empty */}
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

      {/* List */}
      {!loading && scores.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {scores.map((s, i) => (
            <ScoreRow
              key={s.id ?? s.username}
              s={s}
              rank={i + 1}
              isMe={s.username === username}
            />
          ))}
        </div>
      )}

      <button
        onClick={fetchRanking}
        className="btn btn-ghost btn-full"
        style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}
      >
        🔄 Atualizar ranking
      </button>

      <div style={{ height: "1rem" }} />
    </div>
  );
}