export function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPreviewText(content: string, maxWords = 48) {
  return stripHtml(content)
    .split(" ")
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

export function formatAuthoredDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
