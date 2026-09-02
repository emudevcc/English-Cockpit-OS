// Tech & Business News Pulse.

import { apiGet } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";

const REFRESH_MS = 30 * 60 * 1000;

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  async function load() {
    try {
      const data = await apiGet("/api/news");
      clear(slot);
      if (!data.headlines.length) {
        slot.append(h("p", { class: "muted", text: "No headlines available right now." }));
        return;
      }
      const list = h("ul", { class: "news-list" });
      for (const headline of data.headlines) {
        const item = h(
          "li",
          { class: "news-item" },
          h(
            "a",
            { href: headline.link, target: "_blank", rel: "noopener", class: "news-title", text: headline.title },
          ),
          h("span", { class: "news-source", text: headline.source }),
        );
        if (headline.vocab.length) {
          const terms = h("ul", { class: "vocab-list" });
          for (const term of headline.vocab) {
            terms.append(
              h("li", { class: "vocab-term" }, h("strong", { text: term.term }), ` — ${term.definition}`),
            );
          }
          item.append(terms);
        }
        list.append(item);
      }
      slot.append(list);
    } catch (error) {
      renderError(error);
    }
  }

  function renderError(error) {
    clear(slot);
    slot.append(
      h("p", { class: "error", text: `News unavailable: ${error.message}` }),
      h("button", { type: "button", class: "chip", text: "Retry", onclick: load }),
    );
  }

  load();
  setInterval(load, REFRESH_MS);
}
