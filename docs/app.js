"use strict";

const element = (id) => document.getElementById(id);
const topicLabels = {
  select: "Výběr a řazení", operatory: "Operátory", datum: "Datum",
  retezce: "Řetězce", "datove-typy": "Datové typy", cisla: "Čísla",
  "mnozinove-operace": "Množinové operace", agregace: "Agregace",
  podminky: "Podmíněné výrazy", poddotazy: "Poddotazy", null: "NULL a NVL",
  joiny: "Spojování tabulek", cte: "WITH a CTE", listagg: "LISTAGG",
  partitioning: "Partitioning", "datovy-slovnik": "Datový slovník",
  "pivot-unpivot": "PIVOT a UNPIVOT", "pokrocile-agregace": "Pokročilé agregace",
  "regularni-vyrazy": "Regulární výrazy", "hierarchicke-dotazy": "Hierarchické dotazy",
  "analyticke-funkce": "Analytické funkce",
};
let tasks = [];
let selection = [];
let currentIndex = -1;
const currentTask = () => selection[currentIndex];

function setActions(enabled) {
  for (const id of ["answer", "check", "hint-button", "solution-button", "next"]) {
    element(id).disabled = !enabled;
  }
}

function clearTask(message) {
  currentIndex = -1;
  setActions(false);
  for (const id of ["position", "instruction", "sql", "theory", "hint", "solution", "feedback"]) {
    element(id).textContent = "";
  }
  for (const id of ["sql-section", "theory-section", "hint-section", "solution-section"]) {
    element(id).hidden = true;
  }
  element("theory-section").open = false;
  element("task-heading").textContent = "Zadání";
  element("prompt").textContent = message;
  element("tables").replaceChildren();
  element("answer").value = "";
}

function renderTables(tables) {
  const container = element("tables");
  for (const data of tables) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    const table = document.createElement("table");
    const caption = table.createCaption();
    caption.textContent = `${data.name} · ukázková data`;
    const header = table.createTHead().insertRow();
    for (const column of data.columns) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = column;
      header.append(cell);
    }
    const body = table.createTBody();
    for (const row of data.rows) {
      const tr = body.insertRow();
      for (const value of row) tr.insertCell().textContent = value === null ? "NULL" : String(value);
    }
    wrapper.append(table);
    container.append(wrapper);
  }
}

function renderTask(index) {
  clearTask("");
  currentIndex = index;
  const task = currentTask();
  element("task-heading").textContent = `Úloha · ${topicLabels[task.topic] || task.topic}`;
  element("position").textContent = `Úloha ${index + 1} z ${selection.length}`;
  element("instruction").textContent = task.instruction;
  element("prompt").textContent = task.prompt;
  renderTables(task.tables);
  element("sql").textContent = task.sql ? formatSql(task.sql) : "";
  element("sql-section").hidden = !task.sql;
  element("sql-heading").textContent = task.type === "fix-sql" ? "SQL k opravě" : "SQL k rozboru";
  element("theory").textContent = task.theory || "";
  element("theory-section").hidden = !task.theory;
  element("answer").value = task.type === "fix-sql" ? formatSql(task.sql) : "";
  setActions(true);
}

function exerciseTasks(type) {
  const fixes = tasks.filter((task) => task.type === "write-query").map((task) => ({
    ...task,
    type: "fix-sql",
    instruction: "Oprav SQL tak, aby splňovalo zadání.",
    sql: faultySql(task.solution),
  }));
  return type === "fix-sql" ? fixes : type ? tasks.filter((task) => task.type === type) : [...tasks, ...fixes];
}

function startSelection() {
  selection = exerciseTasks(element("task-type").value).filter((task) =>
    task.level === element("level").value &&
    (!element("topic").value || task.topic === element("topic").value)
  );
  if (selection.length) renderTask(0);
  else clearTask("Pro tento výběr zatím není úloha. Změň téma nebo typ a klikni na Spustit.");
}

function startRandomSelection() {
  selection = exerciseTasks().filter((task) => task.level === element("level").value);
  if (selection.length) renderTask(Math.floor(Math.random() * selection.length));
  else clearTask("Pro zvolenou úroveň zatím není úloha. Změň úroveň a zkus to znovu.");
}

function updateTopics() {
  const selected = element("topic").value;
  const topics = [...new Set(tasks
    .filter((task) => task.level === element("level").value)
    .map((task) => task.topic))].sort();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "Všechna témata";
  element("topic").replaceChildren(all);
  for (const topic of topics) {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topicLabels[topic] || topic;
    element("topic").append(option);
  }
  element("topic").value = topics.includes(selected) ? selected : "";
  element("random").disabled = !topics.length;
}

