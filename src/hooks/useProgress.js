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
    setProgress(prev => {
      if (prev.answered.includes(questionId)) return prev;
      const next = { ...prev, answered: [...prev.answered, questionId] };
      save(next);
      return next;
    });
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