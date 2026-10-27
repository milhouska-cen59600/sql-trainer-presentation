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
const nextRepair = createRepairGenerator();

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
  if (task.type === "fix-sql") task.sql = nextRepair(task.solution).sql;
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
    sql: null,
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

function repairCandidates(solution) {
  const original = sqlTokens(solution);
  const positions = original.flatMap((token, index) => /^--|^\/\*/.test(token) ? [] : [index]);
  const tokens = positions.map((index) => original[index]);
  const upper = tokens.map((token) => token.toUpperCase());
  const candidates = [];
  const identifier = (token = "") => /^[a-z_][a-z0-9_$#]*$/i.test(token);
  const unused = (base) => {
    while (upper.includes(base.toUpperCase())) base += "_x";
    return base;
  };
  const add = (family, start, count, replacement) => {
    const changed = [...original];
    for (let i = start; i < start + count; i++) changed[positions[i]] = "";
    changed[positions[start]] = replacement;
    // Keep line-comment boundaries when feeding tokens back to the formatter.
    const sql = formatSql(changed.map((token) => token.startsWith("--") ? `${token}\n` : token).join(" "));
    if (normalizeSql(sql) !== normalizeSql(solution) &&
        !candidates.some((candidate) => candidate.family === family && candidate.sql === sql)) {
      candidates.push({ family, sql });
    }
  };
  const depths = [];
  const closes = new Map();
  const opens = [];
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === ")") {
      depth--;
      closes.set(opens.pop(), i);
    }
    depths[i] = depth;
    if (tokens[i] === "(") {
      opens.push(i);
      depth++;
    }
  }
  const endOfClause = (start) => {
    let end = start;
    while (end < tokens.length && depths[end] >= depths[start] &&
      !(depths[end] === depths[start] &&
        /^(HAVING|ORDER|GROUP|UNION|INTERSECT|MINUS|ROWS|RANGE|;)$/.test(upper[end]))) end++;
    return end;
  };
  const comparisons = { "=": "<>", "<>": "=", "!=": "=", ">": "<=", "<": ">=", ">=": "<", "<=": ">" };
  const aggregates = { SUM: "AVG", AVG: "SUM", MIN: "MAX", MAX: "MIN", COUNT: "SUM" };
  const functions = { UPPER: "LOWER", LOWER: "UPPER", INITCAP: "LOWER", LAG: "LEAD", LEAD: "LAG" };
  const argumentFunctions = new Set([
    "ROUND", "TRUNC", "SUBSTR", "ADD_MONTHS", "TO_DATE", "TO_CHAR", "TO_NUMBER",
    "CONVERT", "UPPER", "LOWER", "INITCAP", "TRIM", "REPLACE", "TRANSLATE",
    "REGEXP_LIKE", "REGEXP_REPLACE", "REGEXP_SUBSTR", "NVL", "NLSSORT",
  ]);
  const clauses = [];
  for (let i = 0; i < tokens.length; i++) {
    const word = upper[i], next = upper[i + 1], level = depths[i];
    if (/^(SELECT|FROM|WHERE|HAVING|ON|WHEN|ORDER|GROUP|START|CONNECT)$/.test(word)) clauses[level] = word;
    const clause = clauses[level];
    if (word === "(") clauses[level + 1] = clause;
    if (comparisons[word] && /^(WHERE|HAVING|WHEN|ON|START|CONNECT)$/.test(clause)) {
      add(clause === "ON" ? "join" : "filter", i, 1, comparisons[word]);
    }
    if (/^(WHERE|HAVING|WHEN)$/.test(clause) && /^(BETWEEN|LIKE|IN|EXISTS)$/.test(word)) {
      if (upper[i - 1] === "NOT") add("filter", i - 1, 1, "");
      else add("filter", i, 1, `NOT ${tokens[i]}`);
    }
    if (word === "IS" && /^(WHERE|HAVING|WHEN|START)$/.test(clause)) {
      if (next === "NULL") add("filter", i, 1, "IS NOT");
      else if (next === "NOT" && upper[i + 2] === "NULL") add("filter", i + 1, 1, "");
    }
    if (next === "(" && aggregates[word] && clause === "SELECT") add("aggregate", i, 1, aggregates[word]);
    if (next === "(" && functions[word] && identifier(tokens[i + 2])) {
      add("function", i, 1, functions[word]);
    }
    if (next === "(" && argumentFunctions.has(word)) {
      const end = closes.get(i + 1);
      const comma = tokens.findIndex((token, index) =>
        index > i + 1 && index < end && depths[index] === level + 1 && token === ",");
      if (comma !== -1) add("function-arguments", comma, 1, "");
      else if (end > i + 2 && !tokens.slice(i + 2, end).some((token) => /^['"]/.test(token))) {
        add("function-arguments", i + 2, end - i - 2, "");
      }
    }
    if (word === "SELECT") {
      const start = next === "DISTINCT" ? i + 2 : i + 1;
      const column = tokens[start + 1] === "." ? start + 2 : start;
      if (identifier(tokens[column]) && tokens[column + 1] !== "(" &&
          !/^(CASE|DATE|TIMESTAMP|NULL|LEVEL|DISTINCT|ALL)$/.test(upper[column])) {
        add("projection", column, 1, unused("missing_column"));
      } else if (tokens[start] === "*") {
        add("projection", start, 1, unused("missing_column"));
      }
    }
    if (word === "ORDER" && next === "BY") {
      const start = i + 2;
      let end = endOfClause(start);
      const comma = tokens.findIndex((token, index) =>
        index >= start && index < end && depths[index] === level && token === ",");
      if (comma !== -1) end = comma;
      const last = end - 1;
      if (/^(ASC|DESC)$/.test(upper[last])) {
        add("ordering", last, 1, upper[last] === "DESC" ? "ASC" : "DESC");
      } else if (last >= start) add("ordering", last, 1, `${tokens[last]} DESC`);
    }
    if (word === "GROUP" && next === "BY") {
      const start = i + 2;
      if (identifier(tokens[start]) && !/^(ROLLUP|CUBE|GROUPING)$/.test(upper[start])) {
        const end = endOfClause(start);
        const comma = tokens.findIndex((token, index) =>
          index >= start && index < end && depths[index] === level && token === ",");
        if (comma !== -1) add("grouping", start, comma - start + 1, "");
        else add("grouping", i, end - i, "");
      }
    }
    if (word === "UNION") {
      if (next === "ALL") add("set-operation", i + 1, 1, "");
      else add("set-operation", i, 1, "UNION ALL");
    }
    if (word === "WITH" && identifier(tokens[i + 1]) && upper[i + 2] === "AS" && tokens[i + 3] === "(") {
      const end = closes.get(i + 3);
      for (let j = end + 1; j < tokens.length; j++) {
        if (upper[j] === "FROM" && upper[j + 1] === upper[i + 1]) {
          add("cte-reference", j + 1, 1, unused("missing_cte"));
        }
      }
    }
  }
  // A leading projection comma is always invalid, even for constant-only queries.
  if (!candidates.length) {
    const select = upper.indexOf("SELECT");
    add("projection-syntax", select, 1, "SELECT ,");
  }
  return candidates;
}

function createRepairGenerator(random = Math.random) {
  let previousFamily;
  return (solution) => {
    const candidates = repairCandidates(solution);
    let families = [...new Set(candidates.map((candidate) => candidate.family))];
    if (families.length > 1) families = families.filter((family) => family !== previousFamily);
    const family = families[Math.floor(random() * families.length)];
    const pool = candidates.filter((candidate) => candidate.family === family);
    previousFamily = family;
    return pool[Math.floor(random() * pool.length)];
  };
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
    const response = await fetch("./tasks.json", { cache: "no-cache" });
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
