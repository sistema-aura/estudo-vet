/** Bounded, distributed excerpts prevent a large PDF from exhausting the model context window. */
export function pdfContext(content: string, maxChars = 30000, question = ""): string {
  const text = content.replace(/\r/g, "").trim();
  if (text.length <= maxChars) return text;
  const parts: string[] = [];
  const target = Math.floor((maxChars - 350) / 7);
  const offsets = [0, .16, .33, .5, .66, .83, 1].map(value =>
    Math.floor(value * Math.max(0, text.length - target)));
  const words = question.toLocaleLowerCase("pt-PT").split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length >= 5).slice(0, 8);
  if (words.length) {
    const normalized = text.toLocaleLowerCase("pt-PT");
    let match = -1;
    for (const word of words) {
      const found = normalized.indexOf(word);
      if (found >= 0) { match = found; break; }
    }
    if (match >= 0) offsets[3] = Math.max(0, Math.min(text.length - target, match - Math.floor(target / 3)));
  }
  for (const start of [...new Set(offsets)].sort((a, b) => a - b)) {
    parts.push("[Excerto do documento]\n" + text.slice(start, start + target));
  }
  return parts.join("\n\n[…]\n\n").slice(0, maxChars);
}
