import copy
import importlib.util
import json
from pathlib import Path
from datetime import date
import re
import sqlite3
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_tasks", ROOT / "scripts/build_tasks.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT / "web/tasks.json").read_text(encoding="utf-8"))

    def test_mirrored_assets(self):
        for name in ("index.html", "app.js", "styles.css", "tasks.json"):
            with self.subTest(asset=name):
                self.assertEqual((ROOT / "web" / name).read_bytes(), (ROOT / "docs" / name).read_bytes())

    def test_application_branding(self):
        for directory in ("web", "docs"):
            with self.subTest(directory=directory):
                html = (ROOT / directory / "index.html").read_text(encoding="utf-8")
                for tag in ("title", "h1"):
                    self.assertEqual(
                        re.findall(rf"<{tag}\b[^>]*>(.*?)</{tag}>", html, re.DOTALL),
                        ["SQL Trainer"],
                    )

    def test_schema(self):
        self.assertIs(builder.validate_catalog(self.catalog), self.catalog)
        ids = [task["id"] for task in self.catalog]
        self.assertEqual(len(ids), len(set(ids)))
        for task in self.catalog:
            self.assertTrue(builder.REQUIRED_KEYS <= task.keys())
            self.assertIn(task["level"], builder.LEVELS)
            self.assertIn(task["type"], builder.TYPES)

    def test_relational_examples_match_task_schemas(self):
        examples = {
            43: [("faktury (oddíl p2026)", ["id NUMBER", "castka NUMBER(10,2)"])],
            45: [("ALL_TABLES", ["OWNER VARCHAR2(30)", "TABLE_NAME VARCHAR2(30)"])],
            46: [("ALL_TAB_COLUMNS", [
                "OWNER VARCHAR2(30)", "TABLE_NAME VARCHAR2(30)",
                "COLUMN_NAME VARCHAR2(30)", "DATA_TYPE VARCHAR2(30)",
            ])],
            85: [("dwh_owner.parties (oddíl partition_11)", [
                "pt_key NUMBER", "party_name VARCHAR2(40)",
            ])],
            86: [
                ("dwh_owner.parties (oddíl partition_11)", [
                    "pt_key NUMBER", "party_name VARCHAR2(40)",
                ]),
                ("zamestnanci", ["id NUMBER", "oddeleni VARCHAR2(20)", "mzda NUMBER"]),
            ],
            87: [("ALL_TAB_COLUMNS", [
                "OWNER VARCHAR2(30)", "TABLE_NAME VARCHAR2(30)", "COLUMN_NAME VARCHAR2(30)",
            ])],
            88: [("ALL_TAB_COLUMNS", [
                "OWNER VARCHAR2(30)", "TABLE_NAME VARCHAR2(30)",
                "COLUMN_NAME VARCHAR2(30)", "DATA_TYPE VARCHAR2(30)",
            ])],
            94: [("zamestnanci", ["oddeleni VARCHAR2(20)", "role VARCHAR2(20)"])],
            96: [("data", ["hodnota VARCHAR2(20)"])],
        }
        tasks = {task["id"]: task for task in self.catalog}
        for id_, schemas in examples.items():
            with self.subTest(task=id_):
                tables = tasks[id_]["tables"]
                self.assertEqual(len(tables), len(schemas))
                for table, (name, columns) in zip(tables, schemas):
                    self.assertEqual(table["name"], name)
                    self.assertEqual(table["columns"], columns)
                    self.assertGreaterEqual(len(table["rows"]), 3)
                    self.assertLessEqual(len(table["rows"]), 5)
                    self.assertTrue(all(len(row) == len(columns) for row in table["rows"]))
        for id_, partition in ((43, "p2026"), (85, "partition_11"), (86, "partition_11")):
            table = tasks[id_]["tables"][0]
            self.assertIn(partition, table["name"])
            self.assertFalse(any("partition" in column.lower() for column in table["columns"]))
        dictionary_rows = tasks[87]["tables"][0]["rows"]
        self.assertIn(["DWH_OWNER", "PARTIES", "PT_KEY"], dictionary_rows)

    def test_only_literal_dual_exercises_omit_sample_tables(self):
        literal_tasks = {
            7, 8, 9, 10, 13, 14, 15, 23, 37, 39, 40, 53, 54,
            64, 65, 66, 67, 71, 72, 82, 102,
        }
        self.assertEqual(
            {task["id"] for task in self.catalog if not task["tables"]},
            literal_tasks,
        )
        for task in self.catalog:
            if task["id"] in literal_tasks:
                with self.subTest(task=task["id"]):
                    query = task["sql"] or task["solution"]
                    self.assertRegex(query, r"(?i)\bFROM\s+dual\s*;\s*$")

    def test_exact_catalog_distribution_and_source(self):
        source = json.loads((ROOT / "materials/tasks_source.json").read_text(encoding="utf-8"))
        outline = json.loads((ROOT / "materials/outline.json").read_text(encoding="utf-8"))
        self.assertEqual(self.catalog, source)
        self.assertEqual([task["id"] for task in self.catalog], list(range(1, 113)))
        self.assertEqual(len(self.catalog), 112)
        added = self.catalog[100:]
        self.assertEqual([task["id"] for task in added], list(range(101, 113)))
        self.assertEqual(
            {level: sum(task["level"] == level for task in added)
             for level in builder.LEVELS},
            {"zaklady": 6, "pokrocile": 6},
        )
        self.assertEqual(
            {type_: sum(task["type"] == type_ for task in added)
             for type_ in builder.TYPES},
            {"write-query": 6, "explain-result": 6},
        )
        self.assertEqual(
            [(task["level"], task["topic"], task["type"]) for task in added],
            [
                ("zaklady", "retezce", "write-query"),
                ("zaklady", "cisla", "explain-result"),
                ("zaklady", "datum", "write-query"),
                ("zaklady", "operatory", "explain-result"),
                ("zaklady", "podminky", "write-query"),
                ("zaklady", "null", "explain-result"),
                ("pokrocile", "listagg", "write-query"),
                ("pokrocile", "datovy-slovnik", "write-query"),
                ("pokrocile", "partitioning", "explain-result"),
                ("pokrocile", "analyticke-funkce", "write-query"),
                ("pokrocile", "analyticke-funkce", "explain-result"),
                ("pokrocile", "analyticke-funkce", "explain-result"),
            ],
        )
        self.assertEqual(
            {level: sum(task["level"] == level for task in self.catalog)
             for level in builder.LEVELS},
            {"zaklady": 64, "pokrocile": 48},
        )
        self.assertEqual(
            {type_: sum(task["type"] == type_ for task in self.catalog)
             for type_ in builder.TYPES},
            {"write-query": 66, "explain-result": 46},
        )
        self.assertEqual(
            {(level, type_): sum(
                task["level"] == level and task["type"] == type_
                for task in self.catalog
            ) for level in builder.LEVELS for type_ in builder.TYPES},
            {
                ("zaklady", "write-query"): 39,
                ("zaklady", "explain-result"): 25,
                ("pokrocile", "write-query"): 27,
                ("pokrocile", "explain-result"): 21,
            },
        )
        self.assertIs(builder.validate_catalog(self.catalog, outline=outline), self.catalog)
        with self.assertRaises(ValueError):
            builder.validate_catalog(self.catalog[:-1], outline=outline)

    def test_level_and_topic_coverage(self):
        for level, minimum in (("zaklady", 8), ("pokrocile", 4)):
            tasks = [task for task in self.catalog if task["level"] == level]
            self.assertGreaterEqual(len(tasks), minimum)
            self.assertEqual({task["type"] for task in tasks}, builder.TYPES)
        self.assertEqual({task["topic"] for task in self.catalog}, builder.TOPICS)
        self.assertTrue(all(task["theory"].strip() for task in self.catalog))

    def test_output_aliases_are_named_in_prompts(self):
        for task in self.catalog:
            if task["type"] != "write-query":
                continue
            for alias in re.findall(r"\bAS\s+(\w+)", task["solution"], re.IGNORECASE):
                with self.subTest(task=task["id"], alias=alias):
                    self.assertRegex(task["prompt"], rf"\b{re.escape(alias)}\b")

    def test_corrected_sample_results(self):
        # Only portable SQL is executed here, not Oracle-specific syntax.
        expected = {
            19: [("Data", 47500)],
            24: [("Káva",), ("Kakao",)],
            27: [(40,)],
            34: [("Káva",), ("Kakao",)],
            35: [(200,)],
            45: [("OBJEDNAVKY",), ("PRODUKTY",), ("ZAMESTNANCI",)],
            58: [(1, "Data", 45000, 3), (2, "Data", 50000, 1),
                 (3, "Prodej", 40000, 1), (4, "Data", 50000, 2)],
            63: [(1,), (3,)],
            68: [("Čaj",), ("Kakao",)],
            74: [(1,), (2,), (3,)],
            76: [(3, 2)],
            100: [(1, None), (2, 10), (3, 20)],
        }
        for task in self.catalog:
            if task["id"] not in expected:
                continue
            with self.subTest(task=task["id"]), sqlite3.connect(":memory:") as db:
                for table in task["tables"]:
                    columns = [column.split()[0] for column in table["columns"]]
                    db.execute(f"CREATE TABLE {table['name']} ({', '.join(columns)})")
                    placeholders = ", ".join("?" for _ in columns)
                    db.executemany(f"INSERT INTO {table['name']} VALUES ({placeholders})", table["rows"])
                query = task["sql"] or task["solution"]
                self.assertCountEqual(db.execute(query).fetchall(), expected[task["id"]])
        # DATE subtraction is Oracle-specific; check the displayed ISO dates directly.
        task = next(task for task in self.catalog if task["id"] == 103)
        self.assertEqual(
            [((date.fromisoformat(end) - date.fromisoformat(start)).days,)
             for start, end in task["tables"][0]["rows"]],
            [(9,), (3,)],
        )

    def test_regex_and_ranking_samples_exercise_boundaries(self):
        tasks = {task["id"]: task for task in self.catalog}
        regex_task = tasks[52]
        self.assertIn("'^[A-Z]{2}-[0-9]{3}$', 'c'", regex_task["solution"])
        self.assertIn(["ab-123"], regex_task["tables"][0]["rows"])
        salaries = [row[2] for row in tasks[58]["tables"][0]["rows"] if row[1] == "Data"]
        self.assertLess(len(set(salaries)), len(salaries))
        self.assertIn("id", tasks[58]["prompt"])

    def test_outline_source(self):
        outline = json.loads((ROOT / "materials/outline.json").read_text(encoding="utf-8"))
        self.assertIs(builder.validate_outline(outline), outline)
        pairs = {(topic["level"], topic["slug"]) for topic in outline["topics"]}
        self.assertTrue({(task["level"], task["topic"]) for task in self.catalog} <= pairs)
        for level, expected in (("zaklady", 64), ("pokrocile", 48)):
            self.assertEqual(sum(
                sum(topic["quotas"].values()) for topic in outline["topics"]
                if topic["level"] == level
            ), expected)
        for type_, expected in (("write-query", 66), ("explain-result", 46)):
            self.assertEqual(sum(topic["quotas"][type_] for topic in outline["topics"]), expected)
        for topic in outline["topics"]:
            self.assertEqual(topic["source"], {"zaklady": "basic", "pokrocile": "advanced"}[topic["level"]])
            source = outline["sources"][topic["source"]]
            self.assertTrue((ROOT / "materials" / source["file"]).is_file())
            self.assertTrue(topic["pages"])
            for start, end in topic["pages"]:
                self.assertTrue(1 <= start <= end <= source["page_count"])
        self.assertEqual(
            (ROOT / "docs/catalog-plan.md").read_bytes(),
            (ROOT / "web/catalog-plan.md").read_bytes(),
        )

    def test_invalid_outlines_rejected(self):
        valid = {
            "version": 1, "target_total": 112,
            "topics": [
                {"slug": "select", "label": "Výběr", "level": level,
                 "quotas": {"write-query": 36, "explain-result": 20}}
                for level in ("zaklady", "pokrocile")
            ],
        }
        builder.validate_outline(valid)
        cases = [None, [], {}, {**valid, "target_total": 100},
                 {**valid, "target_total": 113}, {**valid, "topics": []},
                 {**valid, "topics": valid["topics"] * 2},
                 {**valid, "topics": [valid["topics"][0]]}]
        for key, value in [
            ("level", "advanced"), ("level", []), ("slug", "SELECT dotaz"),
            ("source", "advanced"),
            ("label", ""), ("quotas", {"find-bug": 50}),
            ("quotas", {"write-query": True, "explain-result": 49}),
            ("quotas", {"write-query": -1, "explain-result": 51}),
            ("quotas", {"write-query": 1.5, "explain-result": 48.5}),
            ("quotas", {"write-query": 0, "explain-result": 0}),
        ]:
            outline = copy.deepcopy(valid)
            outline["topics"][0][key] = value
            cases.append(outline)
        for outline in cases:
            with self.subTest(outline=outline):
                with self.assertRaises(ValueError):
                    builder.validate_outline(outline)

    def test_invalid_catalogs_rejected(self):
        cases = [[], {}, self.catalog + [self.catalog[0]]]
        for key, value in [
            ("id", True), ("level", "beginner"), ("type", "quiz"), ("topic", []),
            ("instruction", ""), ("theory", None), ("keywords", [None]),
            ("tables", [{"name": "x", "columns": ["id"], "rows": [[1, 2]]}]),
        ]:
            catalog = copy.deepcopy(self.catalog)
            catalog[0][key] = value
            cases.append(catalog)
        missing = copy.deepcopy(self.catalog)
        del missing[0]["prompt"]
        cases.append(missing)
        for catalog in cases:
            with self.subTest(catalog=catalog[:1] if isinstance(catalog, list) else catalog):
                with self.assertRaises(ValueError):
                    builder.validate_catalog(catalog)

    def test_find_bug_removed_from_ui_and_catalog(self):
        self.assertEqual(builder.TYPES, {"write-query", "explain-result"})
        self.assertTrue(all(task["type"] != "find-bug" for task in self.catalog))
        self.assertNotIn('value="find-bug"', (ROOT / "web/index.html").read_text(encoding="utf-8"))
        self.assertNotIn("find-bug", (ROOT / "web/app.js").read_text(encoding="utf-8"))
        legacy = copy.deepcopy(self.catalog)
        legacy[0]["type"] = "find-bug"
        with self.assertRaises(ValueError):
            builder.validate_catalog(legacy)

    def test_explanation_requires_sql(self):
        item = copy.deepcopy(next(task for task in self.catalog if task["type"] == "explain-result"))
        item["sql"] = None
        with self.assertRaises(ValueError):
            builder.validate_catalog([item])

    def test_generator_source_and_determinism(self):
        originals = {name: (ROOT / name / "tasks.json").read_bytes() for name in ("web", "docs")}
        try:
            with tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / "tasks.json"
                source.write_text(json.dumps(self.catalog, ensure_ascii=False), encoding="utf-8")
                command = [sys.executable, str(ROOT / "scripts/build_tasks.py"), "--source", str(source)]
                subprocess.run(command, check=True, capture_output=True)
                first = (ROOT / "web/tasks.json").read_bytes()
                subprocess.run(command, check=True, capture_output=True)
                self.assertEqual(first, (ROOT / "web/tasks.json").read_bytes())
                self.assertEqual(first, (ROOT / "docs/tasks.json").read_bytes())
                self.assertEqual(json.loads(first), self.catalog)
                outline = Path(directory) / "outline.json"
                outline.write_bytes((ROOT / "materials/outline.json").read_bytes())
                planned_command = command + ["--outline", str(outline)]
                result = subprocess.run(planned_command, check=True, capture_output=True, text=True)
                self.assertIn(f"{len(self.catalog)}/112", result.stdout)
                self.assertEqual(first, (ROOT / "docs/tasks.json").read_bytes())
                expanded = copy.deepcopy(self.catalog)
                expanded[0]["topic"] = "select"
                source.write_text(json.dumps(expanded, ensure_ascii=False), encoding="utf-8")
                subprocess.run(planned_command, check=True, capture_output=True)
                self.assertEqual(json.loads((ROOT / "web/tasks.json").read_text()), expanded)
                planned = (ROOT / "web/tasks.json").read_bytes()
                subprocess.run(planned_command, check=True, capture_output=True)
                self.assertEqual(planned, (ROOT / "web/tasks.json").read_bytes())
                self.assertEqual(planned, (ROOT / "docs/tasks.json").read_bytes())
                expanded[0]["level"] = "pokrocile"
                source.write_text(json.dumps(expanded), encoding="utf-8")
                result = subprocess.run(planned_command, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(planned, (ROOT / "docs/tasks.json").read_bytes())
                expanded[0]["topic"] = "neexistujici-tema"
                source.write_text(json.dumps(expanded), encoding="utf-8")
                before = (ROOT / "web/tasks.json").read_bytes()
                result = subprocess.run(planned_command, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(before, (ROOT / "web/tasks.json").read_bytes())
                outline.write_text("{}", encoding="utf-8")
                result = subprocess.run(planned_command, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(before, (ROOT / "docs/tasks.json").read_bytes())
                source.write_text(json.dumps(self.catalog), encoding="utf-8")
                subprocess.run(command, check=True, capture_output=True)
                source.write_text("[]", encoding="utf-8")
                result = subprocess.run(command, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(first, (ROOT / "web/tasks.json").read_bytes())
                source.unlink()
                result = subprocess.run(command, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(first, (ROOT / "docs/tasks.json").read_bytes())
        finally:
            for name, content in originals.items():
                (ROOT / name / "tasks.json").write_bytes(content)


if __name__ == "__main__":
    unittest.main()
