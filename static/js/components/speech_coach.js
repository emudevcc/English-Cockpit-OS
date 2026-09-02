// Live Speech & Speech-Metrics Coach (WPM, pace, fillers, cadence + summary).

import { clear, h } from "../lib/dom.js";
import {
  cadenceLabel,
  countFillers,
  fillerRate,
  paceLabel,
  wordsPerMinute,
} from "../lib/speech.js";
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
  const paceEl = h("span", { class: "hud-label", text: "—" });
  const fillersEl = h("span", { class: "hud-value", text: "0" });
  const fillerRateEl = h("span", { class: "hud-label", text: "0/min" });
  const cadenceEl = h("span", { class: "hud-value", text: "—" });
  const startBtn = h("button", { class: "primary", type: "button", text: "Start listening", onclick: start });
  const stopBtn = h("button", { type: "button", text: "Stop", onclick: stop, disabled: true });
  const summaryEl = h("p", { class: "muted", "aria-live": "polite" });
  const transcriptEl = h("div", { class: "speech-transcript", "aria-live": "polite" });

  slot.append(
    h(
      "div",
      { class: "hud" },
      h("div", { class: "hud-cell" }, h("span", { class: "hud-label", text: "WPM" }), wpmEl, paceEl),
      h("div", { class: "hud-cell" }, h("span", { class: "hud-label", text: "Fillers" }), fillersEl, fillerRateEl),
      h("div", { class: "hud-cell" }, h("span", { class: "hud-label", text: "Cadence" }), cadenceEl),
    ),
    h("div", { class: "chips" }, startBtn, stopBtn),
    summaryEl,
    transcriptEl,
  );

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  let startedAt = null;
  let transcript = "";

  recognition.onresult = (event) => {
    const results = Array.from(event.results);
    transcript = results.map((result) => result[0].transcript).join(" ");
    const words = countWords(transcript);
    const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    const wpm = wordsPerMinute(words, elapsed);
    const fillers = countFillers(transcript);
    const finalCount = results.filter((result) => result.isFinal).length;
    const cadence = finalCount ? Math.round(words / finalCount) : 0;

    wpmEl.textContent = String(wpm);
    paceEl.textContent = paceLabel(wpm);
    paceEl.dataset.pace = paceLabel(wpm);
    fillersEl.textContent = String(fillers);
    fillerRateEl.textContent = `${fillerRate(fillers, elapsed)}/min`;
    cadenceEl.textContent = cadenceLabel(cadence);

    const display = transcript.length > 3000 ? `…${transcript.slice(-3000)}` : transcript;
    clear(transcriptEl);
    transcriptEl.append(display);
  };

  function start() {
    transcript = "";
    startedAt = Date.now();
    clear(summaryEl);
    recognition.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  }

  function stop() {
    recognition.stop();
    const words = countWords(transcript);
    const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    const wpm = wordsPerMinute(words, elapsed);
    const fillers = countFillers(transcript);
    summaryEl.textContent =
      `Session: ${words} words · ${wpm} WPM (${paceLabel(wpm)}) · ` +
      `${fillers} fillers (${fillerRate(fillers, elapsed)}/min) · ${formatDuration(elapsed)}`;
    resetControls();
  }

  function resetControls() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  recognition.onend = resetControls;
  recognition.onerror = resetControls;
}

function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
