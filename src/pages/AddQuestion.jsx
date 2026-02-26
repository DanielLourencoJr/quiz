import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuiz } from "../contexts/QuizContext";
import QuestionForm from "../components/QuestionForm";
import { parseQuickQuestions } from "../utils/parseQuickQuestion";
import { showToast } from "../components/Toast";

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

const EXAMPLE = `[MC]
Assunto: Cinemática
Um carro acelera de 0 a 100 km/h em 8 s. Qual é a aceleração em m/s²?
* 12,5 m/s²
* 1,25 m/s²
* 3,47 m/s² x
* 34,7 m/s²
Explicação: 100 km/h = 27,78 m/s. a = 27,78/8 ≈ 3,47 m/s²

[VF]
Assunto: Cinemática
Um objeto com velocidade constante tem aceleração zero.
Resposta: verdadeiro
Explicação: No MRU a variação de velocidade é zero, logo a = 0.

[DISSERTATIVA]
Assunto: Cinemática
Explique a diferença entre velocidade média e velocidade instantânea.
Gabarito: Velocidade média é a razão entre deslocamento total e tempo total. Velocidade instantânea é o limite dessa razão quando o intervalo de tempo tende a zero.
Dica: Pense em como o velocímetro do carro funciona.`;

const typeLabel = { mc: "Múltipla Escolha", tf: "Verdadeiro / Falso", essay: "Dissertativa" };
const typeColor = { mc: "var(--blue)", tf: "var(--purple)", essay: "var(--pink)" };

