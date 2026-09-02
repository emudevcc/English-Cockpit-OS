// Live Speech & Speech-Metrics Coach (WPM + vocal fillers HUD).

import { clear, h } from "../lib/dom.js";
import { countFillers, wordsPerMinute } from "../lib/speech.js";
import { countWords } from "../lib/text.js";

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    slot.append(h("p", { class: "error", text: "Speech recognition is not supported in this browser." }));
    return;
  }

  const wpmEl = h("span", { class: "hud-value", text: "0" });
  const fillersEl = h("span", { class: "hud-value", text: "0" });
  const startBtn = h("button", { class: "primary", type: "button", text: "Start listening", onclick: start });
  const stopBtn = h("button", { type: "button", text: "Stop", onclick: stop, disabled: true });
  const transcriptEl = h("div", { class: "speech-transcript", "aria-live": "polite" });

  slot.append(
    h(
      "div",
      { class: "hud" },
      h("div", { class: "hud-cell" }, h("span", { class: "hud-label", text: "WPM" }), wpmEl),
      h("div", { class: "hud-cell" }, h("span", { class: "hud-label", text: "Fillers" }), fillersEl),
    ),
    h("div", { class: "chips" }, startBtn, stopBtn),
    transcriptEl,
  );

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  let startedAt = null;
  let transcript = "";

  recognition.onresult = (event) => {
    transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    const words = countWords(transcript);
    const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    wpmEl.textContent = String(wordsPerMinute(words, elapsed));
    fillersEl.textContent = String(countFillers(transcript));
    const display = transcript.length > 3000 ? `…${transcript.slice(-3000)}` : transcript;
    clear(transcriptEl);
    transcriptEl.append(display);
  };

  function start() {
    transcript = "";
    startedAt = Date.now();
    recognition.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }

  function stop() {
    recognition.stop();
    resetControls();
  }

  function resetControls() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  recognition.onend = resetControls;
  recognition.onerror = resetControls;
}
