// Daily Audio & Podcast Digest (Morning Brief) with playback-rate controls.

import { apiGet } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";

const REFRESH_MS = 30 * 60 * 1000;

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  async function load() {
    try {
      const data = await apiGet("/api/podcast-digest");
      clear(slot);
      slot.append(h("h3", { class: "subtitle", text: data.title }));

      const brief = h("div", { class: "brief" });
      for (const paragraph of data.brief) brief.append(h("p", { text: paragraph }));
      slot.append(brief);

      if (data.key_terms.length) {
        const terms = h("ul", { class: "vocab-list" });
        for (const term of data.key_terms) {
          terms.append(
            h("li", { class: "vocab-term" }, h("strong", { text: term.term }), ` — ${term.definition}`),
          );
        }
        slot.append(terms);
      }

      const firstEpisode = data.episodes.find((episode) => episode.audio_url);
      if (firstEpisode) slot.append(buildPlayer(firstEpisode));
    } catch (error) {
      renderError(error);
    }
  }

  function renderError(error) {
    clear(slot);
    slot.append(
      h("p", { class: "error", text: `Digest unavailable: ${error.message}` }),
      h("button", { type: "button", class: "chip", text: "Retry", onclick: load }),
    );
  }

  load();
  setInterval(load, REFRESH_MS);
}

function buildPlayer(episode) {
  const audio = h("audio", { controls: true, src: episode.audio_url });
  const setRate = (rate) => () => {
    audio.playbackRate = rate;
  };
  return h(
    "div",
    { class: "audio-player" },
    h("p", { class: "muted", text: episode.title }),
    audio,
    h(
      "div",
      { class: "chips" },
      h("button", { class: "chip", type: "button", onclick: setRate(1), text: "1×" }),
      h("button", { class: "chip", type: "button", onclick: setRate(1.25), text: "1.25×" }),
    ),
  );
}
