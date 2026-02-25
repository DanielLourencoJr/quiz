/**
 * Converte texto no formato rápido para objeto de questão.
 *
 * Formatos aceitos:
 *
 * [MC]
 * Enunciado da questão
 * * Alternativa A
 * * Alternativa B x    ← x marca a correta
 * * Alternativa C
 * Explicação: texto opcional
 *
 * [VF] ou [TF]
 * Enunciado da questão
 * Resposta: verdadeiro  (ou "falso", "true", "false", "v", "f")
 * Explicação: texto opcional
 *
 * [DISSERTATIVA] ou [ESSAY]
 * Enunciado da questão
 * Gabarito: texto da resposta modelo
 * Dica: dica opcional
 * Dica: outra dica
 */
export function parseQuickQuestion(raw) {
    const lines = raw
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);
  
    if (lines.length === 0) return null;
  
    const errors = [];
  
    // ── Detecta o tipo ────────────────────────────────────────────
    const firstLine = lines[0].toUpperCase();
    let type = null;
  
    if (firstLine.includes("[MC]") || firstLine.includes("[MÚLTIPLA]") || firstLine.includes("[MULTIPLA]")) {
      type = "mc";
    } else if (
      firstLine.includes("[VF]") || firstLine.includes("[TF]") ||
      firstLine.includes("[V/F]") || firstLine.includes("[VERDADEIRO") ||
      firstLine.includes("[TRUE")
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
  
    // Remove a linha do tipo
    const rest = lines.slice(1);
  
    // ── Extrai campos especiais ───────────────────────────────────
    let explanation = "";
    let modelAnswer = "";
    const tips = [];
    const bodyLines = [];
  
    for (const line of rest) {
      const low = line.toLowerCase();
      if (low.startsWith("explicação:") || low.startsWith("explicacao:") || low.startsWith("explanation:")) {
        explanation = line.split(":").slice(1).join(":").trim();
      } else if (low.startsWith("gabarito:") || low.startsWith("resposta:") || low.startsWith("modelo:") || low.startsWith("answer:")) {
        modelAnswer = line.split(":").slice(1).join(":").trim();
      } else if (low.startsWith("dica:") || low.startsWith("tip:")) {
        tips.push(line.split(":").slice(1).join(":").trim());
      } else {
        bodyLines.push(line);
      }
    }
  
    // ── MC ────────────────────────────────────────────────────────
    if (type === "mc") {
      const optionLines = bodyLines.filter(l => l.startsWith("*") || l.startsWith("-"));
      const questionLines = bodyLines.filter(l => !l.startsWith("*") && !l.startsWith("-"));
  
      if (questionLines.length === 0) {
        errors.push("Enunciado da questão não encontrado.");
        return { errors };
      }
      if (optionLines.length < 2) {
        errors.push("Adicione ao menos 2 alternativas começando com * ou -");
        return { errors };
      }
  
      const options = [];
      let answerIdx = -1;
  
      optionLines.forEach((line, i) => {
        // Remove o * ou - do início
        let text = line.replace(/^[\*\-]\s*/, "").trim();
  
        // Verifica se tem " x" ou " X" ou "(x)" no final
        const isCorrect = /\s+x\s*$|\s+X\s*$|\(x\)|\(X\)/i.test(text);
        if (isCorrect) {
          answerIdx = i;
          text = text.replace(/\s+[xX]\s*$/, "").replace(/\([xX]\)/, "").trim();
        }
  
        options.push(text);
      });
  
      if (answerIdx === -1) {
        errors.push("Nenhuma alternativa marcada como correta. Adicione um 'x' no final da alternativa certa. Ex: * Alternativa correta x");
        return { errors };
      }
  
      return {
        type: "mc",
        question: questionLines.join(" ").trim(),
        options,
        answer: answerIdx,
        explanation: explanation || undefined,
        errors: [],
      };
    }
  
    // ── TF ────────────────────────────────────────────────────────
    if (type === "tf") {
      // A resposta pode estar numa linha "Resposta: verdadeiro" ou embutida no enunciado
      let tfAnswer = null;
  
      // Procura linha de resposta explícita
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
        errors.push("Resposta não encontrada. Adicione uma linha: 'Resposta: verdadeiro' ou 'Resposta: falso'");
        return { errors };
      }
  
      const questionText = bodyLines
        .filter(l => {
          const low = l.toLowerCase();
          return !low.startsWith("resposta:") && !low.startsWith("answer:") && !low.startsWith("gabarito:");
        })
        .join(" ")
        .trim();
  
      if (!questionText) {
        errors.push("Enunciado da questão não encontrado.");
        return { errors };
      }
  
      return {
        type: "tf",
        question: questionText,
        answer: tfAnswer,
        explanation: explanation || undefined,
        errors: [],
      };
    }
  
    // ── ESSAY ─────────────────────────────────────────────────────
    if (type === "essay") {
      const questionText = bodyLines.join(" ").trim();
  
      if (!questionText) {
        errors.push("Enunciado da questão não encontrado.");
        return { errors };
      }
      if (!modelAnswer) {
        errors.push("Gabarito não encontrado. Adicione uma linha: 'Gabarito: sua resposta modelo'");
        return { errors };
      }
  
      return {
        type: "essay",
        question: questionText,
        model: modelAnswer,
        tips: tips.length > 0 ? tips : undefined,
        errors: [],
      };
    }
  
    return null;
  }