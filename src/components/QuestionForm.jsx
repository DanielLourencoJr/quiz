import { useState } from "react";
import { useQuiz } from "../contexts/QuizContext";

const TYPES = [
  { val: "mc",    label: "Múltipla Escolha", icon: "◉" },
  { val: "tf",    label: "Verdadeiro / Falso", icon: "⊙" },
  { val: "essay", label: "Dissertativa", icon: "✎" },
];

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

const EMPTY = {
  type: "mc",
  topic: "",
  question: "",
  options: ["", "", "", ""],
  answer: 0,
  explanation: "",
  tips: [""],
  model: "",
};

export default function QuestionForm({ initial, onSave, onCancel, submitLabel = "Salvar" }) {
  const { topics } = useQuiz();
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...initial,
    options: initial?.options ? [...initial.options] : ["", "", "", ""],
    tips:    initial?.tips    ? [...initial.tips]    : [""],
  }));
  const [errors, setErrors] = useState({});

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function setOption(i, val) {
    const opts = [...form.options];
    opts[i] = val;
    setForm(f => ({ ...f, options: opts }));
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm(f => ({ ...f, options: [...f.options, ""] }));
  }

  function removeOption(i) {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, idx) => idx !== i);
    setForm(f => ({
      ...f,
      options: opts,
      answer: f.answer >= opts.length ? 0 : f.answer === i ? 0 : f.answer > i ? f.answer - 1 : f.answer,
    }));
  }

  function setTip(i, val) {
    const tips = [...form.tips];
    tips[i] = val;
    setForm(f => ({ ...f, tips }));
  }
  function addTip() { setForm(f => ({ ...f, tips: [...f.tips, ""] })); }
  function removeTip(i) { setForm(f => ({ ...f, tips: f.tips.filter((_, idx) => idx !== i) })); }

  function validate() {
    const e = {};
    if (!form.topic.trim())    e.topic    = "Tema obrigatório";
    if (!form.question.trim()) e.question = "Enunciado obrigatório";
    if (form.type === "mc") {
      const filled = form.options.filter(o => o.trim());
      if (filled.length < 2) e.options = "Preencha ao menos 2 alternativas";
    }
    if (form.type === "essay" && !form.model.trim()) e.model = "Gabarito obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
  
    const payload = { ...form };
  
    if (form.type === "mc") {
      payload.options     = form.options.filter(o => o.trim());
      payload.answer      = form.answer; // número (índice)
      delete payload.tips;
      delete payload.model;
    }
  
    if (form.type === "tf") {
      payload.answer      = form.answer; // boolean
      delete payload.options;
      delete payload.tips;
      delete payload.model;
    }
  
    if (form.type === "essay") {
      payload.tips        = form.tips.filter(t => t.trim());
      delete payload.options;
      delete payload.answer;
      delete payload.explanation;
    }
  
    onSave(payload);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Type selector */}
      <div className="form-group">
        <label>Tipo de Questão</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
          {TYPES.map(tp => (
            <button
              key={tp.val}
              type="button"
              onClick={() => set("type", tp.val)}
              style={{
                padding: "0.85rem 0.5rem",
                borderRadius: "var(--radius)",
                border: `2px solid ${form.type === tp.val ? "var(--blue)" : "var(--border)"}`,
                background: form.type === tp.val ? "rgba(59,130,246,0.12)" : "var(--bg3)",
                color: form.type === tp.val ? "var(--blue)" : "var(--text2)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                fontSize: "0.8rem", fontWeight: 600,
              }}
            >
              <span style={{ fontSize: "1.3rem" }}>{tp.icon}</span>
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div className="form-group">
        <label>Tema</label>
        <input
          list="topics-list"
          value={form.topic}
          onChange={e => set("topic", e.target.value)}
          placeholder="Digite ou escolha um tema existente"
          style={{ borderColor: errors.topic ? "var(--red)" : undefined }}
        />
        <datalist id="topics-list">
          {topics.map(t => <option key={t} value={t} />)}
        </datalist>
        {errors.topic && <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>{errors.topic}</span>}
      </div>

      {/* Question */}
      <div className="form-group">
        <label>Enunciado</label>
        <textarea
          value={form.question}
          onChange={e => set("question", e.target.value)}
          placeholder="Digite a pergunta aqui..."
          rows={3}
          style={{ borderColor: errors.question ? "var(--red)" : undefined }}
        />
        {errors.question && <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>{errors.question}</span>}
      </div>

      {/* MC: options + correct answer */}
      {form.type === "mc" && (
        <div className="form-group">
          <label>Alternativas <span style={{ color: "var(--text3)", fontWeight: 400 }}>(toque para marcar a correta)</span></label>
          {errors.options && <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>{errors.options}</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => set("answer", i)}
                  style={{
                    width: 34, height: 34, flexShrink: 0, borderRadius: "50%",
                    border: `2px solid ${form.answer === i ? "var(--green)" : "var(--border)"}`,
                    background: form.answer === i ? "var(--green)" : "var(--bg3)",
                    color: form.answer === i ? "#fff" : "var(--text2)",
                    fontWeight: 700, fontSize: "0.85rem",
                  }}
                >
                  {form.answer === i ? "✓" : String.fromCharCode(65 + i)}
                </button>
                <input
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                  style={{ flex: 1 }}
                />
                {form.options.length > 2 && (
                  <button type="button" className="icon-btn danger" onClick={() => removeOption(i)}>
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
            {form.options.length < 6 && (
              <button type="button" className="btn btn-ghost" onClick={addOption} style={{ fontSize: "0.85rem", gap: "0.4rem" }}>
                <PlusIcon /> Adicionar alternativa
              </button>
            )}
          </div>
        </div>
      )}

      {/* TF: answer */}
      {form.type === "tf" && (
        <div className="form-group">
          <label>Resposta Correta</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[true, false].map(val => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set("answer", val)}
                style={{
                  padding: "1.2rem",
                  border: `2px solid ${form.answer === val ? "var(--green)" : "var(--border)"}`,
                  background: form.answer === val ? "rgba(16,185,129,0.12)" : "var(--bg3)",
                  color: form.answer === val ? "var(--green)" : "var(--text2)",
                  borderRadius: "var(--radius)",
                  fontWeight: 700, fontSize: "1.05rem",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                }}
              >
                <span style={{ fontSize: "1.6rem" }}>{val ? "✓" : "✗"}</span>
                {val ? "Verdadeiro" : "Falso"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explanation (mc + tf) */}
      {(form.type === "mc" || form.type === "tf") && (
        <div className="form-group">
          <label>Explicação <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional)</span></label>
          <textarea
            value={form.explanation || ""}
            onChange={e => set("explanation", e.target.value)}
            placeholder="Explique o motivo da resposta correta..."
            rows={2}
          />
        </div>
      )}

      {/* Essay: tips + model */}
      {form.type === "essay" && (
        <>
          <div className="form-group">
            <label>Dicas <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {form.tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={tip}
                    onChange={e => setTip(i, e.target.value)}
                    placeholder={`Dica ${i + 1}`}
                    style={{ flex: 1 }}
                  />
                  {form.tips.length > 1 && (
                    <button type="button" className="icon-btn danger" onClick={() => removeTip(i)}>
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={addTip} style={{ fontSize: "0.85rem", gap: "0.4rem" }}>
                <PlusIcon /> Adicionar dica
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Gabarito / Resposta Modelo</label>
            <textarea
              value={form.model || ""}
              onChange={e => set("model", e.target.value)}
              placeholder="Escreva a resposta esperada..."
              rows={4}
              style={{ borderColor: errors.model ? "var(--red)" : undefined }}
            />
            {errors.model && <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>{errors.model}</span>}
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: "none" }}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary btn-full">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
