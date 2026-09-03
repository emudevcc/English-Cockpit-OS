// Pronunciation practice: Shadowing, Minimal Pairs, and Dictation.

import { apiGet } from "../lib/api.js";
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

const TABS = [
  { id: "shadow", label: "Shadow" },
  { id: "pairs", label: "Minimal Pairs" },
  { id: "dictation", label: "Dictation" },
];

/**
 * @param {HTMLElement} slot
 */
export function init(slot) {
  const content = h("div", {});
  let active = "shadow";

  const tabButtons = TABS.map((tab) =>
    h("button", {
      class: "chip",
      type: "button",
      text: tab.label,
      onclick: () => select(tab.id),
    }),
  );

  slot.append(h("div", { class: "chips" }, tabButtons), content);

  function select(id) {
    active = id;
    tabButtons.forEach((button, index) => {
      button.classList.toggle("is-active", TABS[index].id === id);
    });
    render();
  }

  function render() {
    clear(content);
    if (active === "shadow") renderShadow(content);
    else if (active === "pairs") renderPairs(content);
    else renderDictation(content);
  }

  select("shadow");
}

function renderShadow(slot) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let target = SENTENCES[0];

  const targetEl = h("p", { class: "shadow-target", text: target });
  const playBtn = h("button", { class: "chip", type: "button", text: "🔊 Play", onclick: () => pronounce(target) });
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
      h("p", { class: "shadow-score", text: `Accuracy: ${diff.accuracy}% (${diff.matched}/${diff.total} words)` }),
      line,
      h("p", { class: "muted", text: `You said: "${spoken}"` }),
    );
  }
}

async function renderPairs(slot) {
  let pairs = [];
  let currentPair = null;
  let currentWord = null;

  const promptEl = h("p", { class: "shadow-target", text: "Click Play, then choose which word you heard." });
  const playBtn = h("button", { class: "primary", type: "button", text: "🔊 Play", onclick: play });
  const optionsEl = h("div", { class: "chips" });
  const resultEl = h("div", { class: "drill-result", "aria-live": "polite" });

  slot.append(promptEl, playBtn, optionsEl, resultEl);

  try {
    pairs = await apiGet("/api/pronunciation/minimal-pairs");
    nextPair();
  } catch (error) {
    slot.append(h("p", { class: "error", text: error.message }));
    return;
  }

  try {
    const pitfalls = await apiGet("/api/pronunciation/pitfalls");
    const list = h("ul", { class: "wod-examples" });
    for (const pitfall of pitfalls) {
      list.append(h("li", { text: `${pitfall.issue}: ${pitfall.tip}` }));
    }
    slot.append(h("p", { class: "subtitle", text: "Spanish speaker pitfalls" }), list);
  } catch {
    /* pitfalls optional */
  }

  function nextPair() {
    currentPair = pairs[Math.floor(Math.random() * pairs.length)];
    currentWord = Math.random() < 0.5 ? currentPair.a : currentPair.b;
    clear(optionsEl);
    clear(resultEl);
    optionsEl.append(
      h("button", { class: "chip", type: "button", text: currentPair.a, onclick: () => answer(currentPair.a) }),
      h("button", { class: "chip", type: "button", text: currentPair.b, onclick: () => answer(currentPair.b) }),
    );
  }

  function play() {
    pronounce(currentWord);
  }

  function answer(choice) {
    const correct = choice === currentWord;
    clear(resultEl);
    resultEl.append(
      h("p", { class: correct ? "quiz-correct" : "quiz-wrong", text: correct ? "✓ Correct" : `✗ You heard "${currentWord}"` }),
      h("p", { class: "muted", text: `${currentPair.a} ${currentPair.ipa_a} · ${currentPair.b} ${currentPair.ipa_b}` }),
      h("button", { class: "chip", type: "button", text: "Next", onclick: nextPair }),
    );
  }
}

function renderDictation(slot) {
  let target = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

  const promptEl = h("p", { class: "shadow-target", text: "Click Play, then type what you hear." });
  const playBtn = h("button", { class: "chip", type: "button", text: "🔊 Play", onclick: () => pronounce(target) });
  const nextBtn = h("button", { class: "chip", type: "button", text: "Next", onclick: nextSentence });
  const input = h("textarea", {
    class: "declutter-input",
    rows: "2",
    placeholder: "Type what you hear…",
    "aria-label": "Dictation answer",
  });
  const checkBtn = h("button", { class: "primary", type: "button", text: "Check", onclick: check });
  const resultEl = h("div", { class: "drill-result", "aria-live": "polite" });

  slot.append(promptEl, h("div", { class: "chips" }, playBtn, nextBtn), input, h("div", { class: "chips" }, checkBtn), resultEl);

  function nextSentence() {
    target = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    input.value = "";
    clear(resultEl);
  }

  function check() {
    const diff = shadowDiff(target, input.value);
    clear(resultEl);
    const line = h("p", { class: "shadow-line" });
    for (const item of diff.words) {
      line.append(h("span", { class: item.matched ? "shadow-hit" : "shadow-miss", text: item.word }), " ");
    }
    resultEl.append(
      h("p", { class: "shadow-score", text: `Accuracy: ${diff.accuracy}% (${diff.matched}/${diff.total} words)` }),
      line,
      h("p", { class: "muted", text: target }),
    );
  }
}
