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
  for (const name of ["sql", "theory"]) {
    element(name).textContent = task[name] || "";
    element(`${name}-section`).hidden = !task[name];
  }
  element("answer").value = "";
  setActions(true);
}

function startSelection() {
  selection = tasks.filter((task) =>
    task.level === element("level").value &&
    task.type === element("task-type").value &&
    (!element("topic").value || task.topic === element("topic").value)
  );
  if (selection.length) renderTask(0);
  else clearTask("Pro tento výběr zatím není úloha. Změň téma nebo typ a klikni na Spustit.");
}

function startRandomSelection() {
  selection = tasks.filter((task) => task.level === element("level").value);
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
}

function normalizeSql(text) {
  // Preserve literals and quoted identifiers; compare other tokens case-insensitively.
  const tokens = text.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[\p{L}_][\p{L}\p{N}_$#]*|\d+(?:\.\d+)?|>=|<=|<>|!=|\|\||[^\s]/gu) || [];
  if (tokens.at(-1) === ";") tokens.pop();
  return JSON.stringify(tokens.map((token) => /^['"]/.test(token) ? token : token.toLowerCase()));
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
    element(name).textContent = currentTask()[name];
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
    element("random").disabled = false;
    clearTask("Vyber úroveň, typ a případně téma. Potom klikni na Spustit.");
  } catch {
    clearTask("Katalog nelze načíst. Použij HTTP server podle README (ne file://), zkontroluj tasks.json a obnov stránku.");
  }
}

initialize();
