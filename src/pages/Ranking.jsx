import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useUser } from "../contexts/UserContext";

const MEDALS = ["🥇", "🥈", "🥉"];

function pct(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

export default function Ranking() {
  const { username } = useUser();
  const [scores, setScores]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

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
        .limit(50);
      if (error) throw error;

      // Agrupa por username — mantém apenas o melhor score de cada pessoa
      const map = new Map();
      for (const row of data ?? []) {
        const existing = map.get(row.username);
        if (!existing || row.correct > existing.correct) {
          map.set(row.username, row);
        }
      }

      setScores([...map.values()].sort((a, b) => {
        if (b.correct !== a.correct) return b.correct - a.correct;
        return pct(b.correct, b.total) - pct(a.correct, a.total);
      }));
    } catch (err) {
      setError("Não foi possível carregar o ranking.");
    } finally {
      setLoading(false);
    }
  }

  const myRank = scores.findIndex(s => s.username === username) + 1;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
        <h1 style={{ marginBottom: "0.25rem" }}>Ranking</h1>
        <p style={{ fontSize: "0.9rem" }}>Os melhores alunos do quiz</p>
      </div>

      {/* My position banner */}
      {username && myRank > 0 && (
        <div className="card" style={{
          marginBottom: "1.5rem", textAlign: "center",
          background: "rgba(59,130,246,0.08)", borderColor: "var(--blue)",
        }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Sua posição</p>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--blue)" }}>
            {myRank <= 3 ? MEDALS[myRank - 1] : `#${myRank}`}
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginTop: "0.15rem" }}>
            {scores[myRank - 1]?.correct} acertos de {scores[myRank - 1]?.total} questões
            ({pct(scores[myRank - 1]?.correct, scores[myRank - 1]?.total)}%)
          </p>
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

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.85rem 1rem", borderRadius: "var(--radius)",
              background: "var(--card)", border: "1px solid var(--border)",
              opacity: 0.35,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--border)" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ height: 12, width: "40%", borderRadius: 6, background: "var(--border)" }} />
                <div style={{ height: 10, width: "60%", borderRadius: 6, background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {!loading && scores.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
          <p>Nenhuma pontuação ainda. Seja o primeiro!</p>
        </div>
      )}

      {!loading && scores.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {scores.map((s, i) => {
            const isMe    = s.username === username;
            const rank    = i + 1;
            const p       = pct(s.correct, s.total);
            const color   = rank === 1 ? "#f59e0b" : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7c54" : "var(--text3)";

            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.85rem 1rem", borderRadius: "var(--radius)",
                background: isMe ? "rgba(59,130,246,0.08)" : "var(--card)",
                border: `1px solid ${isMe ? "var(--blue)" : "var(--border)"}`,
                transition: "all 0.15s",
              }}>
                {/* Rank */}
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
                      }}>
                        você
                      </span>
                    )}
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 99 }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${p}%`,
                      background: p >= 70
                        ? "var(--green)"
                        : p >= 40
                          ? "var(--orange)"
                          : "var(--red)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>
                    {s.correct}<span style={{ fontSize: "0.7rem", color: "var(--text3)", fontWeight: 400 }}>/{s.total}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{p}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh */}
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