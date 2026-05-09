const DIRECT_LATEX_PATTERN =
  /\\[a-zA-Z]+|[\^_=+\-*/<>]|(?:\{.*\})|(?:\b[a-zA-Z]\s*\([^)]*\))/

export function sanitizeLatex(latex: string) {
  return latex
    .trim()
    .replace(/^```(?:latex)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^\$\$([\s\S]*)\$\$$/, "$1")
    .replace(/^\$([\s\S]*)\$$/, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
    .trim()
}

export function looksLikeDirectLatex(input: string) {
  return DIRECT_LATEX_PATTERN.test(input)
}

export function getDirectLatex(input: string) {
  const latex = sanitizeLatex(input)
  return looksLikeDirectLatex(latex) ? latex : null
}
