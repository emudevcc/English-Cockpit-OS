// Pure drill helpers: shuffle, answer normalization, irregular-verb check.

/**
 * Return a shuffled copy of an array (Fisher–Yates).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Normalize a typed answer for comparison (trim, lowercase, collapse spaces).
 * @param {string} text
 * @returns {string}
 */
export function normalizeAnswer(text) {
  return String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Check a learner's past-simple / past-participle answer against a verb.
 * @param {{past: string, participle: string}} verb
 * @param {string} pastInput
 * @param {string} participleInput
 * @returns {{pastCorrect: boolean, participleCorrect: boolean}}
 */
export function checkIrregularVerb(verb, pastInput, participleInput) {
  return {
    pastCorrect: normalizeAnswer(pastInput) === normalizeAnswer(verb.past),
    participleCorrect: normalizeAnswer(participleInput) === normalizeAnswer(verb.participle),
  };
}

/**
 * Case/whitespace-insensitive equality between a typed answer and the target.
 * @param {string} typed
 * @param {string} target
 * @returns {boolean}
 */
export function sameAnswer(typed, target) {
  return normalizeAnswer(typed) === normalizeAnswer(target);
}
