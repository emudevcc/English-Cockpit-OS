// Spaced-repetition flashcard deck (keyboard: Space to flip, 1-4 to grade).

import { apiGet, apiPost } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";
import { pronounceButton } from "../lib/pronounce.js";
import { formatInterval, gradeLabel } from "../lib/srs.js";

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  let cards = [];
  let index = 0;
  let flipped = false;
  let busy = false;

  const cardEl = h("div", { class: "srs-card", tabindex: "0" });
  const controlsEl = h("div", { class: "srs-controls" });
  const progressEl = h("p", { class: "muted" });
  const statusEl = h("p", { class: "srs-status", "aria-live": "polite" });

  function render() {
    clear(cardEl);
    clear(controlsEl);
    const card = cards[index];
    if (!card) return;

    cardEl.append(
      h(
        "div",
        { class: "srs-front-row" },
        h("p", { class: "srs-front", text: card.front }),
        pronounceButton(card.front),
      ),
      flipped
        ? h(
            "div",
            { class: "srs-back" },
            h("p", { class: "srs-def", text: card.back }),
            card.ipa ? h("p", { class: "wod-ipa", text: card.ipa }) : null,
            h("ul", { class: "wod-examples" }, card.examples.map((example) => h("li", { text: example }))),
          )
        : h("p", { class: "muted", text: "Press Space to reveal the answer" }),
    );

    progressEl.textContent = `${index + 1} / ${cards.length}`;

    if (flipped) {
      for (let grade = 1; grade <= 4; grade += 1) {
        controlsEl.append(
          h("button", {
            class: "grade",
            type: "button",
            onclick: () => gradeCard(grade),
            text: `${grade} · ${gradeLabel(grade)}`,
          }),
        );
      }
    }
  }

  async function gradeCard(grade) {
    const card = cards[index];
    if (!card || !flipped || busy) return;
    busy = true;
    try {
      const result = await apiPost("/api/srs/review", { card_id: card.id, grade });
      statusEl.textContent = `Graded ${gradeLabel(grade)} — next review in ${formatInterval(result.interval_days)}.`;
      cards.splice(index, 1);
      if (index >= cards.length) index = 0;
      flipped = false;
      if (cards.length) render();
      else {
        clear(cardEl);
        clear(controlsEl);
        progressEl.textContent = "";
        cardEl.append(h("p", { class: "muted", text: "All caught up — no cards due right now." }));
      }
    } catch (error) {
      statusEl.textContent = error.message;
    } finally {
      busy = false;
    }
  }

  function onKey(event) {
    if (isInteractive(event.target)) return;
    if (event.code === "Space") {
      if (!cards.length) return;
      event.preventDefault();
      flipped = !flipped;
      render();
    } else if (["1", "2", "3", "4"].includes(event.key) && flipped) {
      event.preventDefault();
      gradeCard(Number(event.key));
    }
  }

  async function load() {
    try {
      const decks = await apiGet("/api/srs/decks");
      clear(slot);
      if (!decks.length) {
        slot.append(h("p", { class: "muted", text: "No decks yet." }));
        return;
      }
      cards = await apiGet(`/api/srs/decks/${decks[0].id}/due`);
      slot.append(
        cardEl,
        controlsEl,
        progressEl,
        statusEl,
        h("p", { class: "muted", text: "Space to flip · 1–4 to grade" }),
      );
      if (cards.length) render();
      else cardEl.append(h("p", { class: "muted", text: "All caught up — no cards due right now." }));
    } catch (error) {
      clear(slot);
      slot.append(h("p", { class: "error", text: `SRS unavailable: ${error.message}` }));
    }
  }

  document.addEventListener("keydown", onKey);
  load();
}

function isInteractive(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("button, a, input, textarea, select, [contenteditable]") !== null;
}
