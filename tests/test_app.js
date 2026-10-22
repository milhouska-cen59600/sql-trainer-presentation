"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({
  document: { getElementById: () => ({ addEventListener() {} }) },
  fetch: () => new Promise(() => {}),
});
vm.runInContext(fs.readFileSync(path.join(root, "web/app.js"), "utf8"), context);
const check = (answer, task) => context.checkAnswer(answer, task);

test("every sample solution passes its own check", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  for (const task of tasks) assert.equal(check(task.solution, task), true, `Task ${task.id}`);
});

test("SQL comparison ignores whitespace and keyword case but preserves literals", () => {
  const task = { type: "write-query", solution: "SELECT id FROM lide WHERE jmeno = 'Eva';" };
  assert.equal(check("select ID\nfrom lide where jmeno='Eva'", task), true);
  assert.equal(check("select id from lide where jmeno='eva'", task), false);
  assert.equal(check("select id from lide where jmeno='E va'", task), false);
  assert.equal(check("", task), false);
  assert.equal(check("SELECT 'A B' FROM dual", {
    type: "write-query", solution: "SELECT 'AB' FROM dual",
  }), false);
});

test("explanations match whole numbers, words and dates", () => {
  const explanation = (keywords) => ({ type: "explain-result", keywords });
  assert.equal(check("12", explanation(["2"])), false);
  assert.equal(check("-2", explanation(["2"])), false);
  assert.equal(check("2.5", explanation(["2"])), false);
  assert.equal(check("2,5", explanation(["2"])), false);
  assert.equal(check("2", explanation(["2"])), true);
  assert.equal(check("Vrátí SQL.", explanation(["SQL"])), true);
  assert.equal(check("MySQL", explanation(["SQL"])), false);
  assert.equal(check("2026-01-16", explanation(["2026-01-16"])), true);
  assert.equal(check("2026-01-17", explanation(["2026-01-16"])), false);
  assert.equal(check("1 a 2", explanation(["1", "2", "3"])), false);
  assert.equal(check("1,2,3", explanation(["1", "2", "3"])), true);
  assert.equal(check("1.5,2,3", explanation(["1", "2", "3"])), false);
  assert.equal(check("cokoli", explanation(["!!!"])), false);
});
