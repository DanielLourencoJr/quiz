import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuiz } from "../contexts/QuizContext";
import QuestionForm from "../components/QuestionForm";
import { parseQuickQuestion } from "../utils/parseQuickQuestion";
import { showToast } from "../components/Toast";

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

const EXAMPLE_MC = `[MC]
Um carro acelera de 0 a 100 km/h em 8 s. Qual é a aceleração em m/s²?
* 12,5 m/s²
* 1,25 m/s²
* 3,47 m/s² x
* 34,7 m/s²
Explicação: 100 km/h = 27,78 m/s. a = 27,78/8 ≈ 3,47 m/s²`;

const EXAMPLE_TF = `[VF]
Um objeto com velocidade constante tem aceleração zero.
Resposta: verdadeiro
Explicação: No MRU a variação de velocidade é zero, logo a = Δv/Δt = 0.`;

const EXAMPLE_ESSAY = `[DISSERTATIVA]
Explique a diferença entre velocidade média e velocidade instantânea.
Gabarito: Velocidade média é a razão entre o deslocamento total e o tempo total. Velocidade instantânea é o limite dessa razão quando o intervalo de tempo tende a zero.
Dica: Pense em como o velocímetro do carro funciona.`;

export default function AddQuestion() {
  const { isAdmin }     = useAuth();
  const { addQuestion } = useQuiz();
  const navigate        = useNavigate();

  const [tab, setTab]         = useState("quick"); // "quick" | "form"
  const [raw, setRaw]         = useState("");
  const [topic, setTopic]     = useState("");
  const [parsed, setParsed]   = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [saving, setSaving]   = useState(false);
  const { topics }            = useQuiz();

  if (!isAdmin) { navigate("/admin"); return null; }

  // ── Parser ──────────────────────────────────────────────────
  function handleParse() {
    if (!raw.trim()) return;
    const result = parseQuickQuestion(raw);
    if (!result) {
      setParseErrors(["Não foi possível interpretar o texto. Verifique o formato."]);
      setParsed(null);
      return;
    }
    if (result.errors?.length > 0) {
      setParseErrors(result.errors);
      setParsed(null);
      return;
    }
    setParseErrors([]);
    setParsed(result);
  }

  function handleRawChange(val) {
    setRaw(val);
    setParsed(null);
    setParseErrors([]);
  }

  async function handleQuickSave() {
    if (!parsed) return;
    if (!topic.trim()) {
      showToast("Preencha o tema antes de salvar.", "error");
      return;
    }
    setSaving(true);
    try {
      await addQuestion({ ...parsed, topic: topic.trim() });
      showToast("Questão adicionada!", "success");
      setRaw("");
      setTopic("");
      setParsed(null);
    } catch (err) {
      showToast(err.message || "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleFormSave(data) {
    setSaving(true);
    try {
      await addQuestion(data);
      showToast("Questão adicionada!", "success");
      navigate("/admin/panel");
    } catch (err) {
      showToast(err.message || "Erro ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = { mc: "Múltipla Escolha", tf: "Verdadeiro / Falso", essay: "Dissertativa" };
  const typeColor = { mc: "var(--blue)", tf: "var(--purple)", essay: "var(--pink)" };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem 0 1rem" }}>
        <button className="icon-btn" onClick={() => navigate("/admin/panel")}>
          <BackIcon />
        </button>
        <h1 style={{ fontSize: "1.2rem" }}>Nova Questão</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { key: "quick", label: "⚡ Importação Rápida" },
          { key: "form",  label: "📝 Formulário" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius)",
              border: `2px solid ${tab === t.key ? "var(--blue)" : "var(--border)"}`,
              background: tab === t.key ? "rgba(59,130,246,0.12)" : "var(--bg3)",
              color: tab === t.key ? "var(--blue)" : "var(--text2)",
              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUICK TAB ── */}
      {tab === "quick" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Format help */}
          <div className="card" style={{ background: "var(--bg2)", padding: "0.9rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
              📋 FORMATO
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Múltipla Escolha", ex: "[MC]\nEnunciado\n* Alternativa A\n* Alternativa B x  ← correta\n* Alternativa C\nExplicação: opcional" },
                { label: "Verdadeiro / Falso", ex: "[VF]\nEnunciado\nResposta: verdadeiro\nExplicação: opcional" },
                { label: "Dissertativa", ex: "[DISSERTATIVA]\nEnunciado\nGabarito: resposta modelo\nDica: opcional" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text2)", marginBottom: "0.25rem" }}>{f.label}</div>
                  <pre style={{
                    fontSize: "0.72rem", color: "var(--text3)",
                    background: "var(--bg3)", borderRadius: "var(--radius-sm)",
                    padding: "0.5rem 0.75rem", margin: 0,
                    whiteSpace: "pre-wrap", fontFamily: "monospace",
                  }}>{f.ex}</pre>
                </div>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div className="form-group">
            <label>Carregar exemplo</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "MC", ex: EXAMPLE_MC },
                { label: "V/F", ex: EXAMPLE_TF },
                { label: "Dissertativa", ex: EXAMPLE_ESSAY },
              ].map(e => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => handleRawChange(e.ex)}
                  style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    padding: "0.3rem 0.75rem", borderRadius: "999px",
                    border: "1px solid var(--border)",
                    background: "var(--bg3)", color: "var(--text2)",
                    cursor: "pointer",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="form-group">
            <label>Cole ou escreva a questão</label>
            <textarea
              value={raw}
              onChange={e => handleRawChange(e.target.value)}
              placeholder={"[MC]\nEnunciado da questão\n* Alternativa A\n* Alternativa B x\n* Alternativa C"}
              rows={8}
              style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
            />
          </div>

          {/* Parse button */}
          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={handleParse}
            disabled={!raw.trim()}
          >
            🔍 Interpretar questão
          </button>

          {/* Errors */}
          {parseErrors.length > 0 && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)",
              borderRadius: "var(--radius)", padding: "0.9rem 1rem",
            }}>
              {parseErrors.map((e, i) => (
                <p key={i} style={{ color: "#fca5a5", fontSize: "0.85rem", margin: 0 }}>⚠️ {e}</p>
              ))}
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card" style={{
                borderLeft: `3px solid ${typeColor[parsed.type]}`,
                background: typeColor[parsed.type] + "08",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700,
                    color: typeColor[parsed.type],
                    background: typeColor[parsed.type] + "20",
                    padding: "0.2rem 0.6rem", borderRadius: "999px",
                  }}>
                    ✓ {typeLabel[parsed.type]}
                  </span>
                </div>

                <p style={{ color: "var(--text)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                  {parsed.question}
                </p>

                {/* MC preview */}
                {parsed.type === "mc" && parsed.options.map((opt, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "0.5rem", alignItems: "center",
                    padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)",
                    background: i === parsed.answer ? "rgba(16,185,129,0.12)" : "var(--bg3)",
                    border: `1px solid ${i === parsed.answer ? "var(--green)" : "var(--border)"}`,
                    marginBottom: "0.35rem",
                  }}>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      color: i === parsed.answer ? "var(--green)" : "var(--text3)",
                    }}>
                      {i === parsed.answer ? "✓" : String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ fontSize: "0.9rem", color: i === parsed.answer ? "#6ee7b7" : "var(--text2)" }}>
                      {opt}
                    </span>
                  </div>
                ))}

                {/* TF preview */}
                {parsed.type === "tf" && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.4rem 0.9rem", borderRadius: "var(--radius-sm)",
                    background: "rgba(16,185,129,0.12)", border: "1px solid var(--green)",
                  }}>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>
                      {parsed.answer ? "✓ Verdadeiro" : "✗ Falso"}
                    </span>
                  </div>
                )}

                {/* Essay preview */}
                {parsed.type === "essay" && parsed.model && (
                  <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.75rem", background: "var(--bg2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontWeight: 700, marginBottom: "0.25rem" }}>GABARITO</div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text2)", margin: 0 }}>{parsed.model}</p>
                  </div>
                )}

                {parsed.explanation && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "0.5rem", fontStyle: "italic" }}>
                    💬 {parsed.explanation}
                  </p>
                )}
              </div>

              {/* Topic input */}
              <div className="form-group">
                <label>Tema <span style={{ color: "var(--red)" }}>*</span></label>
                <input
                  list="topics-list"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Digite ou escolha um tema"
                />
                <datalist id="topics-list">
                  {topics.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              {/* Save */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setParsed(null); setRaw(""); setTopic(""); }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleQuickSave}
                  disabled={saving || !topic.trim()}
                >
                  {saving ? "Salvando..." : "✓ Salvar Questão"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORM TAB ── */}
      {tab === "form" && (
        <QuestionForm
          onSave={handleFormSave}
          onCancel={() => navigate("/admin/panel")}
          submitLabel={saving ? "Salvando..." : "Adicionar Questão"}
          disabled={saving}
        />
      )}
    </div>
  );
}