export default function AddQuestion() {
  const { isAdmin }     = useAuth();
  const { addQuestion, topics } = useQuiz();
  const navigate        = useNavigate();

  const [tab, setTab]               = useState("quick");
  const [raw, setRaw]               = useState("");
  const [parsed, setParsed]         = useState([]); // array de questões
  const [globalTopic, setGlobalTopic] = useState("");
  const [saving, setSaving]         = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  if (!isAdmin) { navigate("/admin"); return null; }

  function handleParse() {
    if (!raw.trim()) return;
    const results = parseQuickQuestions(raw);
    setParsed(results);
    setSavedCount(0);
  }

  function handleRawChange(val) {
    setRaw(val);
    setParsed([]);
    setSavedCount(0);
  }

  // Questões válidas (sem erros)
  const validQuestions = parsed.filter(q => !q.errors?.length);
  const hasErrors      = parsed.some(q => q.errors?.length > 0);

  async function handleSaveAll() {
    if (validQuestions.length === 0) return;

    // Verifica temas: cada questão precisa ter tema próprio OU global
    const missing = validQuestions.filter(q => !q.topic?.trim() && !globalTopic.trim());
    if (missing.length > 0) {
      showToast(`${missing.length} questão(ões) sem assunto. Preencha o campo "Assunto global" abaixo.`, "error");
      return;
    }

    setSaving(true);
    let count = 0;
    try {
      for (const q of validQuestions) {
        const { errors, index, ...data } = q;
        await addQuestion({
          ...data,
          topic: q.topic?.trim() || globalTopic.trim(),
        });
        count++;
        setSavedCount(count);
      }
      showToast(`${count} questão(ões) adicionada(s)!`, "success");
      setRaw("");
      setParsed([]);
      setGlobalTopic("");
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

  return (
    <div className="page">
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
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "0.75rem", borderRadius: "var(--radius)",
            border: `2px solid ${tab === t.key ? "var(--blue)" : "var(--border)"}`,
            background: tab === t.key ? "rgba(59,130,246,0.12)" : "var(--bg3)",
            color: tab === t.key ? "var(--blue)" : "var(--text2)",
            fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── QUICK TAB ── */}
      {tab === "quick" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Format guide */}
          <div className="card" style={{ background: "var(--bg2)", padding: "0.9rem" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
              📋 FORMATO — separe múltiplas questões com uma linha em branco
            </div>
            <pre style={{
              fontSize: "0.72rem", color: "var(--text2)",
              background: "var(--bg3)", borderRadius: "var(--radius-sm)",
              padding: "0.75rem", margin: 0, whiteSpace: "pre-wrap",
              fontFamily: "monospace", lineHeight: 1.7,
            }}>{`[MC]
Assunto: Nome do tema
Enunciado da questão
* Alternativa A
* Alternativa B x  ← correta
* Alternativa C
Explicação: opcional

[VF]
Assunto: Nome do tema
Enunciado
Resposta: verdadeiro
Explicação: opcional

[DISSERTATIVA]
Assunto: Nome do tema
Enunciado
Gabarito: resposta modelo
Dica: opcional`}</pre>
            <button
              onClick={() => handleRawChange(EXAMPLE)}
              style={{
                marginTop: "0.75rem", fontSize: "0.75rem", fontWeight: 600,
                padding: "0.35rem 0.9rem", borderRadius: "999px",
                border: "1px solid var(--border)", background: "var(--bg3)",
                color: "var(--text2)", cursor: "pointer",
              }}
            >
              Carregar exemplo com 3 questões
            </button>
          </div>

          {/* Textarea */}
          <div className="form-group">
            <label>Cole ou escreva as questões</label>
            <textarea
              value={raw}
              onChange={e => handleRawChange(e.target.value)}
              placeholder={"[MC]\nAssunto: Física\nEnunciado...\n* Alternativa A\n* Alternativa B x\n\n[VF]\nAssunto: Física\n..."}
              rows={10}
              style={{ fontFamily: "monospace", fontSize: "0.88rem" }}
            />
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={handleParse}
            disabled={!raw.trim()}
          >
            🔍 Interpretar questões
          </button>

          {/* Results */}
          {parsed.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Summary */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem 1rem", borderRadius: "var(--radius)",
                background: hasErrors ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
                border: `1px solid ${hasErrors ? "var(--red)" : "var(--green)"}`,
              }}>
                <span style={{ fontSize: "1.2rem" }}>{hasErrors ? "⚠️" : "✅"}</span>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: hasErrors ? "#fca5a5" : "#6ee7b7" }}>
                    {validQuestions.length} questão(ões) válida(s)
                    {hasErrors ? `, ${parsed.filter(q => q.errors?.length).length} com erro` : ""}
                  </div>
                  {saving && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                      Salvando... {savedCount}/{validQuestions.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Each question preview */}
              {parsed.map((q, i) => {
                const hasErr = q.errors?.length > 0;
                return (
                  <div key={i} style={{
                    borderRadius: "var(--radius)",
                    border: `1px solid ${hasErr ? "var(--red)" : typeColor[q.type] ?? "var(--border)"}`,
                    overflow: "hidden",
                  }}>
                    {/* Header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.6rem 0.9rem",
                      background: hasErr ? "rgba(239,68,68,0.08)" : (typeColor[q.type] ?? "var(--border)") + "12",
                      borderBottom: `1px solid ${hasErr ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                    }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: hasErr ? "#fca5a5" : typeColor[q.type] }}>
                        {hasErr ? "✗ ERRO" : `✓ ${typeLabel[q.type]}`}
                      </span>
                      {q.topic && !hasErr && (
                        <span style={{
                          fontSize: "0.68rem", color: "var(--text3)",
                          background: "var(--bg3)", padding: "0.1rem 0.5rem",
                          borderRadius: "999px", border: "1px solid var(--border)",
                        }}>
                          {q.topic}
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "var(--text3)" }}>
                        #{i + 1}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "0.75rem 0.9rem", background: "var(--card)" }}>
                      {hasErr ? (
                        q.errors.map((e, j) => (
                          <p key={j} style={{ color: "#fca5a5", fontSize: "0.85rem", margin: "0.2rem 0" }}>• {e}</p>
                        ))
                      ) : (
                        <>
                          <p style={{ color: "var(--text)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                            {q.question}
                          </p>

                          {q.type === "mc" && q.options?.map((opt, j) => (
                            <div key={j} style={{
                              display: "flex", gap: "0.5rem", alignItems: "center",
                              padding: "0.3rem 0.6rem", borderRadius: "var(--radius-sm)",
                              background: j === q.answer ? "rgba(16,185,129,0.1)" : "var(--bg3)",
                              border: `1px solid ${j === q.answer ? "var(--green)" : "var(--border)"}`,
                              marginBottom: "0.3rem",
                            }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: j === q.answer ? "var(--green)" : "var(--text3)" }}>
                                {j === q.answer ? "✓" : String.fromCharCode(65 + j)}
                              </span>
                              <span style={{ fontSize: "0.85rem", color: j === q.answer ? "#6ee7b7" : "var(--text2)" }}>{opt}</span>
                            </div>
                          ))}

                          {q.type === "tf" && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "0.4rem",
                              fontSize: "0.85rem", fontWeight: 700,
                              color: "var(--green)", background: "rgba(16,185,129,0.1)",
                              padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--green)",
                            }}>
                              {q.answer ? "✓ Verdadeiro" : "✗ Falso"}
                            </span>
                          )}

                          {q.type === "essay" && q.model && (
                            <p style={{ fontSize: "0.8rem", color: "var(--text3)", fontStyle: "italic", marginTop: "0.25rem" }}>
                              💬 {q.model.slice(0, 80)}{q.model.length > 80 ? "..." : ""}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Global topic fallback */}
              {validQuestions.some(q => !q.topic?.trim()) && (
                <div className="form-group">
                  <label>
                    Assunto global
                    <span style={{ color: "var(--text3)", fontWeight: 400, fontSize: "0.8rem" }}>
                      {" "}— usado nas questões sem assunto definido
                    </span>
                  </label>
                  <input
                    list="topics-list"
                    value={globalTopic}
                    onChange={e => setGlobalTopic(e.target.value)}
                    placeholder="Digite ou escolha um tema"
                  />
                  <datalist id="topics-list">
                    {topics.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              )}

              {/* Save all */}
              {validQuestions.length > 0 && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setParsed([]); setRaw(""); setGlobalTopic(""); }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleSaveAll}
                    disabled={saving}
                  >
                    {saving
                      ? `Salvando ${savedCount}/${validQuestions.length}...`
                      : `✓ Salvar ${validQuestions.length} questão(ões)`}
                  </button>
                </div>
              )}
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