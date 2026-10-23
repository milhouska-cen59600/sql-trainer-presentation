#!/usr/bin/env python3
"""Build and validate the curated Oracle SQL catalog using only the stdlib."""

import argparse
from collections import Counter
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LEVELS = {"zaklady", "pokrocile"}
TYPES = {"write-query", "explain-result"}
TOPICS = {
    "select", "operatory", "datum", "retezce", "datove-typy", "cisla",
    "mnozinove-operace", "agregace", "podminky", "poddotazy", "null",
    "joiny", "cte", "listagg", "partitioning", "datovy-slovnik",
    "pivot-unpivot", "pokrocile-agregace", "regularni-vyrazy",
    "hierarchicke-dotazy", "analyticke-funkce",
}
REQUIRED_KEYS = {
    "id", "level", "topic", "type", "instruction", "prompt", "sql",
    "theory", "tables", "solution", "hint", "keywords",
}

def validate_outline(outline):
    if not isinstance(outline, dict) or outline.get("version") != 1:
        raise ValueError("Outline must have version 1")
    target = outline.get("target_total")
    if type(target) is not int or target != 100:
        raise ValueError("Outline target_total must be 100")
    topics = outline.get("topics")
    if not isinstance(topics, list) or not topics:
        raise ValueError("Outline topics must be a non-empty list")
    pairs, labels, levels = set(), {}, set()
    total = 0
    for topic in topics:
        if not isinstance(topic, dict):
            raise ValueError("Outline topic must be an object")
        slug, level, label = topic.get("slug"), topic.get("level"), topic.get("label")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", slug):
            raise ValueError("Outline topic must have a canonical slug")
        if not isinstance(level, str) or level not in LEVELS:
            raise ValueError("Outline topic has an invalid level")
        if "source" in topic and topic["source"] != {"zaklady": "basic", "pokrocile": "advanced"}[level]:
            raise ValueError("Outline topic source does not match its level")
        if (level, slug) in pairs:
            raise ValueError("Duplicate outline level/topic")
        pairs.add((level, slug))
        levels.add(level)
        if not isinstance(label, str) or not label.strip() or labels.get(slug, label) != label:
            raise ValueError("Outline topic must have a consistent non-empty label")
        labels[slug] = label
        quotas = topic.get("quotas")
        if not isinstance(quotas, dict) or quotas.keys() != TYPES:
            raise ValueError("Outline quotas must use exactly the allowed task types")
        if any(type(value) is not int or value < 0 for value in quotas.values()):
            raise ValueError("Outline quotas must be non-negative integers")
        if not sum(quotas.values()):
            raise ValueError("Outline topic quota must be positive")
        total += sum(quotas.values())
    if levels != LEVELS or total != target:
        raise ValueError("Outline levels or quota total do not match the target")
    return outline


def validate_catalog(catalog, topics=TOPICS, outline=None):
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
        for key, allowed in [("level", LEVELS), ("type", TYPES), ("topic", topics)]:
            if not isinstance(item[key], str) or item[key] not in allowed:
                raise ValueError(f"Task {id_}: invalid {key}")
        for key in ["instruction", "prompt", "solution", "hint"]:
            if not isinstance(item[key], str) or not item[key].strip():
                raise ValueError(f"Task {id_}: {key} must be non-empty text")
        if not isinstance(item["theory"], str):
            raise ValueError(f"Task {id_}: theory must be text (may be empty)")
        if item["sql"] is not None and not isinstance(item["sql"], str):
            raise ValueError(f"Task {id_}: sql must be text or null")
        if item["type"] == "explain-result" and not (item["sql"] or "").strip():
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
    if outline:
        expected = {
            (topic["level"], topic["slug"], type_): quota
            for topic in outline["topics"]
            for type_, quota in topic["quotas"].items()
        }
        actual = Counter(
            (item["level"], item["topic"], item["type"]) for item in catalog
        )
        if actual != Counter(expected):
            raise ValueError("Catalog counts do not match outline quotas")
    return catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Curated JSON source, same schema as tasks.json")
    parser.add_argument("--outline", type=Path, help="JSON curriculum with topic quotas")
    args = parser.parse_args()
    source = args.source if args.source is not None else ROOT / "materials/tasks_source.json"
    outline_path = args.outline if args.outline is not None else ROOT / "materials/outline.json"
    try:
        outline = validate_outline(json.loads(outline_path.read_text(encoding="utf-8")))
        if source.exists():
            catalog = json.loads(source.read_text(encoding="utf-8"))
        else:
            raise ValueError(f"Source does not exist: {source}")
        topics = {topic["slug"] for topic in outline["topics"]}
        validate_catalog(catalog, topics, outline)
        output = json.dumps(catalog, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    except (OSError, ValueError) as error:
        parser.exit(1, f"Catalog error: {error}\n")
    for directory in ("web", "docs"):
        (ROOT / directory / "tasks.json").write_text(output, encoding="utf-8")
    print(f"Generated {len(catalog)} tasks in web/tasks.json and docs/tasks.json.")
    print(f"Outline coverage: {len(catalog)}/{outline['target_total']} tasks.")
    for topic in outline["topics"]:
        for type_, quota in topic["quotas"].items():
            print(f"{topic['level']}/{topic['slug']}/{type_}: {quota}/{quota}")


if __name__ == "__main__":
    main()
