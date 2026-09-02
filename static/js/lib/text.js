// Pure text metrics shared by de-clutter and speech components.

/**
 * Count whitespace-separated words.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Percentage reduction from `before` to `after` words, floored at zero and
 * rounded to one decimal place.
 * @param {number} before
 * @param {number} after
 * @returns {number}
 */
export function reductionPercent(before, after) {
  if (!Number.isFinite(before) || before <= 0) return 0;
  const pct = ((before - after) / before) * 100;
  return Math.max(0, Math.round(pct * 10) / 10);
}
