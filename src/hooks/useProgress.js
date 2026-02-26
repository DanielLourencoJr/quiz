import { useState, useCallback } from "react";

const KEY = "quiz_progress_v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { answered: [] };
  } catch {
    return { answered: [] };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function useProgress() {
  const [progress, setProgress] = useState(() => load());

  const markAnswered = useCallback((questionId) => {
    // Escreve no localStorage de forma síncrona, ANTES do setState
    const current = load();
    if (current.answered.includes(questionId)) return;
    const next = { ...current, answered: [...current.answered, questionId] };
    save(next);
  
    // Depois atualiza o React state
    setProgress(next);
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = { answered: [] };
    save(fresh);
    setProgress(fresh);
  }, []);

  const hasAnswered = useCallback((questionId) => {
    return progress.answered.includes(questionId);
  }, [progress]);

  const answeredCount = progress.answered.length;

  return { progress, markAnswered, resetProgress, hasAnswered, answeredCount };
}