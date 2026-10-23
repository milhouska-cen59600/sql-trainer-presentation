import copy
import importlib.util
import json
from pathlib import Path
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

    def test_schema(self):
        self.assertIs(builder.validate_catalog(self.catalog), self.catalog)
        ids = [task["id"] for task in self.catalog]
        self.assertEqual(len(ids), len(set(ids)))
        for task in self.catalog:
            self.assertTrue(builder.REQUIRED_KEYS <= task.keys())
            self.assertIn(task["level"], builder.LEVELS)
            self.assertIn(task["type"], builder.TYPES)

    def test_starter_coverage(self):
        for level, minimum in (("zaklady", 8), ("pokrocile", 4)):
            tasks = [task for task in self.catalog if task["level"] == level]
            self.assertGreaterEqual(len(tasks), minimum)
            self.assertEqual({task["type"] for task in tasks}, builder.TYPES)
        self.assertEqual({task["topic"] for task in self.catalog}, builder.TOPICS)
        self.assertTrue(all(task["theory"].strip() for task in self.catalog))

    def test_seed_is_valid(self):
        builder.validate_catalog(builder.SEED)

    def test_outline_source(self):
        outline = json.loads((ROOT / "materials/outline.json").read_text(encoding="utf-8"))
        self.assertIs(builder.validate_outline(outline), outline)
        pairs = {(topic["level"], topic["slug"]) for topic in outline["topics"]}
        self.assertTrue({(task["level"], task["topic"]) for task in self.catalog} <= pairs)
        for level, expected in (("zaklady", 50), ("pokrocile", 50)):
            self.assertEqual(sum(
                sum(topic["quotas"].values()) for topic in outline["topics"]
                if topic["level"] == level
            ), expected)
        for type_, expected in (("write-query", 63), ("explain-result", 37)):
            self.assertEqual(sum(topic["quotas"][type_] for topic in outline["topics"]), expected)
        for topic in outline["topics"]:
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
            "version": 1, "target_total": 100,
            "topics": [
                {"slug": "select", "label": "Výběr", "level": level,
                 "quotas": {"write-query": 30, "explain-result": 20}}
                for level in ("zaklady", "pokrocile")
            ],
        }
        builder.validate_outline(valid)
        cases = [None, [], {}, {**valid, "target_total": 79},
                 {**valid, "target_total": 101}, {**valid, "topics": []},
                 {**valid, "topics": valid["topics"] * 2},
                 {**valid, "topics": [valid["topics"][0]]}]
        for key, value in [
            ("level", "advanced"), ("level", []), ("slug", "SELECT dotaz"),
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

    def test_find_bug_removed_from_ui_seed_and_catalog(self):
        self.assertEqual(builder.TYPES, {"write-query", "explain-result"})
        self.assertTrue(all(task["type"] != "find-bug" for task in builder.SEED))
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
                self.assertIn(f"{len(self.catalog)}/100", result.stdout)
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
