import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_FILLERS, countFillers, wordsPerMinute } from "../../static/js/lib/speech.js";

test("countFillers counts whole-word fillers", () => {
  assert.equal(countFillers("Um, I like, you know, think so"), 3);
  assert.equal(countFillers("clean sentence"), 0);
});

test("countFillers respects word boundaries", () => {
  assert.equal(countFillers("likely umbrella"), 0);
});

test("wordsPerMinute computes rate", () => {
  assert.equal(wordsPerMinute(120, 60), 120);
  assert.equal(wordsPerMinute(60, 30), 120);
  assert.equal(wordsPerMinute(10, 0), 0);
});

test("default fillers include common ones", () => {
  assert.ok(DEFAULT_FILLERS.includes("um"));
  assert.ok(DEFAULT_FILLERS.includes("you know"));
  assert.ok(DEFAULT_FILLERS.includes("like"));
});
