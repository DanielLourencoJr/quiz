import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function EditQuestion() {
  const { isAdmin }                    = useAuth();
  const { questions, updateQuestion }  = useQuiz();
  const navigate                       = useNavigate();
  const { id }                         = useParams();
  const [saving, setSaving]            = useState(false);

  if (!isAdmin) { navigate("/admin"); return null; }

  const question = questions.find(q => q.id === id);

  if (!question) {
    return (
      <div className="page" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <p>Questão não encontrada.</p>
        <button className="btn btn-ghost" style={{ marginTop: "1rem" }} onClick={() => navigate("/admin/panel")}>
          ← Voltar
        </button>
      </div>
    );
  }

  async function handleSave(data) {
    setSaving(true);
    try {
      await updateQuestion(id, data);
      showToast("Questão atualizada!", "success");
      navigate("/admin/panel");
    } catch (err) {
      showToast(err.message || "Erro ao atualizar.", "error");
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
        <h1 style={{ fontSize: "1.2rem" }}>Editar Questão</h1>
      </div>

      <QuestionForm
        initial={question}
        onSave={handleSave}
        onCancel={() => navigate("/admin/panel")}
        submitLabel={saving ? "Salvando..." : "Salvar Alterações"}
        disabled={saving}
      />
    </div>
  );
}