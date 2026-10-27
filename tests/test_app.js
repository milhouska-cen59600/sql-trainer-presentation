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

function classList() {
  const names = new Set();
  return {
    add: (...items) => items.forEach((item) => names.add(item)),
    remove: (...items) => items.forEach((item) => names.delete(item)),
    contains: (item) => names.has(item),
    values: () => [...names],
  };
}

async function createApp(random = Math.random) {
  const node = () => ({
    value: "", textContent: "", children: [], listeners: {}, classList: classList(),
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
    fetch: async (url, options) => {
      assert.equal(url, "./tasks.json");
      assert.equal(options.cache, "no-cache");
      return { ok: true, json: async () => catalog };
    },
    Math: Object.assign(Object.create(Math), { random }),
  });
  vm.runInContext(fs.readFileSync(path.join(root, "web/app.js"), "utf8"), app);
  await new Promise(setImmediate);
  return {
    get, catalog,
    exercises: JSON.parse(vm.runInContext("JSON.stringify(exerciseTasks())", app)),
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
  const { get, trigger, current, catalog } = await createApp(() => 0);
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
          assert.equal(get("tables").children.length, task.tables.length);
          for (const [index, data] of task.tables.entries()) {
            const wrapper = get("tables").children[index];
            assert.equal(wrapper.className, "table-scroll");
            const table = wrapper.children[0];
            assert.equal(table.caption.textContent, `${data.name} · ukázková data`);
            assert.deepEqual(Array.from(table.tHead.rows[0].children, (cell) => cell.textContent),
              data.columns);
            assert.ok(Array.from(table.tHead.rows[0].children).every((cell) => cell.scope === "col"));
            assert.deepEqual(Array.from(table.tBody.rows, (row) =>
              Array.from(row.cells, (cell) => cell.textContent)),
            data.rows.map((row) => row.map((value) => value === null ? "NULL" : String(value))));
          }
          get("answer").value = task.solution;
          trigger("answer-form", "submit");
          assert.match(get("feedback").textContent, /^✓ Shoda se vzorem\./);
          trigger("next");
        }
        assert.equal(current().id, expected[0].id);
      }
    }
  }
});

