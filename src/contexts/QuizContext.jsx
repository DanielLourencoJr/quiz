import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase/supabaseClient";

const QuizContext = createContext(null);

// Converte banco → app
function dbToApp(row) {
  return {
    id:          row.id,
    type:        row.type,
    topic:       row.topic,
    question:    row.question,
    options:     row.options   ?? undefined,
    // answer é salvo como string JSON no banco ("1", "true", etc.)
    answer:      row.answer !== null && row.answer !== undefined
                   ? JSON.parse(row.answer)
                   : undefined,
    explanation: row.explanation ?? undefined,
    tips:        row.tips        ?? undefined,
    model:       row.model       ?? undefined,
  };
}

// Converte app → banco
function appToDb(data) {
  return {
    type:        data.type,
    topic:       data.topic,
    question:    data.question,
    options:     data.options     ?? null,
    answer:      data.answer !== undefined && data.answer !== null
                   ? JSON.stringify(data.answer)
                   : null,
    explanation: data.explanation ?? null,
    tips:        data.tips        ?? null,
    model:       data.model       ?? null,
  };
}

export function QuizProvider({ children }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => { fetchQuestions(); }, []);

  async function fetchQuestions() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setQuestions((data ?? []).map(dbToApp));
    } catch (err) {
      console.error("Erro ao buscar questões:", err);
      setError("Não foi possível carregar as questões. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion(data) {
    const { data: inserted, error } = await supabase
      .from("questions")
      .insert([appToDb(data)])
      .select()
      .single();
    if (error) {
      console.error("Erro ao adicionar questão:", error);
      throw new Error("Falha ao salvar a questão. Tente novamente.");
    }
    const newQ = dbToApp(inserted);
    setQuestions(prev => [...prev, newQ]);
    return newQ;
  }

  async function updateQuestion(id, data) {
    const { data: updated, error } = await supabase
      .from("questions")
      .update(appToDb(data))
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Erro ao atualizar questão:", error);
      throw new Error("Falha ao atualizar a questão. Tente novamente.");
    }
    const updatedQ = dbToApp(updated);
    setQuestions(prev => prev.map(q => (q.id === id ? updatedQ : q)));
    return updatedQ;
  }

  async function deleteQuestion(id) {
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Erro ao deletar questão:", error);
      throw new Error("Falha ao remover a questão. Tente novamente.");
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  async function refresh() {
    await fetchQuestions();
  }

  const stats = useMemo(() => ({
    total: questions.length,
    mc:    questions.filter(q => q.type === "mc").length,
    tf:    questions.filter(q => q.type === "tf").length,
    essay: questions.filter(q => q.type === "essay").length,
  }), [questions]);

  const topics = useMemo(() =>
    [...new Set(questions.map(q => q.topic))],
    [questions]
  );

  return (
    <QuizContext.Provider value={{
      questions, stats, topics,
      loading, error,
      addQuestion, updateQuestion, deleteQuestion, refresh,
    }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used inside QuizProvider");
  return ctx;
}