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

async function createApp() {
  const node = () => ({
    value: "", textContent: "", children: [], listeners: {},
    addEventListener(name, listener) { this.listeners[name] = listener; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    createCaption() { return this.caption = node(); },
    createTHead() { return this.tHead = node(); },
    createTBody() { return this.tBody = node(); },
    insertRow() {
      const row = node();
      (this.rows ||= []).push(row);
      return row;
    },
    insertCell() {
      const cell = node();
      (this.cells ||= []).push(cell);
      return cell;
    },
  });
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  };
  get("level").value = "zaklady";
  get("task-type").value = "write-query";
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  const app = vm.createContext({
    document: { getElementById: get, createElement: node },
    fetch: async () => ({ ok: true, json: async () => catalog }),
  });
  vm.runInContext(fs.readFileSync(path.join(root, "web/app.js"), "utf8"), app);
  await new Promise(setImmediate);
  return {
    get, catalog,
    trigger: (id, event = "click") => get(id).listeners[event]({ preventDefault() {} }),
    current: () => vm.runInContext("currentTask()", app),
  };
}

test("topic choices contain only topics from the selected level", async () => {
  const { get, trigger, catalog } = await createApp();
  for (const level of ["zaklady", "pokrocile", "zaklady"]) {
    get("level").value = level;
    trigger("level", "change");
    assert.deepEqual(get("topic").children.map((option) => option.value),
      ["", ...new Set(catalog.filter((task) => task.level === level).map((task) => task.topic))].sort());
  }
  get("topic").value = "select";
  get("level").value = "pokrocile";
  trigger("level", "change");
  assert.equal(get("topic").value, "");
  get("topic").value = "retezce";
  get("level").value = "zaklady";
  trigger("level", "change");
  assert.equal(get("topic").value, "retezce");
});

test("start and next stay within each level, type and topic, without internal ID labels", async () => {
  const { get, trigger, current, catalog } = await createApp();
  for (const level of ["zaklady", "pokrocile"]) {
    get("level").value = level;
    trigger("level", "change");
    for (const type of ["write-query", "explain-result"]) {
      get("task-type").value = type;
      trigger("task-type", "change");
      for (const topic of get("topic").children.map((option) => option.value)) {
        get("topic").value = topic;
        trigger("topic", "change");
        trigger("load");
        const expected = catalog.filter((task) => task.level === level && task.type === type &&
          (!topic || task.topic === topic));
        assert.ok(expected.length);
        for (const task of expected) {
          assert.equal(current().id, task.id);
          assert.equal(current().level, level);
          assert.match(get("task-heading").textContent, /^Úloha · \S/);
          assert.doesNotMatch(get("task-heading").textContent, /#\d+/);
          assert.equal(get("instruction").textContent, task.instruction);
          get("answer").value = task.solution;
          trigger("answer-form", "submit");
          assert.match(get("feedback").textContent, /^Odpověď odpovídá/);
          trigger("next");
        }
        assert.equal(current().id, expected[0].id);
      }
    }
  }
});

test("changing filters clears stale tasks and answers; empty selections never fall back", async () => {
  const { get, trigger, current } = await createApp();
  trigger("load");
  get("answer").value = "SELECT 1 FROM dual";
  trigger("hint-button");
  trigger("solution-button");
  get("level").value = "pokrocile";
  trigger("level", "change");
  assert.equal(current(), undefined);
  assert.equal(get("answer").value, "");
  assert.equal(get("hint-section").hidden, true);
  assert.equal(get("solution-section").hidden, true);
  assert.equal(get("task-heading").textContent, "Zadání");
  for (const id of ["answer", "check", "hint-button", "solution-button", "next"]) {
    assert.equal(get(id).disabled, true);
  }
  trigger("next");
  trigger("hint-button");
  trigger("solution-button");
  assert.equal(current(), undefined);
  assert.equal(get("hint").textContent, "");
  assert.equal(get("solution").textContent, "");
  get("topic").value = "select";
  trigger("load");
  assert.equal(current(), undefined);
  assert.match(get("prompt").textContent, /Pro tento výběr zatím není úloha/);
  get("topic").value = "";
  trigger("load");
  assert.equal(current().level, "pokrocile");
});

test("every sample solution passes its own check", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  for (const task of tasks) assert.equal(check(task.solution, task), true, `Task ${task.id}`);
});

test("Partitioning renders the selected partition as sample-table context", async () => {
  const { get, trigger } = await createApp();
  get("level").value = "pokrocile";
  trigger("level", "change");
  get("topic").value = "partitioning";
  trigger("topic", "change");
  trigger("load");

  const table = get("tables").children[0].children[0];
  assert.equal(table.caption.textContent, "faktury (oddíl p2026) · ukázková data");
  assert.deepEqual(Array.from(table.tHead.rows[0].children, (cell) => cell.textContent),
    ["id NUMBER", "castka NUMBER(10,2)"]);
  assert.deepEqual(Array.from(table.tHead.rows[0].children, (cell) => cell.scope), ["col", "col"]);
  assert.deepEqual(Array.from(table.tBody.rows, (row) =>
    Array.from(row.cells, (cell) => cell.textContent)),
  [["1", "1250"], ["2", "850.5"], ["3", "3100"]]);
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