test("start samples the filtered selection on every click, including first and last indices", async () => {
  let random = 0;
  const { get, trigger, current, exercises } = await createApp(() => random);
  for (const level of ["zaklady", "pokrocile"]) {
    get("level").value = level;
    trigger("level", "change");
    for (const type of ["write-query", "explain-result", "fix-sql"]) {
      get("task-type").value = type;
      trigger("task-type", "change");
      for (const topic of get("topic").children.map((option) => option.value)) {
        get("topic").value = topic;
        trigger("topic", "change");
        const expected = exercises.filter((task) => task.level === level && task.type === type &&
          (!topic || task.topic === topic));
        if (!expected.length) continue;
        for (const value of [0, 0.5, 1 - Number.EPSILON]) {
          random = value;
          trigger("load");
          const index = Math.floor(value * expected.length);
          assert.equal(current().id, expected[index].id);
          assert.equal(current().type, type);
          assert.equal(get("position").textContent, `Úloha ${index + 1} z ${expected.length}`);
          trigger("next");
          assert.equal(current().id, expected[(index + 1) % expected.length].id);
        }
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
  assert.equal(get("tables").children.length, 0);
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

test("feedback shows distinct empty, match and mismatch states and resets text and classes", async () => {
  let random = 0;
  const { get, trigger, current } = await createApp(() => random);
  const states = ["feedback-empty", "feedback-success", "feedback-error"];
  const feedbackState = () => states.filter((name) => get("feedback").classList.contains(name));
  const assertCleared = (step) => {
    assert.equal(get("feedback").textContent, "", step);
    assert.deepEqual(feedbackState(), [], step);
  };
  const submit = (answer) => {
    get("answer").value = answer;
    trigger("answer-form", "submit");
  };
  trigger("load");
  assertCleared("load");

  submit("  \n ");
  assert.deepEqual(feedbackState(), ["feedback-empty"]);
  assert.match(get("feedback").textContent, /^! Nejprve napiš odpověď\.$/);

  submit(current().solution);
  assert.deepEqual(feedbackState(), ["feedback-success"]);
  assert.match(get("feedback").textContent, /^✓ Shoda se vzorem\./);

  submit("SELECT 1 FROM dual;");
  assert.deepEqual(feedbackState(), ["feedback-error"]);
  assert.match(get("feedback").textContent, /^✗ Neshoda se vzorem\./);
  // A mismatch is not a verdict on SQL validity: the check never executes SQL.
  assert.match(get("feedback").textContent, /Kontrola SQL neprovádí/);
  assert.match(get("feedback").textContent, /nemusí rozpoznat jiný správný zápis/);
  assert.doesNotMatch(get("feedback").textContent, /Nesprávně|chybn/i);

  for (const [step, action] of [
    ["input", () => get("answer").listeners.input({})],
    ["next", () => trigger("next")],
    ["random", () => trigger("random")],
    ["load", () => trigger("load")],
    ["level", () => trigger("level", "change")],
    ["task-type", () => trigger("task-type", "change")],
    ["topic", () => trigger("topic", "change")],
  ]) {
    if (!current()) trigger("load");
    submit("SELECT 1 FROM dual;");
    assert.equal(feedbackState().length, 1, step);
    action();
    assertCleared(step);
    if (!current()) continue;
    submit(current().solution);
    assert.deepEqual(feedbackState(), ["feedback-success"], step);
    action();
    assertCleared(step);
  }
});

test("random selection samples every exercise in the selected level regardless of topic or type", async () => {
  let random = 0;
  const { get, trigger, current, exercises } = await createApp(() => random);
  assert.equal(get("random").disabled, false);
  for (const level of ["zaklady", "pokrocile"]) {
    get("level").value = level;
    trigger("level", "change");
    const expected = exercises.filter((task) => task.level === level);
    for (const topic of ["", "select"]) {
      get("topic").value = topic;
      trigger("topic", "change");
      for (const [index, task] of expected.entries()) {
        random = (index + 0.5) / expected.length;
        trigger("random");
        assert.equal(current().id, task.id);
        assert.equal(get("prompt").textContent, task.prompt);
        assert.equal(get("position").textContent, `Úloha ${index + 1} z ${expected.length}`);
        assert.equal(get("answer").disabled, false);
        get("answer").value = task.solution;
        trigger("answer-form", "submit");
        assert.match(get("feedback").textContent, /^✓ Shoda se vzorem\./);
      }
    }
    for (const [value, index] of [[0, 0], [1 - Number.EPSILON, expected.length - 1]]) {
      random = value;
      trigger("random");
      assert.equal(current().id, expected[index].id);
      trigger("next");
      assert.equal(current().id, expected[(index + 1) % expected.length].id);
    }
  }
});

test("random button is enabled exactly when the selected level has candidate tasks", async () => {
  let random = 0;
  const { get, trigger, current, exercises } = await createApp(() => random);
  for (const level of ["zaklady", "pokrocile", "empty-level", "zaklady"]) {
    get("level").value = level;
    trigger("level", "change");
    const expected = exercises.filter((task) => task.level === level);
    assert.equal(get("random").disabled, expected.length === 0, level);
    if (!expected.length) continue;
    get("task-type").value = "explain-result";
    get("topic").value = expected[0].topic;
    trigger("topic", "change");
    assert.equal(get("random").disabled, false);
    const types = new Set();
    for (const index of expected.keys()) {
      random = index / expected.length;
      trigger("random");
      assert.equal(current().level, level);
      types.add(current().type);
    }
    assert.deepEqual([...types].sort(), ["explain-result", "fix-sql", "write-query"]);
  }
});

test("random selection clears stale state for an empty level and exact-topic browsing still works", async () => {
  const { get, trigger, current, catalog } = await createApp(() => 0.5);
  trigger("random");
  get("answer").value = "unfinished answer";
  trigger("hint-button");
  trigger("solution-button");
  get("level").value = "empty-level";
  trigger("random");
  assert.equal(current(), undefined);
  assert.match(get("prompt").textContent, /Pro zvolenou úroveň zatím není úloha/);
  assert.equal(get("answer").value, "");
  assert.equal(get("tables").children.length, 0);
  assert.equal(get("hint-section").hidden, true);
  assert.equal(get("solution-section").hidden, true);
  for (const id of ["answer", "check", "hint-button", "solution-button", "next"]) {
    assert.equal(get(id).disabled, true);
  }
  trigger("next");
  trigger("hint-button");
  trigger("solution-button");
  assert.equal(current(), undefined);

  get("level").value = "zaklady";
  trigger("level", "change");
  get("topic").value = "select";
  trigger("topic", "change");
  trigger("random");
  trigger("load");
  const expected = catalog.filter((task) => task.level === "zaklady" &&
    task.type === "write-query" && task.topic === "select");
  const start = Math.floor(0.5 * expected.length);
  for (let offset = 0; offset < expected.length; offset++) {
    const task = expected[(start + offset) % expected.length];
    assert.equal(current().id, task.id);
    trigger("next");
  }
  assert.equal(current().id, expected[start].id);
});

test("every sample solution passes its own check", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  for (const task of tasks) assert.equal(check(task.solution, task), true, `Task ${task.id}`);
});

test("result-only explanations accept the requested result without extra commentary", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  const answers = new Map([
    [20, "3, 2"], [27, "40"], [29, "2"], [35, "200"],
    [48, "100, 120"], [50, "3"], [63, "1, 3"], [74, "1, 2, 3"],
  ]);
  for (const [id, answer] of answers) {
    const task = tasks.find((item) => item.id === id);
    assert.equal(check(answer, task), true, `Task ${id}: requested result`);
    assert.equal(check("999", task), false, `Task ${id}: incorrect result`);
  }
});

test("date and DECODE explanations agree with the requested output", () => {
  const tasks = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  const date = tasks.find((task) => task.id === 67);
  assert.equal(check("2026-02-28", date), true);
  assert.equal(check("2026-02-27", date), false);
  const decode = tasks.find((task) => task.id === 77);
  assert.equal(check("Pro A: aktivní; pro Z: ostatní.", decode), true);
  assert.equal(check("aktivní", decode), false);
  assert.equal(check("jiné", decode), false);
  const lag = tasks.find((task) => task.id === 100);
  assert.equal(check("NULL, 10, 20", lag), true);
  assert.equal(check("10, 20", lag), false);
});

test("Partitioning renders the selected partition as sample-table context", async () => {
  const { get, trigger } = await createApp(() => 0);
  get("level").value = "pokrocile";
  trigger("level", "change");
  get("topic").value = "partitioning";
  trigger("topic", "change");
  trigger("load");

  const table = get("tables").children[0].children[0];
  assert.equal(table.caption.textContent, "invoices (oddíl p2026) · ukázková data");
  assert.deepEqual(Array.from(table.tHead.rows[0].children, (cell) => cell.textContent),
    ["id (NUMBER)", "amount (NUMBER(10,2))"]);
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

test("theory is a native disclosure, collapsed on each task and filter change", async () => {
  const html = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
  assert.match(html, /<details id="theory-section" hidden>\s*<summary>Teorie<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  const { get, trigger, current } = await createApp();
  trigger("load");
  assert.equal(get("theory-section").hidden, false);
  assert.equal(get("theory-section").open, false);
  assert.equal(get("theory").textContent, current().theory);
  get("theory-section").open = true;
  assert.equal(get("theory-section").open, true);
  trigger("next");
  assert.equal(get("theory-section").open, false);
  assert.equal(get("hint-section").hidden, true);
  assert.equal(get("solution-section").hidden, true);
  get("theory-section").open = true;
  trigger("topic", "change");
  assert.equal(get("theory-section").open, false);
});

test("sample headers render English identifiers and parenthesized datatypes", async () => {
  const { get, trigger } = await createApp(() => 0);
  get("topic").value = "agregace";
  trigger("load");
  const headers = get("tables").children[0].children[0].tHead.rows[0].children;
  assert.ok(headers.some((cell) => cell.textContent === "department (VARCHAR2(20))"));
  assert.ok(headers.every((cell) => /^[a-z_]+ \([A-Z0-9]+(?:\([\d,]+\))?\)$/.test(cell.textContent)));
});

test("Fix SQL derives every write task, preserves filters, and checks canonical answers", async () => {
  assert.match(fs.readFileSync(path.join(root, "web/index.html"), "utf8"),
    /<option value="fix-sql">Oprav SQL<\/option>/);
  const { get, trigger, current, catalog } = await createApp(() => 0);
  for (const level of ["zaklady", "pokrocile"]) {
    get("level").value = level;
    trigger("level", "change");
    get("task-type").value = "fix-sql";
    trigger("task-type", "change");
    for (const topic of get("topic").children.map((option) => option.value)) {
      get("topic").value = topic;
      trigger("topic", "change");
      trigger("load");
      const expected = catalog.filter((task) => task.type === "write-query" &&
        task.level === level && (!topic || task.topic === topic));
      for (const source of expected) {
        const task = current();
        assert.equal(task.id, source.id);
        assert.equal(task.type, "fix-sql");
        assert.equal(task.solution, source.solution);
        assert.equal(task.prompt, source.prompt);
        assert.equal(task.theory, source.theory);
        assert.equal(get("sql-heading").textContent, "SQL k opravě");
        assert.equal(get("sql").textContent, task.sql);
        assert.equal(get("answer").value, task.sql);
        assert.match(task.sql, /\n/);
        assert.equal(check(task.sql, task), false);
        trigger("answer-form", "submit");
        assert.match(get("feedback").textContent, /^✗ Neshoda se vzorem\./);
        get("answer").value = source.solution;
        trigger("answer-form", "submit");
        assert.match(get("feedback").textContent, /^✓ Shoda se vzorem\./);
        trigger("solution-button");
        assert.match(get("solution").textContent, /\n/);
        assert.equal(check(get("solution").textContent, task), true);
        trigger("next");
      }
      if (expected.length) assert.equal(current().id, expected[0].id);
      else assert.equal(current(), undefined);
    }
  }
});

test("SQL formatting is multi-line, stable, and preserves canonical tokens", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  const examples = catalog.map((task) => task.sql || task.solution)
    .concat([
      `SELECT 'FROM, ORDER BY ''SELECT''', "GROUP BY" FROM dual;`,
      "WITH x AS (SELECT id FROM a WHERE id IN (SELECT id FROM b)) SELECT * FROM x;",
      "SELECT a.id FROM a LEFT OUTER JOIN b ON a.id = b.id ORDER BY a.id;",
    ]);
  for (const sql of examples) {
    const formatted = context.formatSql(sql);
    assert.match(formatted, /\n/);
    assert.equal(context.normalizeSql(formatted), context.normalizeSql(sql));
    assert.equal(context.formatSql(formatted), formatted);
  }
  assert.equal(context.formatSql("SELECT id, name FROM products WHERE price > 100 ORDER BY name;"),
    "SELECT id,\n  name\nFROM products\nWHERE price > 100\nORDER BY name;");
});

test("repair pools cover applicable semantic and syntactic families, not keyword typos", () => {
  const examples = [
    ["SELECT id, name FROM products;", ["projection"]],
    ["SELECT name FROM products WHERE price > 100;", ["filter", "projection"]],
    ["SELECT name FROM products WHERE price BETWEEN 80 AND 120;", ["filter"]],
    ["SELECT name FROM products WHERE name LIKE 'K%';", ["filter"]],
    ["SELECT name FROM products ORDER BY price DESC;", ["ordering"]],
    ["SELECT department, SUM(salary) FROM employees GROUP BY department;", ["aggregate", "grouping"]],
    ["SELECT a.id FROM a JOIN b ON a.id = b.id;", ["join"]],
    ["WITH expensive AS (SELECT name, price FROM products WHERE price > 100) SELECT name FROM expensive;",
      ["cte-reference", "projection", "filter"]],
    ["SELECT ROUND(123.456, 2) FROM dual;", ["function-arguments"]],
    ["SELECT UPPER(name) FROM products;", ["function", "function-arguments"]],
    ["SELECT id FROM a UNION ALL SELECT id FROM b;", ["set-operation"]],
  ];
  for (const [sql, families] of examples) {
    const candidates = context.repairCandidates(sql);
    for (const family of families) {
      assert.ok(candidates.some((candidate) => candidate.family === family), `${family}: ${sql}`);
    }
    for (const candidate of candidates) {
      assert.equal(check(sql, { type: "fix-sql", solution: sql }), true);
      assert.equal(check(candidate.sql, { type: "fix-sql", solution: sql }), false);
      assert.doesNotMatch(candidate.sql, /\b(FORM|SORT BY|SELEC)\b/);
      assert.equal(context.formatSql(candidate.sql), candidate.sql);
    }
  }
  assert.match(context.repairCandidates(examples[4][0]).find((c) => c.family === "ordering").sql,
    /ORDER BY price ASC/);
  assert.doesNotMatch(context.repairCandidates(examples[5][0]).find((c) => c.family === "grouping").sql,
    /GROUP BY/);
  const grouped = "SELECT department, role, SUM(salary) FROM employees GROUP BY department, role;";
  assert.match(context.repairCandidates(grouped).find((c) => c.family === "grouping").sql,
    /GROUP BY role/);
  const having = "SELECT department, AVG(salary) FROM employees GROUP BY department HAVING AVG(salary) >= 45000;";
  for (const candidate of context.repairCandidates(having).filter((c) => c.family === "aggregate")) {
    assert.match(candidate.sql, /HAVING AVG\(salary\)/);
  }
});

test("all write-task candidates are distinct, formatted, and rejected while canonical answers pass", () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "web/tasks.json"), "utf8"));
  const families = new Set();
  for (const task of catalog.filter((task) => task.type === "write-query")) {
    const candidates = context.repairCandidates(task.solution);
    assert.ok(candidates.length, `Task ${task.id}`);
    assert.equal(check(context.formatSql(task.solution), task), true);
    for (const candidate of candidates) {
      families.add(candidate.family);
      assert.equal(check(candidate.sql, task), false, `${task.id}: ${candidate.family}`);
      assert.match(candidate.sql, /\n/);
    }
  }
  assert.ok(families.size >= 10);
});

test("injected randomness selects families evenly and avoids immediate repetition when possible", () => {
  const sql = "SELECT name FROM products WHERE price > 100 ORDER BY price;";
  const families = [...new Set(context.repairCandidates(sql).map((candidate) => candidate.family))];
  for (const [index, family] of families.entries()) {
    const generate = context.createRepairGenerator(() => (index + 0.5) / families.length);
    assert.equal(generate(sql).family, family);
  }
  const first = context.createRepairGenerator(() => 0);
  const second = context.createRepairGenerator(() => 0);
  let previous;
  for (let i = 0; i < 12; i++) {
    const repair = first(sql);
    assert.notEqual(repair.family, previous);
    assert.deepEqual(repair, second(sql));
    previous = repair.family;
  }
  const fallback = "SELECT 'FROM ORDER BY', \"GROUP\" FROM dual;";
  assert.equal(first(fallback).family, "projection-syntax");
  assert.equal(first(fallback).family, "projection-syntax");
  assert.equal(check(first(fallback).sql, { type: "fix-sql", solution: fallback }), false);
});

test("mutations preserve comments, literals, quoted and unrelated identifiers", () => {
  const sql = `SELECT name, 'WHERE price > 0 ''FROM''', "ORDER"
    FROM products /* JOIN x ON x.id = products.id */
    -- ORDER BY price
    WHERE price > 100 AND form_code = 'GROUP BY';`;
  for (const candidate of context.repairCandidates(sql)) {
    const quoted = (text) => Array.from(context.sqlTokens(text))
      .filter((token) => /^['"]|^--|^\/\*/.test(token));
    assert.deepEqual(quoted(candidate.sql), quoted(sql));
    assert.match(candidate.sql, /\bform_code\b/);
    assert.match(candidate.sql, /-- ORDER BY price\n/);
    assert.ok(["projection", "filter"].includes(candidate.family));
  }
  const nested = "SELECT name FROM products WHERE id IN (SELECT id FROM a) ORDER BY LOWER(name);";
  const ordering = context.repairCandidates(nested).find((candidate) => candidate.family === "ordering");
  assert.match(ordering.sql, /ORDER BY LOWER\(name\) DESC/);
  assert.ok(!context.repairCandidates("SELECT name FROM products;")
    .some((candidate) => ["join", "filter", "grouping", "ordering"].includes(candidate.family)));
  assert.ok(context.repairCandidates("SELECT name FROM products WHERE (price > 100);")
    .some((candidate) => candidate.family === "filter"));
  assert.ok(!context.repairCandidates("SELECT UPPER('123') FROM dual;")
    .some((candidate) => candidate.family === "function"));
  for (const sql of [
    "SELECT UPPER('123') FROM dual;",
    "SELECT TRIM(' FROM WHERE ') FROM dual;",
    'SELECT UPPER("name") FROM products;',
    `SELECT INITCAP(TRIM("name")) FROM products;`,
  ]) {
    const quoted = (text) => Array.from(context.sqlTokens(text)).filter((token) => /^['"]/.test(token));
    for (const candidate of context.repairCandidates(sql)) {
      assert.deepEqual(quoted(candidate.sql), quoted(sql));
      assert.equal(check(candidate.sql, { type: "fix-sql", solution: sql }), false);
    }
  }
});

test("session repeat avoidance follows displayed repairs, not hidden selection candidates", async () => {
  const { get, trigger, current } = await createApp(() => 0);
  get("task-type").value = "fix-sql";
  get("topic").value = "operatory";
  trigger("load");
  const first = current().sql;
  trigger("load");
  const second = current().sql;
  assert.notEqual(first, second);
  assert.equal(get("answer").value, second);
  assert.equal(get("hint-section").hidden, true);
  assert.equal(get("solution-section").hidden, true);
});

test("all exercise headers render English names with parenthesized NUMBER and VARCHAR2 types", async () => {
  const { get, trigger, exercises } = await createApp(() => 0);
  const headers = new Set();
  for (const level of ["zaklady", "pokrocile"]) {
    get("level").value = level;
    for (const type of ["write-query", "explain-result", "fix-sql"]) {
      get("task-type").value = type;
      trigger("load");
      for (let i = 0; i < exercises.filter((task) => task.level === level && task.type === type).length; i++) {
        for (const wrapper of get("tables").children) {
          for (const cell of wrapper.children[0].tHead.rows[0].children) {
            assert.match(cell.textContent, /^[a-z_]+ \([A-Z0-9]+(?:\([\d,]+\))?\)$/i);
            assert.doesNotMatch(cell.textContent, /^(nazev|cena|jmeno|castka|mzda) /);
            headers.add(cell.textContent);
          }
        }
        trigger("next");
      }
    }
  }
  assert.ok(headers.has("name (VARCHAR2(30))"));
  assert.ok(headers.has("price (NUMBER)"));
});

test("SQL examples and solutions use the same formatter; explanation prose is unchanged", async () => {
  const { get, trigger, current } = await createApp();
  for (const type of ["write-query", "explain-result"]) {
    get("task-type").value = type;
    trigger("task-type", "change");
    trigger("load");
    const task = current();
    assert.equal(get("answer").value, "");
    if (task.sql) assert.equal(get("sql").textContent, context.formatSql(task.sql));
    trigger("solution-button");
    assert.equal(get("solution").textContent,
      type === "explain-result" ? task.solution : context.formatSql(task.solution));
    assert.equal(get("hint-section").hidden, true);
    trigger("hint-button");
    assert.equal(get("hint").textContent, task.hint);
  }
});
