import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuiz } from "../contexts/QuizContext";
import { getTopicColor } from "../data/defaultQuestions";
import { showToast } from "../components/Toast";
import { supabase } from "../supabase/supabaseClient";

const TYPE_LABEL = { mc: "MC", tf: "V/F", essay: "Dis." };
const TYPE_COLOR = {
  mc: "var(--blue)",
  tf: "var(--purple)",
  essay: "var(--pink)",
};

// ── Icons ──────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);
const LogoutIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 0.2s",
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const BanIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const UserIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ── Tab button ─────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "0.65rem 0.5rem",
        borderRadius: "var(--radius-sm)",
        border: `1.5px solid ${active ? "var(--blue)" : "var(--border)"}`,
        background: active ? "rgba(59,130,246,0.12)" : "var(--bg3)",
        color: active ? "var(--blue)" : "var(--text2)",
        fontWeight: 600,
        fontSize: "0.8rem",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// QUESTIONS TAB
// ══════════════════════════════════════════════════════════════
function QuestionsTab({ questions, loading, error, refresh, navigate, stats }) {
  const { deleteQuestion } = useQuiz();
  const [search, setSearch] = useState("");
  const [expandedTopics, setExpandedTopics] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Group by topic
  const filtered = questions.filter(
    (q) =>
      !search ||
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = filtered.reduce((acc, q) => {
    if (!acc[q.topic]) acc[q.topic] = [];
    acc[q.topic].push(q);
    return acc;
  }, {});

  const sortedTopics = Object.keys(grouped).sort();

  function toggleTopic(t) {
    setExpandedTopics((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  function expandAll() {
    const o = {};
    sortedTopics.forEach((t) => (o[t] = true));
    setExpandedTopics(o);
  }
  function collapseAll() {
    setExpandedTopics({});
  }

  const anyExpanded = sortedTopics.some((t) => expandedTopics[t]);

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
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid var(--red)",
            borderRadius: "var(--radius)",
            padding: "0.75rem 1rem",
            color: "#fca5a5",
            fontSize: "0.85rem",
            marginBottom: "1rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          ⚠️ {error}
          <button
            onClick={refresh}
            style={{
              marginLeft: "auto",
              color: "var(--red)",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Stats mini */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "0.4rem",
          marginBottom: "1rem",
        }}
      >
        {[
          { label: "Total", val: stats.total, color: "var(--text)" },
          { label: "MC", val: stats.mc, color: "var(--blue)" },
          { label: "V/F", val: stats.tf, color: "var(--purple)" },
          { label: "Dis.", val: stats.essay, color: "var(--pink)" },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ textAlign: "center", padding: "0.5rem 0.25rem" }}
          >
            <div
              style={{ fontSize: "1.2rem", fontWeight: 700, color: s.color }}
            >
              {s.val}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Add + Search */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button
          className="btn btn-primary"
          style={{ gap: "0.4rem", padding: "0.75rem 1rem", flexShrink: 0 }}
          onClick={() => navigate("/admin/add")}
        >
          <PlusIcon /> Nova
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar questão ou tema..."
          style={{ flex: 1, fontSize: "0.9rem" }}
        />
      </div>

      {/* Expand/collapse controls */}
      {sortedTopics.length > 1 && (
        <div
          style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}
        >
          <button
            onClick={anyExpanded ? collapseAll : expandAll}
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: "var(--bg3)",
              color: "var(--text2)",
              cursor: "pointer",
            }}
          >
            {anyExpanded ? "▲ Recolher todos" : "▼ Expandir todos"}
          </button>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text3)",
              alignSelf: "center",
            }}
          >
            {sortedTopics.length} tema{sortedTopics.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 48,
                borderRadius: "var(--radius)",
                background: "var(--border)",
                opacity: 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && sortedTopics.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 0",
            color: "var(--text3)",
          }}
        >
          {search
            ? "Nenhuma questão encontrada."
            : "Nenhuma questão cadastrada ainda."}
        </div>
      )}

      {/* Topics grouped */}
      {!loading && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {sortedTopics.map((topic) => {
            const color = getTopicColor(topic);
            const qs = grouped[topic];
            const isOpen = !!expandedTopics[topic];

            return (
              <div
                key={topic}
                style={{
                  borderRadius: "var(--radius)",
                  border: `1px solid ${isOpen ? color + "50" : "var(--border)"}`,
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Topic header — clickable */}
                <button
                  onClick={() => toggleTopic(topic)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    background: isOpen ? color + "10" : "var(--card)",
                    cursor: "pointer",
                    border: "none",
                    borderBottom: isOpen ? `1px solid ${color}30` : "none",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: isOpen ? color : "var(--text)",
                    }}
                  >
                    {topic}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: color,
                      background: color + "20",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "999px",
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {qs.length}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                {/* Questions inside topic */}
                {isOpen && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0",
                    }}
                  >
                    {qs.map((q, qi) => (
                      <div
                        key={q.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          padding: "0.75rem 1rem",
                          background:
                            qi % 2 === 0 ? "var(--bg3)" : "var(--card)",
                          borderBottom:
                            qi < qs.length - 1
                              ? "1px solid var(--border)"
                              : "none",
                        }}
                      >
                        {/* Number */}
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            borderRadius: 6,
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "var(--text3)",
                            marginTop: 2,
                          }}
                        >
                          {qi + 1}
                        </div>

                        {/* Text + type badge */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: TYPE_COLOR[q.type],
                              background: TYPE_COLOR[q.type] + "20",
                              border: `1px solid ${TYPE_COLOR[q.type]}30`,
                              padding: "0.1rem 0.45rem",
                              borderRadius: "999px",
                              marginRight: "0.4rem",
                            }}
                          >
                            {TYPE_LABEL[q.type]}
                          </span>
                          <span
                            style={{
                              fontSize: "0.88rem",
                              color: "var(--text)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {q.question}
                          </span>
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.35rem",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            className="icon-btn"
                            title="Editar"
                            onClick={() => navigate(`/admin/edit/${q.id}`)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="icon-btn danger"
                            title="Excluir"
                            onClick={() => setConfirmId(q.id)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete modal */}
      {confirmId && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setConfirmId(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "0.5rem" }}>Excluir questão?</h3>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger btn-full"
                onClick={() => handleDelete(confirmId)}
                disabled={deleting}
              >
                {deleting ? "Removendo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banModal, setBanModal] = useState(null); // { user }
  const [banModal2, setBanModal2] = useState(null); // unban
  const [banReason, setBanReason] = useState("");
  const [bannedNames, setBannedNames] = useState([]);
  const [newPattern, setNewPattern] = useState("");
  const [tab2, setTab2] = useState("users"); // "users" | "patterns"

  useEffect(() => {
    fetchUsers();
    fetchPatterns();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function fetchPatterns() {
    const { data } = await supabase
      .from("banned_names")
      .select("*")
      .order("created_at", { ascending: false });
    setBannedNames(data ?? []);
  }

  async function handleBan() {
    if (!banModal) return;
    const { error } = await supabase
      .from("users")
      .update({
        banned: true,
        ban_reason: banReason.trim() || "Violação das regras",
      })
      .eq("username", banModal.username);
    if (error) {
      showToast("Erro ao banir.", "error");
      return;
    }
    showToast(`${banModal.username} banido.`, "success");
    setBanModal(null);
    setBanReason("");
    fetchUsers();
  }

  async function handleUnban(username) {
    const { error } = await supabase
      .from("users")
      .update({ banned: false, ban_reason: null })
      .eq("username", username);
    if (error) {
      showToast("Erro ao desbanir.", "error");
      return;
    }
    showToast(`${username} desbanido.`, "success");
    fetchUsers();
  }

  async function handleAddPattern() {
    if (!newPattern.trim()) return;
    const { error } = await supabase
      .from("banned_names")
      .insert([
        {
          pattern: newPattern.trim().toLowerCase(),
          reason: "Bloqueado pelo admin",
        },
      ]);
    if (error) {
      showToast(
        error.message.includes("unique")
          ? "Padrão já existe."
          : "Erro ao adicionar.",
        "error",
      );
      return;
    }
    showToast("Padrão adicionado.", "success");
    setNewPattern("");
    fetchPatterns();
  }

  async function handleRemovePattern(id) {
    await supabase.from("banned_names").delete().eq("id", id);
    showToast("Padrão removido.", "success");
    fetchPatterns();
  }

  const filteredUsers = users.filter(
    (u) => !search || u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const bannedCount = users.filter((u) => u.banned).length;
  const activeCount = users.length - bannedCount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <TabBtn active={tab2 === "users"} onClick={() => setTab2("users")}>
          👥 Usuários ({users.length})
        </TabBtn>
        <TabBtn
          active={tab2 === "patterns"}
          onClick={() => setTab2("patterns")}
        >
          🚫 Padrões proibidos ({bannedNames.length})
        </TabBtn>
      </div>

      {/* ── USERS ── */}
      {tab2 === "users" && (
        <>
          {/* Mini stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.4rem",
            }}
          >
            {[
              { label: "Total", val: users.length, color: "var(--text)" },
              { label: "Ativos", val: activeCount, color: "var(--green)" },
              { label: "Banidos", val: bannedCount, color: "var(--red)" },
            ].map((s) => (
              <div
                key={s.label}
                className="card"
                style={{ textAlign: "center", padding: "0.5rem" }}
              >
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  {s.val}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            style={{ fontSize: "0.9rem" }}
          />

          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "1rem",
              }}
            >
              <div className="spinner" />
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text3)",
                padding: "1.5rem 0",
                fontSize: "0.9rem",
              }}
            >
              Nenhum usuário encontrado.
            </p>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius)",
                  background: u.banned ? "rgba(239,68,68,0.05)" : "var(--card)",
                  border: `1px solid ${u.banned ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: u.banned
                      ? "rgba(239,68,68,0.15)"
                      : "var(--bg3)",
                    border: `2px solid ${u.banned ? "var(--red)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    color: u.banned ? "var(--red)" : "var(--text3)",
                  }}
                >
                  {u.banned ? "✗" : u.username[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: u.banned ? "var(--red)" : "var(--text)",
                      }}
                    >
                      {u.username}
                    </span>
                    {u.banned && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "var(--red)",
                          background: "rgba(239,68,68,0.15)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "999px",
                        }}
                      >
                        BANIDO
                      </span>
                    )}
                  </div>
                  {u.ban_reason && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                      Motivo: {u.ban_reason}
                    </div>
                  )}
                  <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>
                    Entrou: {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>

                {u.banned ? (
                  <button
                    className="icon-btn"
                    title="Desbanir"
                    onClick={() => handleUnban(u.username)}
                    style={{ color: "var(--green)" }}
                  >
                    <UserIcon />
                  </button>
                ) : (
                  <button
                    className="icon-btn danger"
                    title="Banir"
                    onClick={() => {
                      setBanModal(u);
                      setBanReason("");
                    }}
                  >
                    <BanIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── PATTERNS ── */}
      {tab2 === "patterns" && (
        <>
          <p style={{ fontSize: "0.85rem", color: "var(--text3)", margin: 0 }}>
            Qualquer nome que <strong>contenha</strong> um desses padrões será
            bloqueado no cadastro.
          </p>

          {/* Add pattern */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPattern()}
              placeholder="Ex: palavrão, xinga..."
              style={{ flex: 1, fontSize: "0.9rem" }}
            />
            <button
              className="btn btn-danger"
              onClick={handleAddPattern}
              disabled={!newPattern.trim()}
              style={{ padding: "0 1rem", flexShrink: 0 }}
            >
              + Bloquear
            </button>
          </div>

          {bannedNames.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text3)",
                fontSize: "0.85rem",
                padding: "1rem 0",
              }}
            >
              Nenhum padrão cadastrado.
            </p>
          )}

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            {bannedNames.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 1rem",
                  borderRadius: "var(--radius)",
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#fca5a5",
                    fontFamily: "monospace",
                    flex: 1,
                  }}
                >
                  🚫 {b.pattern}
                </span>
                {b.reason && (
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                    {b.reason}
                  </span>
                )}
                <button
                  className="icon-btn danger"
                  onClick={() => handleRemovePattern(b.id)}
                  title="Remover"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ban modal */}
      {banModal && (
        <div className="modal-overlay" onClick={() => setBanModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "0.5rem" }}>
              Banir "{banModal.username}"?
            </h3>
            <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
              O usuário não conseguirá mais entrar no quiz.
            </p>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label>Motivo (opcional)</label>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: nome inapropriado"
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setBanModal(null)}
              >
                Cancelar
              </button>
              <button className="btn btn-danger btn-full" onClick={handleBan}>
                Banir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RANKING TAB
// ══════════════════════════════════════════════════════════════
function RankingTab() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [confirmId, setConfirmId] = useState(null); // score id to delete
  const [confirmAll, setConfirmAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchScores();
  }, []);

  async function fetchScores() {
    setLoading(true);
    const { data } = await supabase
      .from("scores")
      .select("*")
      .order("created_at", { ascending: false });
    setScores(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id) {
    setDeleting(true);
    const { error } = await supabase.from("scores").delete().eq("id", id);
    if (error) {
      showToast("Erro ao deletar.", "error");
    } else {
      showToast("Entrada removida.", "success");
    }
    setConfirmId(null);
    setDeleting(false);
    fetchScores();
  }

  async function handleDeleteAll() {
    setDeleting(true);
    const ids = filtered.map((s) => s.id);
    const { error } = await supabase.from("scores").delete().in("id", ids);
    if (error) {
      showToast("Erro ao limpar ranking.", "error");
    } else {
      showToast(`${ids.length} entrada(s) removida(s).`, "success");
    }
    setConfirmAll(false);
    setDeleting(false);
    fetchScores();
  }

  const allTopics = [...new Set(scores.flatMap((s) => s.topics ?? []))].sort();

  const filtered = scores.filter((s) => {
    const topicMatch =
      !selectedTopic || (s.topics ?? []).includes(selectedTopic);
    const searchMatch =
      !search || s.username.toLowerCase().includes(search.toLowerCase());
    return topicMatch && searchMatch;
  });

  function pct(c, t) {
    return t ? Math.round((c / t) * 100) : 0;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "0.4rem",
        }}
      >
        {[
          { label: "Entradas", val: scores.length, color: "var(--text)" },
          {
            label: "Jogadores",
            val: new Set(scores.map((s) => s.username)).size,
            color: "var(--blue)",
          },
          { label: "Filtradas", val: filtered.length, color: "var(--purple)" },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ textAlign: "center", padding: "0.5rem" }}
          >
            <div
              style={{ fontSize: "1.2rem", fontWeight: 700, color: s.color }}
            >
              {s.val}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar jogador..."
        style={{ fontSize: "0.9rem" }}
      />

      {allTopics.length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedTopic("")}
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.3rem 0.65rem",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "all 0.15s",
              border: `1.5px solid ${!selectedTopic ? "var(--blue)" : "var(--border)"}`,
              background: !selectedTopic
                ? "rgba(59,130,246,0.15)"
                : "var(--bg3)",
              color: !selectedTopic ? "var(--blue)" : "var(--text3)",
            }}
          >
            Todos
          </button>
          {allTopics.map((t) => {
            const tc = getTopicColor(t);
            const isActive = selectedTopic === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.3rem 0.65rem",
                  borderRadius: "999px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1.5px solid ${isActive ? tc : "var(--border)"}`,
                  background: isActive ? tc + "20" : "var(--bg3)",
                  color: isActive ? tc : "var(--text3)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Delete all filtered */}
      {filtered.length > 0 && (
        <button
          className="btn btn-danger"
          onClick={() => setConfirmAll(true)}
          style={{ fontSize: "0.82rem", padding: "0.6rem 1rem" }}
        >
          <TrashIcon /> Deletar {filtered.length} entrada
          {filtered.length !== 1 ? "s" : ""}{" "}
          {selectedTopic ? `de "${selectedTopic}"` : ""}
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div className="spinner" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "2rem 0",
            color: "var(--text3)",
            fontSize: "0.9rem",
          }}
        >
          📭 Nenhuma entrada encontrada.
        </div>
      )}

      {/* Rows */}
      {!loading && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
        >
          {filtered.map((s) => {
            const p = pct(s.correct, s.total);
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius)",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text2)",
                  }}
                >
                  {s.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {s.username}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color:
                          p >= 70
                            ? "var(--green)"
                            : p >= 40
                              ? "var(--orange)"
                              : "var(--red)",
                        background:
                          (p >= 70
                            ? "var(--green)"
                            : p >= 40
                              ? "var(--orange)"
                              : "var(--red)") + "15",
                        padding: "0.05rem 0.45rem",
                        borderRadius: "999px",
                      }}
                    >
                      {s.correct}/{s.total} · {p}%
                    </span>
                  </div>
                  {/* Topics */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.25rem",
                    }}
                  >
                    {(s.topics ?? []).map((t) => {
                      const tc = getTopicColor(t);
                      return (
                        <span
                          key={t}
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: tc,
                            background: tc + "18",
                            border: `1px solid ${tc}30`,
                            padding: "0.05rem 0.4rem",
                            borderRadius: "999px",
                          }}
                        >
                          {t}
                        </span>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text3)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>

                {/* Delete */}
                <button
                  className="icon-btn danger"
                  title="Deletar entrada"
                  onClick={() => setConfirmId(s.id)}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm single delete */}
      {confirmId && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setConfirmId(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "0.5rem" }}>Deletar esta entrada?</h3>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger btn-full"
                onClick={() => handleDelete(confirmId)}
                disabled={deleting}
              >
                {deleting ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete all */}
      {confirmAll && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setConfirmAll(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "0.5rem" }}>
              Deletar {filtered.length} entrada
              {filtered.length !== 1 ? "s" : ""}?
            </h3>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              {selectedTopic
                ? `Todas as entradas do tema "${selectedTopic}" serão removidas.`
                : "Todo o ranking será apagado. Essa ação não pode ser desfeita."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => setConfirmAll(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger btn-full"
                onClick={handleDeleteAll}
                disabled={deleting}
              >
                {deleting ? "Deletando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const { isAdmin, logout } = useAuth();
  const { questions, stats, loading, error, refresh } = useQuiz();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("questions");

  if (!isAdmin) {
    navigate("/admin");
    return null;
  }

  return (
    <>
      {/* Top bar */}
      <div className="top-bar">
        <h2 style={{ flex: 1, fontSize: "1rem" }}>Painel Admin</h2>
        <button
          className="icon-btn"
          title="Recarregar"
          onClick={refresh}
          style={{ marginRight: "0.25rem" }}
        >
          <RefreshIcon />
        </button>
        <button
          className="icon-btn"
          title="Sair"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <LogoutIcon />
        </button>
      </div>

      <div className="page">
        {/* Main tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            margin: "0.75rem 0 1.25rem",
          }}
        >
          <TabBtn
            active={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
          >
            📚 Questões
          </TabBtn>
          <TabBtn
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          >
            👥 Usuários
          </TabBtn>
          <TabBtn
            active={activeTab === "ranking"}
            onClick={() => setActiveTab("ranking")}
          >
            🏆 Ranking
          </TabBtn>
        </div>

        {activeTab === "questions" && (
          <QuestionsTab
            questions={questions}
            loading={loading}
            error={error}
            refresh={refresh}
            navigate={navigate}
            stats={stats}
          />
        )}

        {activeTab === "users" && <UsersTab />}
        {activeTab === "ranking" && <RankingTab />}

        <div style={{ height: "1rem" }} />
      </div>
    </>
  );
}
