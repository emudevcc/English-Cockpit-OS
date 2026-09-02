// Executive De-Clutter & Polish Assistant.

import { apiPost } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";
import { reductionPercent } from "../lib/text.js";

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  const textarea = h("textarea", {
    class: "declutter-input",
    rows: "6",
    placeholder: "Paste an email or chat draft…",
    "aria-label": "Draft to polish",
  });
  const button = h("button", { class: "primary", type: "button", text: "Polish", onclick: polish });
  const resultEl = h("div", { class: "declutter-result", "aria-live": "polite" });

  slot.append(textarea, button, resultEl);

  async function polish() {
    const draft = textarea.value.trim();
    if (!draft) return;
    button.disabled = true;
    try {
      const data = await apiPost("/api/declutter", { draft });
      render(data);
    } catch (error) {
      clear(resultEl);
      resultEl.append(h("p", { class: "error", text: `Polish failed: ${error.message}` }));
    } finally {
      button.disabled = false;
    }
  }

  function render(data) {
    clear(resultEl);
    const before = data.word_count_before;
    const after = data.word_count_after;
    const copyBtn = h("button", {
      type: "button",
      class: "chip",
      text: "Copy revised",
      onclick: () => copyText(data.revised, copyBtn),
    });
    resultEl.append(
      h("p", { class: "declutter-meta", text: `Word count: ${before} → ${after} (−${reductionPercent(before, after)}%)` }),
      h("div", { class: "bluf" }, h("strong", { text: "Revised: " }), data.revised),
    );
    if (data.verb_upgrades.length) {
      const list = h("ul", { class: "upgrade-list" });
      for (const upgrade of data.verb_upgrades) {
        list.append(h("li", { text: `${upgrade.weak} → ${upgrade.strong}` }));
      }
      resultEl.append(h("p", { class: "subtitle", text: "Weak → strong verbs" }), list);
    }
    resultEl.append(h("p", { class: "tone", text: `Tone: ${data.tone_assessment}` }));
    resultEl.append(h("div", { class: "chips" }, copyBtn));
  }

  function copyText(text, button) {
    if (!navigator.clipboard) {
      button.textContent = "Copy unavailable";
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        button.textContent = "Copied ✓";
      },
      () => {
        button.textContent = "Copy failed";
      },
    );
  }
}
