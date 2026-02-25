import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useQuiz } from "../contexts/QuizContext";
import QuestionForm from "../components/QuestionForm";
import { showToast } from "../components/Toast";

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

export default function AddQuestion() {
  const { isAdmin }     = useAuth();
  const { addQuestion } = useQuiz();
  const navigate        = useNavigate();
  const [saving, setSaving] = useState(false);

  if (!isAdmin) { navigate("/admin"); return null; }

  async function handleSave(data) {
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

      <QuestionForm
        onSave={handleSave}
        onCancel={() => navigate("/admin/panel")}
        submitLabel={saving ? "Salvando..." : "Adicionar Questão"}
        disabled={saving}
      />
    </div>
  );
}