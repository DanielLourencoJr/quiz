export const DEFAULT_QUESTIONS = [
];

export const TOPIC_COLORS = {
  "Matéria, Pressão, Volume e Temperatura": "#3b82f6",
  "Fases de Agregação e Mudanças": "#10b981",
  "Fenômenos Físicos e Químicos": "#8b5cf6",
  "Propriedades da Matéria": "#ef4444",
  "Substâncias Puras e Misturas": "#f59e0b",
};

export const getTopicColor = (topic) =>
  TOPIC_COLORS[topic] || "#6366f1";
