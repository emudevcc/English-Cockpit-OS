// Progress / streak strip (header) with a daily-review goal ring and a
// content-refresh countdown.

import { apiGet } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";

const STATS_REFRESH_MS = 60 * 1000;
const CONTENT_REFRESH_MS = 30 * 60 * 1000;

/**
 * @param {HTMLElement} el
 */
export function init(el) {
  const contentStart = Date.now();
  const countdownEl = h("span", {
    class: "stat",
    title: "Content refresh (news / podcast / word-of-day)",
  });

  async function load() {
    try {
      const s = await apiGet("/api/srs/stats");
      clear(el);
      render(s);
      el.append(countdownEl);
    } catch {
      clear(el);
    }
  }

  function render(s) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const streak = s.streak_days ? ` · 🔥 ${s.streak_days}-day streak` : "";
    const goal = s.daily_goal || 20;
    const pct = goal ? Math.min(1, s.reviews_today / goal) : 0;

    el.append(
      h("span", { class: "greeting", text: `${greeting}${streak}` }),
      goalRing(pct, s.reviews_today, goal),
      h("span", { class: "stat", title: "Due for review" }, `✅ ${s.cards_due}`),
      h("span", { class: "stat", title: "New words" }, `🆕 ${s.cards_new}`),
    );
  }

  function tick() {
    const remaining = CONTENT_REFRESH_MS - ((Date.now() - contentStart) % CONTENT_REFRESH_MS);
    const total = Math.max(0, Math.ceil(remaining / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    countdownEl.textContent = `⟳ ${mm}:${ss}`;
  }

  load();
  tick();
  setInterval(load, STATS_REFRESH_MS);
  setInterval(tick, 1000);
}

function goalRing(pct, done, goal) {
  const size = 34;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", String(size / 2));
  bg.setAttribute("cy", String(size / 2));
  bg.setAttribute("r", String(r));
  bg.setAttribute("fill", "none");
  bg.setAttribute("stroke", "var(--surface-2)");
  bg.setAttribute("stroke-width", String(stroke));

  const fg = bg.cloneNode();
  fg.setAttribute("stroke", "var(--accent)");
  fg.setAttribute("stroke-dasharray", String(circ));
  fg.setAttribute("stroke-dashoffset", String(circ * (1 - pct)));
  fg.setAttribute("stroke-linecap", "round");
  fg.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);

  svg.append(bg, fg);
  const label = h("span", { class: "goal-label", text: `${done}/${goal}` });
  return h("span", { class: "goal-ring", title: "Daily review goal" }, svg, label);
}
