// Progress / streak strip (header) with a daily-review goal ring.

import { apiGet } from "../lib/api.js";
import { clear, h } from "../lib/dom.js";

const REFRESH_MS = 60 * 1000;

/**
 * @param {HTMLElement} el
 */
export function init(el) {
  async function load() {
    try {
      const s = await apiGet("/api/srs/stats");
      render(s);
    } catch {
      clear(el);
    }
  }

  function render(s) {
    clear(el);
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

  load();
  setInterval(load, REFRESH_MS);
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
