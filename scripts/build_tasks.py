#!/usr/bin/env python3
"""Build and validate the curated Oracle SQL catalog using only the stdlib."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS = {"zaklady", "pokrocile"}
TYPES = {"write-query", "find-bug", "explain-result"}
TOPICS = {"operatory", "datum", "retezce", "datove-typy", "cisla", "mnozinove-operace"}
REQUIRED_KEYS = {
    "id", "level", "topic", "type", "instruction", "prompt", "sql",
    "theory", "tables", "solution", "hint", "keywords",
}

PRODUCTS = {
    "name": "produkty",
    "columns": ["id NUMBER", "nazev VARCHAR2(30)", "cena NUMBER", "skladem NUMBER"],
    "rows": [[1, "Čaj", 80, 1], [2, "Káva", 150, 0], [3, "Kakao", 120, 1]],
}
DATES = {
    "name": "akce",
    "columns": ["id NUMBER", "konani DATE"],
    "rows": [[1, "2026-01-15 00:00:00"], [2, "2026-02-01 14:00:00"]],
}
PEOPLE = {
    "name": "lide", "columns": ["id NUMBER", "jmeno VARCHAR2(30)"],
    "rows": [[1, "Eva"], [2, "Petr"], [3, "Ema"]],
}
SETS = [
    {"name": "a", "columns": ["id NUMBER"], "rows": [[1], [2], [2]]},
    {"name": "b", "columns": ["id NUMBER"], "rows": [[2], [3]]},
]


def task(id_, level, topic, type_, instruction, prompt, solution, hint, theory,
         tables=(), sql=None, keywords=()):
    return {
        "id": id_, "level": level, "topic": topic, "type": type_,
        "instruction": instruction, "prompt": prompt, "sql": sql,
        "solution": solution, "hint": hint, "theory": theory,
        "tables": list(tables), "keywords": list(keywords),
    }


SEED = [
    task(1, "zaklady", "operatory", "write-query",
         "Vyber dostupné produkty.", "Vrať nazev produktů s cenou nejvýše 120 a skladem = 1.",
         "SELECT nazev FROM produkty WHERE cena <= 120 AND skladem = 1;",
         "Obě podmínky spoj pomocí AND.",
         "AND vyžaduje splnění obou podmínek. Operátor <= zahrnuje i mezní hodnotu.",
         [PRODUCTS]),
    task(2, "zaklady", "operatory", "find-bug",
         "Oprav podmínku pro interval cen.", "Vrať nazev produktů s cenou od 80 do 120 včetně.",
         "SELECT nazev FROM produkty WHERE cena BETWEEN 80 AND 120;",
         "BETWEEN používá pro oddělení mezí slovo AND, nikoli OR.",
         "BETWEEN dolni AND horni zahrnuje obě hranice.", [PRODUCTS],
         "SELECT nazev FROM produkty WHERE cena BETWEEN 80 OR 120;"),
    task(3, "zaklady", "datum", "write-query",
         "Vyber únorové a pozdější akce.", "Vrať id akcí od 1. února 2026 včetně. Použij literál DATE.",
         "SELECT id FROM akce WHERE konani >= DATE '2026-02-01';",
         "Zápis literálu je DATE 'YYYY-MM-DD'.",
         "Literál DATE nezávisí na národním formátu data v databázové relaci.", [DATES]),
    task(4, "zaklady", "datum", "explain-result",
         "Vysvětli posun data.", "Jaké datum vrátí dotaz? Odpověz ve formátu YYYY-MM-DD.",
         "2026-01-16", "Přičtení 1 k DATE přidá jeden den.",
         "V Oracle lze k DATE přičíst počet dnů; část dne lze vyjádřit zlomkem.",
         sql="SELECT DATE '2026-01-15' + 1 FROM dual;", keywords=["2026-01-16"]),
    task(5, "zaklady", "retezce", "write-query",
         "Převeď jména na velká písmena.", "Vrať UPPER(jmeno) pro všechny osoby.",
         "SELECT UPPER(jmeno) FROM lide;", "Použij funkci UPPER.",
         "UPPER převádí písmena na velká, LOWER na malá. Nemění uložená data.", [PEOPLE]),
    task(6, "zaklady", "retezce", "find-bug",
         "Oprav porovnání s textem.", "Vrať id osoby se jménem Eva. Oprav druh uvozovek.",
         "SELECT id FROM lide WHERE jmeno = 'Eva';", "Textový literál používá jednoduché uvozovky.",
         "Jednoduché uvozovky označují řetězec; dvojité označují identifikátor.", [PEOPLE],
         'SELECT id FROM lide WHERE jmeno = "Eva";'),
    task(7, "zaklady", "datove-typy", "explain-result",
         "Vysvětli převod typu.", "Jakou číselnou hodnotu vrátí dotaz?",
         "Vrátí číslo 42, nikoli text.", "CAST převádí text '42' na NUMBER.",
         "CAST(vyraz AS typ) provádí explicitní převod datového typu.",
         sql="SELECT CAST('42' AS NUMBER) FROM dual;", keywords=["42"]),
    task(8, "zaklady", "datove-typy", "find-bug",
         "Oprav syntaxi explicitního převodu.", "Převeď text '15' na NUMBER pomocí CAST.",
         "SELECT CAST('15' AS NUMBER) FROM dual;", "Mezi hodnotou a typem patří AS.",
         "CAST používá AS, nikoli čárku. Explicitní převody jsou čitelnější než implicitní.",
         sql="SELECT CAST('15', NUMBER) FROM dual;"),
    task(9, "zaklady", "cisla", "write-query",
         "Zaokrouhli cenu.", "Vrať číslo 123.456 zaokrouhlené na dvě desetinná místa pomocí ROUND.",
         "SELECT ROUND(123.456, 2) FROM dual;", "Druhý argument určuje počet desetinných míst.",
         "ROUND zaokrouhluje, TRUNC pouze odřezává další desetinná místa."),
    task(10, "zaklady", "cisla", "explain-result",
         "Urči zbytek po dělení.", "Jaké číslo vrátí dotaz?",
         "Vrátí 2, protože 17 = 3 × 5 + 2.", "Najdi zbytek po celočíselném dělení.",
         "MOD(m, n) vrací zbytek po dělení m číslem n.",
         sql="SELECT MOD(17, 5) FROM dual;", keywords=["2"]),
    task(11, "zaklady", "mnozinove-operace", "explain-result",
         "Vysvětli sjednocení.", "Které hodnoty id vrátí dotaz? Uveď je jednou; pořadí není zaručeno.",
         "Hodnoty 1, 2 a 3. UNION odstraní duplicity.",
         "Hodnota 2 se objeví jen jednou.",
         "UNION sjednotí výsledky a odstraní duplicity; pořadí určuje až ORDER BY.", SETS,
         "SELECT id FROM a UNION SELECT id FROM b;", ["1", "2", "3"]),
    task(12, "zaklady", "mnozinove-operace", "find-bug",
         "Oprav počet sloupců sjednocení.", "Sjednoť pouze sloupec id z obou tabulek bez duplicit.",
         "SELECT id FROM a UNION SELECT id FROM b;", "Obě větve musí mít stejný počet sloupců.",
         "Množinové operace vyžadují shodný počet sloupců a kompatibilní typy.", SETS,
         "SELECT id FROM a UNION SELECT id, id FROM b;"),
    task(13, "pokrocile", "operatory", "find-bug",
         "Oprav prioritu logických operátorů.",
         "Vrať nazev produktů s cenou pod 100 nebo nad 140, ale vždy pouze skladem = 1.",
         "SELECT nazev FROM produkty WHERE (cena < 100 OR cena > 140) AND skladem = 1;",
         "Uzavři alternativy cen do závorek.",
         "AND má vyšší prioritu než OR. Závorky umožňují určit pořadí vyhodnocení.", [PRODUCTS],
         "SELECT nazev FROM produkty WHERE cena < 100 OR cena > 140 AND skladem = 1;"),
    task(14, "pokrocile", "datum", "write-query",
         "Vyber všechny akce během února.",
         "Vrať id akcí v únoru 2026 včetně libovolného času posledního dne. Použij >= a < s literály DATE.",
         "SELECT id FROM akce WHERE konani >= DATE '2026-02-01' AND konani < DATE '2026-03-01';",
         "Horní hranice je první okamžik následujícího měsíce, který již nepatří do výsledku.",
         "Oracle DATE ukládá i čas. Polootevřený interval zahrne celý poslední den bez převodu sloupce.",
         [DATES]),
    task(15, "pokrocile", "retezce", "explain-result",
         "Vysvětli oříznutí a výřez řetězce.", "Jaký přesný text vrátí dotaz?",
         "Vrátí text SQL.", "Nejprve se odstraní okrajové mezery, pak se vyberou první tři znaky.",
         "TRIM odstraňuje okrajové mezery. SUBSTR v Oracle počítá pozice od 1.",
         sql="SELECT SUBSTR(TRIM('  SQL kurz  '), 1, 3) FROM dual;", keywords=["SQL"]),
    task(16, "pokrocile", "datove-typy", "write-query",
         "Převeď text na datum se zadaným formátem.",
         "Převeď text '31.12.2026' pomocí TO_DATE a masky DD.MM.YYYY.",
         "SELECT TO_DATE('31.12.2026', 'DD.MM.YYYY') FROM dual;",
         "Druhým argumentem je formátovací maska.",
         "TO_DATE s explicitní maskou nevyžaduje implicitní interpretaci vstupu podle NLS_DATE_FORMAT."),
    task(17, "pokrocile", "cisla", "find-bug",
         "Oprav zaokrouhlení na stovky.", "Použij ROUND tak, aby se 1499 zaokrouhlilo na celé stovky.",
         "SELECT ROUND(1499, -2) FROM dual;", "Pro místa vlevo od desetinné čárky použij záporný argument.",
         "ROUND(n, -2) zaokrouhluje na stovky; ROUND(n, 2) na setiny.",
         sql="SELECT ROUND(1499, 2) FROM dual;"),
    task(18, "pokrocile", "mnozinove-operace", "explain-result",
         "Vysvětli rozdíl množin.", "Která hodnota id zbude po operaci MINUS?",
         "Zbude pouze 1. Hodnota 2 je také v b, proto je odstraněna.",
         "MINUS ponechá hodnoty první větve, které nejsou v druhé.",
         "Oracle MINUS vrací rozdíl množin bez duplicit. Na pořadí větví záleží.", SETS,
         "SELECT id FROM a MINUS SELECT id FROM b;", ["1"]),
]


def validate_catalog(catalog):
    if not isinstance(catalog, list) or not catalog:
        raise ValueError("Catalog must be a non-empty list")
    ids = set()
    for item in catalog:
        if not isinstance(item, dict) or not REQUIRED_KEYS <= item.keys():
            raise ValueError("Task is missing required keys")
        id_ = item["id"]
        if type(id_) is not int or id_ <= 0 or id_ in ids:
            raise ValueError(f"Invalid or duplicate task ID: {id_}")
        ids.add(id_)
        for key, allowed in [("level", LEVELS), ("type", TYPES), ("topic", TOPICS)]:
            if not isinstance(item[key], str) or item[key] not in allowed:
                raise ValueError(f"Task {id_}: invalid {key}")
        for key in ["instruction", "prompt", "solution", "hint"]:
            if not isinstance(item[key], str) or not item[key].strip():
                raise ValueError(f"Task {id_}: {key} must be non-empty text")
        if not isinstance(item["theory"], str):
            raise ValueError(f"Task {id_}: theory must be text (may be empty)")
        if item["sql"] is not None and not isinstance(item["sql"], str):
            raise ValueError(f"Task {id_}: sql must be text or null")
        if item["type"] in {"find-bug", "explain-result"} and not (item["sql"] or "").strip():
            raise ValueError(f"Task {id_}: this type requires SQL")
        keywords = item["keywords"]
        if not isinstance(keywords, list) or any(
            not isinstance(word, str) or not word.strip() for word in keywords
        ):
            raise ValueError(f"Task {id_}: keywords must be a list of non-empty strings")
        if item["type"] == "explain-result" and not keywords:
            raise ValueError(f"Task {id_}: explanation requires keywords")
        if not isinstance(item["tables"], list):
            raise ValueError(f"Task {id_}: tables must be a list")
        for table in item["tables"]:
            if not isinstance(table, dict) or not {"name", "columns", "rows"} <= table.keys():
                raise ValueError(f"Task {id_}: invalid table")
            if not isinstance(table["name"], str) or not table["name"].strip():
                raise ValueError(f"Task {id_}: invalid table name")
            if not isinstance(table["columns"], list) or not table["columns"] or any(
                not isinstance(column, str) or not column.strip() for column in table["columns"]
            ):
                raise ValueError(f"Task {id_}: invalid columns")
            if not isinstance(table["rows"], list):
                raise ValueError(f"Task {id_}: rows must be a list")
            for row in table["rows"]:
                if not isinstance(row, list) or len(row) != len(table["columns"]):
                    raise ValueError(f"Task {id_}: row width does not match columns")
                if any(value is not None and type(value) not in (str, int, float) for value in row):
                    raise ValueError(f"Task {id_}: cells must be text, numbers or null")
    return catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Curated JSON source, same schema as tasks.json")
    args = parser.parse_args()
    source = args.source if args.source is not None else ROOT / "materials/tasks_source.json"
    try:
        if source.exists():
            catalog = json.loads(source.read_text(encoding="utf-8"))
        elif args.source is not None:
            raise ValueError(f"Source does not exist: {source}")
        else:
            catalog = SEED
            print("No materials/tasks_source.json found; using embedded starter seed.")
            print("Copy web/tasks.json to materials/tasks_source.json, edit it, then rerun this script.")
        validate_catalog(catalog)
        output = json.dumps(catalog, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    except (OSError, ValueError) as error:
        parser.exit(1, f"Catalog error: {error}\n")
    for directory in ("web", "docs"):
        (ROOT / directory / "tasks.json").write_text(output, encoding="utf-8")
    print(f"Generated {len(catalog)} tasks in web/tasks.json and docs/tasks.json.")


if __name__ == "__main__":
    main()
