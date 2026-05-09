import katex from "katex";

const INLINE_MATH_TAG_REGEX =
  /<span\b([^>]*\bdata-type=(["'])inline-math\2[^>]*)><\/span>/gi;
const BLOCK_MATH_TAG_REGEX =
  /<div\b([^>]*\bdata-type=(["'])block-math\2[^>]*)><\/div>/gi;
const DATA_LATEX_REGEX = /\bdata-latex=(["'])([\s\S]*?)\1/i;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMathTag(attributes: string, displayMode: boolean) {
  const latexMatch = attributes.match(DATA_LATEX_REGEX);
  const encodedLatex = latexMatch?.[2];

  if (!encodedLatex) {
    return null;
  }

  const latex = decodeHtmlEntities(encodedLatex);
  const safeLatex = escapeHtmlAttribute(latex);

  return [
    displayMode ? "<div" : "<span",
    ` class="tiptap-mathematics-render"`,
    ` data-type="${displayMode ? "block-math" : "inline-math"}"`,
    ` data-latex="${safeLatex}"`,
    ">",
    katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
    }),
    displayMode ? "</div>" : "</span>",
  ].join("");
}

export function renderNoteContent(html: string) {
  return html
    .replace(BLOCK_MATH_TAG_REGEX, (match, attributes: string) => {
      return renderMathTag(attributes, true) ?? match;
    })
    .replace(INLINE_MATH_TAG_REGEX, (match, attributes: string) => {
      return renderMathTag(attributes, false) ?? match;
    });
}
