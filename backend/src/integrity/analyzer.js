function normalizedTokens(code) {
  const withoutComments = String(code || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/#.*/gm, " ")
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, " STRING ");
  const keywords = new Set(["if", "else", "for", "while", "return", "function", "class", "public", "static", "void", "new", "import", "from", "def", "in", "range", "print", "const", "let", "var", "true", "false", "null", "none"]);
  return (withoutComments.match(/[A-Za-z_][A-Za-z0-9_]*|\d+|===|!==|==|!=|<=|>=|&&|\|\||\S/g) || []).map((token) => {
    if (/^\d+$/.test(token)) return "NUMBER";
    if (/^[A-Za-z_]/.test(token) && !keywords.has(token.toLowerCase())) return "IDENTIFIER";
    return token.toLowerCase();
  });
}

function shingles(tokens, size = 3) {
  const result = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) result.add(tokens.slice(index, index + size).join(" "));
  return result;
}

export function compareCodeStructure(firstCode, secondCode) {
  const first = normalizedTokens(firstCode);
  const second = normalizedTokens(secondCode);
  if (first.length < 12 || second.length < 12) return 0;
  const firstShingles = shingles(first);
  const secondShingles = shingles(second);
  let overlap = 0;
  for (const item of firstShingles) if (secondShingles.has(item)) overlap += 1;
  return overlap / (firstShingles.size + secondShingles.size - overlap || 1);
}

export function findSimilarSubmission({ code, submissions, studentId }) {
  let best = null;
  for (const submission of submissions) {
    if (submission.studentId === studentId) continue;
    const score = compareCodeStructure(code, submission.code);
    if (!best || score > best.score) best = { submission, score };
  }
  return best;
}
