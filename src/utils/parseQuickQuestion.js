/**
 * Suporte a múltiplas questões separadas por linha em branco.
 *
 * Formato de cada questão:
 *
 * [MC]
 * Assunto: Nome do tema
 * Enunciado da questão
 * * Alternativa A
 * * Alternativa B x   ← correta
 * * Alternativa C
 * Explicação: texto opcional
 *
 * [VF]
 * Assunto: Nome do tema
 * Enunciado
 * Resposta: verdadeiro
 * Explicação: texto opcional
 *
 * [DISSERTATIVA]
 * Assunto: Nome do tema
 * Enunciado
 * Gabarito: resposta modelo
 * Dica: dica opcional
 */

function parseOne(block) {
  const lines = block
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return null;

  const errors = [];
  const firstLine = lines[0].toUpperCase();
  let type = null;

  if (firstLine.includes("[MC]") || firstLine.includes("[MÚLTIPLA]") || firstLine.includes("[MULTIPLA]")) {
    type = "mc";
  } else if (
    firstLine.includes("[VF]") || firstLine.includes("[TF]") ||
    firstLine.includes("[V/F]") || firstLine.includes("[VERDADEIRO")
  ) {
    type = "tf";
  } else if (
    firstLine.includes("[ESSAY]") || firstLine.includes("[DISSERTATIVA]") ||
    firstLine.includes("[DISSERTAÇÃO]") || firstLine.includes("[ABERTA]")
  ) {
    type = "essay";
  }

  if (!type) {
    errors.push('Tipo não reconhecido. Use [MC], [VF] ou [DISSERTATIVA] na primeira linha.');
    return { errors };
  }

  const rest = lines.slice(1);
  let explanation = "";
  let modelAnswer = "";
  let topic = "";
  const tips = [];
  const bodyLines = [];

  for (const line of rest) {
    const low = line.toLowerCase();
    if (low.startsWith("assunto:") || low.startsWith("tema:") || low.startsWith("topic:")) {
      topic = line.split(":").slice(1).join(":").trim();
    } else if (low.startsWith("explicação:") || low.startsWith("explicacao:") || low.startsWith("explanation:")) {
      explanation = line.split(":").slice(1).join(":").trim();
    } else if (low.startsWith("gabarito:") || low.startsWith("resposta modelo:") || low.startsWith("modelo:")) {
      modelAnswer = line.split(":").slice(1).join(":").trim();
    } else if (low.startsWith("dica:") || low.startsWith("tip:")) {
      tips.push(line.split(":").slice(1).join(":").trim());
    } else {
      bodyLines.push(line);
    }
  }

  // ── MC ──────────────────────────────────────────────────────
  if (type === "mc") {
    const optionLines   = bodyLines.filter(l => /^[\*\-]/.test(l));
    const questionLines = bodyLines.filter(l => !/^[\*\-]/.test(l));
    const answerLines   = rest.filter(l => l.toLowerCase().startsWith("resposta:"));

    // Remove linhas de resposta das questões TF que vazaram
    const cleanQuestion = questionLines
      .filter(l => !l.toLowerCase().startsWith("resposta:"))
      .join(" ")
      .trim();

    if (!cleanQuestion) { errors.push("Enunciado não encontrado."); return { errors }; }
    if (optionLines.length < 2) { errors.push("Adicione ao menos 2 alternativas começando com * ou -"); return { errors }; }

    const options = [];
    let answerIdx = -1;

    optionLines.forEach((line, i) => {
      let text = line.replace(/^[\*\-]\s*/, "").trim();
      const isCorrect = /\s+x\s*$|\s+X\s*$/i.test(text) || /\(x\)/i.test(text);
      if (isCorrect) {
        answerIdx = i;
        text = text.replace(/\s+[xX]\s*$/, "").replace(/\([xX]\)/i, "").trim();
      }
      options.push(text);
    });

    if (answerIdx === -1) {
      errors.push("Nenhuma alternativa marcada como correta. Adicione 'x' no final da alternativa certa.");
      return { errors };
    }

    return { type: "mc", topic, question: cleanQuestion, options, answer: answerIdx, explanation: explanation || undefined, errors: [] };
  }

  // ── TF ──────────────────────────────────────────────────────
  if (type === "tf") {
    let tfAnswer = null;

    const answerLine = rest.find(l => {
      const low = l.toLowerCase();
      return low.startsWith("resposta:") || low.startsWith("answer:") || low.startsWith("gabarito:");
    });

    if (answerLine) {
      const val = answerLine.split(":").slice(1).join(":").trim().toLowerCase();
      if (["verdadeiro", "true", "v", "sim", "yes", "1"].includes(val)) tfAnswer = true;
      if (["falso", "false", "f", "nao", "não", "no", "0"].includes(val)) tfAnswer = false;
    }

    if (tfAnswer === null) {
      errors.push("Resposta não encontrada. Adicione: 'Resposta: verdadeiro' ou 'Resposta: falso'");
      return { errors };
    }

    const questionText = bodyLines
      .filter(l => !l.toLowerCase().startsWith("resposta:"))
      .join(" ")
      .trim();

    if (!questionText) { errors.push("Enunciado não encontrado."); return { errors }; }

    return { type: "tf", topic, question: questionText, answer: tfAnswer, explanation: explanation || undefined, errors: [] };
  }

  // ── ESSAY ────────────────────────────────────────────────────
  if (type === "essay") {
    const questionText = bodyLines.join(" ").trim();
    if (!questionText) { errors.push("Enunciado não encontrado."); return { errors }; }
    if (!modelAnswer) { errors.push("Adicione: 'Gabarito: sua resposta modelo'"); return { errors }; }

    return {
      type: "essay", topic, question: questionText,
      model: modelAnswer,
      tips: tips.length > 0 ? tips : undefined,
      errors: [],
    };
  }

  return null;
}

/**
 * Parseia um texto com múltiplas questões.
 * Questões são separadas por uma ou mais linhas em branco.
 * Retorna array de { question, errors }.
 */
export function parseQuickQuestions(raw) {
  // Divide nos blocos que começam com [MC], [VF], [DISSERTATIVA], etc.
  const blocks = raw
    .split(/(?=\[MC\]|\[VF\]|\[TF\]|\[V\/F\]|\[DISSERTATIVA\]|\[ESSAY\]|\[ABERTA\]|\[MULTIPLA\]|\[MÚLTIPLA\])/i)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  if (blocks.length === 0) return [];

  return blocks.map((block, i) => {
    const result = parseOne(block);
    return { index: i + 1, ...result };
  });
}

// Mantém compatibilidade com código antigo
export function parseQuickQuestion(raw) {
  const results = parseQuickQuestions(raw);
  return results[0] ?? null;
}