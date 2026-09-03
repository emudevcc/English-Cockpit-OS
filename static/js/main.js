// Bootstraps the dashboard: WebSocket client, event bus, and feature modules.

import { createBus } from "./lib/bus.js";
import { h } from "./lib/dom.js";
import { createWsClient } from "./ws_client.js";
import * as declutter from "./components/declutter.js";
import * as dictionary from "./components/dictionary.js";
import * as grammar from "./components/grammar.js";
import * as news from "./components/news.js";
import * as podcast from "./components/podcast.js";
import * as prepDrill from "./components/prep_drill.js";
import * as radio from "./components/radio.js";
import * as register from "./components/register.js";
import * as shadowing from "./components/shadowing.js";
import * as speechCoach from "./components/speech_coach.js";
import * as srsDeck from "./components/srs_deck.js";
import * as stats from "./components/stats.js";
import * as voice from "./components/voice.js";
import * as weeklyPlan from "./components/weekly_plan.js";
import * as wordOfDay from "./components/word_of_day.js";

const MODULES = {
  "word-of-day": wordOfDay,
  news,
  podcast,
  radio,
  srs: srsDeck,
  prep: prepDrill,
  grammar,
  declutter,
  voice,
  speech: speechCoach,
  shadowing,
  register,
  "weekly-plan": weeklyPlan,
};

function boot() {
  const bus = createBus();
  const statusEl = document.getElementById("ws-status");

  const ws = createWsClient({
    url: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
    onStatus: (state) => {
      statusEl.dataset.state = state;
      statusEl.textContent = state;
    },
    onMessage: (message) => {
      if (message && typeof message === "object" && message.type) {
        bus.emit(message.type, message);
      }
    },
  });
  ws.connect();

  const ctx = { bus, ws };
  for (const section of document.querySelectorAll("[data-module]")) {
    const name = section.dataset.module;
    const slot = section.querySelector("[data-slot]");
    const module = MODULES[name];
    if (module && slot) module.init(slot, ctx);
  }

  dictionary.init();
  stats.init(document.getElementById("cockpit-stats"));
  setupFocusMode();
  setupHints();
}

function setupFocusMode() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const title = target?.closest(".card-title");
    if (!title) return;
    const card = title.closest(".cockpit-card");
    if (!card) return;
    toggleFocus(card);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const card of document.querySelectorAll(".cockpit-card.is-focus")) {
      card.classList.remove("is-focus");
    }
  });
}

function toggleFocus(card) {
  const focused = card.classList.toggle("is-focus");
  if (focused && !card.querySelector(".focus-close")) {
    const closeBtn = h("button", {
      class: "focus-close",
      type: "button",
      "aria-label": "Close focus",
      text: "✕",
      onclick: (event) => {
        event.stopPropagation();
        card.classList.remove("is-focus");
      },
    });
    card.querySelector(".card-title")?.append(closeBtn);
  }
}

function setupHints() {
  try {
    if (localStorage.getItem("cockpit-hints-dismissed")) return;
  } catch {
    return;
  }
  const bar = h(
    "div",
    { class: "hints", role: "status" },
    h(
      "span",
      { text: "💡 Space/1–4 grade · click any word to translate · click a card title to focus · hold to talk" },
    ),
    h("button", {
      class: "chip",
      type: "button",
      text: "Got it",
      onclick: () => {
        try {
          localStorage.setItem("cockpit-hints-dismissed", "1");
        } catch {
          /* ignore */
        }
        bar.remove();
      },
    }),
  );
  document.body.append(bar);
}

boot();