function normalizeSql(text) {
  // Preserve literals and quoted identifiers; compare other tokens case-insensitively.
  const tokens = text.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[\p{L}_][\p{L}\p{N}_$#]*|\d+(?:\.\d+)?|>=|<=|<>|!=|\|\||[^\s]/gu) || [];
  if (tokens.at(-1) === ";") tokens.pop();
  return JSON.stringify(tokens.map((token) => /^['"]/.test(token) ? token : token.toLowerCase()));
}

function sqlTokens(sql) {
  return sql.match(/--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|[\p{L}_][\p{L}\p{N}_$#]*|\d+(?:\.\d+)?|>=|<=|<>|!=|\|\||[^\s]/gu) || [];
}

function formatSql(sql) {
  const tokens = sqlTokens(sql);
  const lines = [];
  const nesting = [];
  let line = "", previous = "";
  const indent = () => "  ".repeat(nesting.filter(Boolean).length);
  const flush = () => {
    if (line.trim()) lines.push(line.trimEnd());
    line = "";
  };
  const clauses = /^(SELECT|FROM|FORM|WHERE|HAVING|WITH|UNION|INTERSECT|MINUS|JOIN|ON)$/i;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upper = token.toUpperCase();
    const next = (tokens[i + 1] || "").toUpperCase();
    const queryLevel = !nesting.length || nesting.at(-1);
    const joinPrefix = /^(LEFT|RIGHT|FULL|INNER|CROSS|OUTER)$/i;
    const clause = queryLevel && (
      clauses.test(token) ||
      (/^(GROUP|ORDER|SORT|CONNECT|START)$/i.test(token) && /^(BY|WITH)$/.test(next)) ||
      (joinPrefix.test(token) && /^(JOIN|OUTER)$/.test(next))
    );
    if (clause && !(upper === "JOIN" && joinPrefix.test(previous)) &&
        !(upper === "OUTER" && joinPrefix.test(previous))) flush();
    if (token === ")" && nesting.pop()) flush();
    if (!line) line = indent();
    const tight = /^[,;.)]$/.test(token) || previous === "." || previous === "(" ||
      (token === "(" && /^[\p{L}_][\p{L}\p{N}_$#]*$/u.test(previous) &&
       !/^(AS|IN|OVER|PARTITION|ROLLUP|CUBE|PIVOT|UNPIVOT|GROUP|EXISTS)$/i.test(previous));
    if (line.trim() && !tight) line += " ";
    line += token;
    if (token === "(") {
      const subquery = /^(SELECT|WITH)$/.test(next);
      nesting.push(subquery);
      if (subquery) flush();
    } else if (token === "," && queryLevel) {
      flush();
      line = `${indent()}  `;
    } else if (token.startsWith("--")) flush();
    previous = token;
  }
  flush();
  return lines.join("\n");
}

function faultySql(solution) {
  const tokens = sqlTokens(solution);
  // Change only unquoted tokens, never literals or quoted identifiers.
  const order = tokens.findIndex((token, index) =>
    /^ORDER$/i.test(token) && /^BY$/i.test(tokens[index + 1] || ""));
  if (order !== -1) {
    tokens[order] = "SORT";
  } else {
    const group = tokens.findIndex((token, index) =>
      /^GROUP$/i.test(token) && /^BY$/i.test(tokens[index + 1] || ""));
    if (group !== -1) tokens.splice(group + 1, 1);
    else {
      const join = tokens.findIndex((token) => /^ON$/i.test(token));
      const equality = join === -1 ? -1 : tokens.indexOf("=", join);
      if (equality !== -1) tokens[equality] = "<>";
      else {
        const from = tokens.findIndex((token) => /^FROM$/i.test(token));
        if (from !== -1) tokens[from] = "FORM";
        else tokens[tokens.findIndex((token) => /^SELECT$/i.test(token))] = "SELEC";
      }
    }
  }
  return formatSql(tokens.join(" "));
}

function words(text) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .match(/\d{4}-\d{2}-\d{2}|[\p{L}_]+|[+-]?\d+(?:[.,]\d+)?/gu) || [];
}

function checkAnswer(answer, task) {
  if (task.type !== "explain-result") return normalizeSql(answer) === normalizeSql(task.solution);
  const integerList = task.keywords.length > 1 && task.keywords.every((keyword) => /^[+-]?\d+$/.test(keyword));
  const tokens = new Set(words(integerList ? answer.replaceAll(",", " ") : answer));
  return task.keywords.every((keyword) => {
    const expected = words(keyword);
    return expected.length > 0 && expected.every((word) => tokens.has(word));
  });
}

element("load").addEventListener("click", startSelection);
element("random").addEventListener("click", startRandomSelection);
element("next").addEventListener("click", () => {
  if (currentTask()) renderTask((currentIndex + 1) % selection.length);
});
for (const id of ["level", "task-type", "topic"]) {
  element(id).addEventListener("change", () => {
    if (id === "level") updateTopics();
    selection = [];
    clearTask("Výběr se změnil. Klikni na Spustit.");
  });
}
for (const name of ["hint", "solution"]) {
  element(`${name}-button`).addEventListener("click", () => {
    if (!currentTask()) return;
    const task = currentTask();
    element(name).textContent = name === "solution" && task.type !== "explain-result" ?
      formatSql(task[name]) : task[name];
    element(`${name}-section`).hidden = false;
  });
}
element("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentTask()) return;
  const answer = element("answer").value;
  element("feedback").textContent = !answer.trim() ? "Nejprve napiš odpověď." :
    checkAnswer(answer, currentTask()) ? "Odpověď odpovídá vzoru nebo požadovaným klíčovým slovům." :
      "Odpověď se neshoduje se vzorem. Zkus nápovědu nebo porovnej vzorové řešení; kontrola není SQL engine.";
});

async function initialize() {
  try {
    const response = await fetch("./tasks.json");
    if (!response.ok) throw new Error("Catalog unavailable");
    const catalog = await response.json();
    if (!Array.isArray(catalog) || !catalog.length) throw new Error("Invalid catalog");
    tasks = catalog;
    updateTopics();
    element("load").disabled = false;
    clearTask("Vyber úroveň, typ a případně téma. Potom klikni na Spustit.");
  } catch {
    clearTask("Katalog nelze načíst. Použij HTTP server podle README (ne file://), zkontroluj tasks.json a obnov stránku.");
  }
}

initialize();
