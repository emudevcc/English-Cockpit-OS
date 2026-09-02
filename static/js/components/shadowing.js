// Shadowing mode: hear a sentence, repeat it, see a word-level accuracy diff.

import { clear, h } from "../lib/dom.js";
import { pronounce } from "../lib/pronounce.js";
import { shadowDiff } from "../lib/shadow.js";

const SENTENCES = [
  "We need to align on the roadmap before the kickoff.",
  "Could you walk me through the incident timeline?",
  "Let's circle back once the quarterly numbers come in.",
  "The proposal tries to boil the ocean and misses the point.",
  "I don't have the bandwidth for another project this sprint.",
  "We should tackle the low-hanging fruit before the redesign.",
];

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let target = SENTENCES[0];

  const targetEl = h("p", { class: "shadow-target", text: target });
  const playBtn = h("button", {
    class: "chip",
    type: "button",
    text: "🔊 Play",
    onclick: () => pronounce(target),
  });
  const nextBtn = h("button", { class: "chip", type: "button", text: "Next", onclick: nextSentence });
  const recBtn = h("button", { class: "primary", type: "button", text: "🎤 Record", onclick: toggleRecord });
  const resultEl = h("div", { class: "shadow-result", "aria-live": "polite" });

  slot.append(targetEl, h("div", { class: "chips" }, playBtn, nextBtn, recBtn), resultEl);

  let recognition = null;
  let finalTranscript = "";

  function nextSentence() {
    target = SENTENCES[(SENTENCES.indexOf(target) + 1) % SENTENCES.length];
    targetEl.textContent = target;
    clear(resultEl);
  }

  if (Recognition) {
    recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      finalTranscript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
    };
    recognition.onend = () => {
      recBtn.textContent = "🎤 Record";
      if (finalTranscript.trim()) showDiff(finalTranscript.trim());
      finalTranscript = "";
    };
    recognition.onerror = () => {
      recBtn.textContent = "🎤 Record";
    };
  } else {
    recBtn.disabled = true;
    recBtn.textContent = "Speech not supported";
  }

  function toggleRecord() {
    if (!recognition) return;
    if (recBtn.textContent === "🎤 Record") {
      try {
        recognition.start();
        recBtn.textContent = "⏹ Stop";
      } catch {
        recBtn.textContent = "🎤 Record";
      }
    } else {
      recognition.stop();
    }
  }

  function showDiff(spoken) {
    const diff = shadowDiff(target, spoken);
    clear(resultEl);
    const line = h("p", { class: "shadow-line" });
    for (const item of diff.words) {
      line.append(h("span", { class: item.matched ? "shadow-hit" : "shadow-miss", text: item.word }), " ");
    }
    resultEl.append(
      h(
        "p",
        { class: "shadow-score", text: `Accuracy: ${diff.accuracy}% (${diff.matched}/${diff.total} words)` },
      ),
      line,
      h("p", { class: "muted", text: `You said: "${spoken}"` }),
    );
  }
}
