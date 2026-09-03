// Daily Audio & Podcast Digest (Morning Brief) with playback-rate controls.

import { apiGet, apiPost } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";
import { highlightSegments } from "../lib/highlight.js";

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
      if (firstEpisode) {
        slot.append(buildPlayer(firstEpisode));
        slot.append(buildTranscript(firstEpisode));
      }
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

function buildTranscript(episode) {
  const container = h("div", { class: "podcast-transcript" });
  const button = h("button", {
    class: "chip",
    type: "button",
    text: "Transcript",
    onclick: () => transcribe(episode, container, button),
  });
  return h("div", { class: "chips" }, button, container);
}

async function transcribe(episode, container, button) {
  button.disabled = true;
  button.textContent = "Transcribing…";
  clear(container);
  container.append(h("p", { class: "muted", text: "Transcribing…" }));
  try {
    const data = await apiPost("/api/radio/transcribe", { audio_url: episode.audio_url });
    clear(container);
    const viewport = h("div", { class: "podcast-transcript" });
    const paragraph = h("p", { class: "transcript-segment" });
    for (const part of highlightSegments(data.text)) {
      paragraph.append(part.mark ? h("mark", { text: part.text }) : part.text);
    }
    viewport.append(paragraph);
    container.append(viewport);
  } catch (error) {
    clear(container);
    container.append(h("p", { class: "error", text: error.message }));
  } finally {
    button.disabled = false;
    button.textContent = "Transcript";
  }
}
