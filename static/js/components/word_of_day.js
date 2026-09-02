// Word & Idiom of the Day (with archive navigation).

import { apiGet, apiPost } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";
import { pronounceButton } from "../lib/pronounce.js";

const REFRESH_MS = 30 * 60 * 1000;

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  let currentDate = null; // null = today

  const prevBtn = h("button", { type: "button", class: "chip", text: "‹ Prev", onclick: () => shiftDay(-1) });
  const nextBtn = h("button", { type: "button", class: "chip", text: "Next ›", onclick: () => shiftDay(1) });

  async function load() {
    try {
      const url = currentDate ? `/api/word-of-day?date=${currentDate}` : "/api/word-of-day";
      const data = await apiGet(url);
      render(data);
    } catch (error) {
      renderError(error);
    }
  }

  function shiftDay(delta) {
    const base = currentDate ? new Date(`${currentDate}T00:00:00`) : new Date();
    base.setDate(base.getDate() + delta);
    currentDate = toDateStr(base);
    load();
  }

  function render(data) {
    clear(slot);
    const addBtn = h("button", {
      type: "button",
      class: "chip",
      text: "＋ Add to review",
      onclick: () => addToReview(data, addBtn),
    });
    slot.append(
      h(
        "div",
        { class: "wod-expression" },
        h("span", { class: "wod-term", text: data.expression }),
        pronounceButton(data.expression),
        h("span", { class: "tag", text: data.register_tag }),
      ),
      h("p", { class: "wod-ipa", text: data.ipa }),
      h("p", { class: "wod-def", text: data.definition }),
      h(
        "ul",
        { class: "wod-examples" },
        data.examples.map((example) => h("li", { text: example })),
      ),
      h("div", { class: "chips" }, addBtn),
      h("div", { class: "chips" }, prevBtn, nextBtn),
    );
  }

  async function addToReview(data, button) {
    try {
      await apiPost("/api/srs/cards", {
        front: data.expression,
        back: data.definition,
        ipa: data.ipa,
        register_tag: data.register_tag,
        examples: data.examples,
      });
      button.textContent = "Added ✓";
      button.disabled = true;
    } catch (error) {
      button.textContent = "Add failed";
    }
  }

  function renderError(error) {
    clear(slot);
    slot.append(
      h("p", { class: "error", text: `Could not load word of the day: ${error.message}` }),
      h("button", { type: "button", class: "chip", text: "Retry", onclick: load }),
    );
  }

  load();
  setInterval(load, REFRESH_MS);
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
