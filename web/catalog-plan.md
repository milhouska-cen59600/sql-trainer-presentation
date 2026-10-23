# Katalog 60 úloh z PDF

Katalog obsahuje přesně **60 úloh**: **35 základních** a **25 pokročilých**.
Typy: **37× Napiš dotaz** (`write-query`) a **23× Vysvětli výsledek**
(`explain-result`). Typ `find-bug` se nepoužívá.

## Zdroje a pokrytá témata

Čísla stran jsou pořadová čísla stran PDF od 1. Podrobné strojově čitelné
odkazy a kvóty jsou v `materials/outline.json`; vlastní zadání jsou v
`materials/tasks_source.json`.

| Úroveň | Téma | Úlohy | Zdroj a obsah |
| --- | --- | ---: | --- |
| Základy | Výběr a řazení | 3 | `SQL_1_Data academy.pdf`, s. 13–17, 51, 68: SELECT, DISTINCT, ORDER BY |
| Základy | Operátory | 3 | s. 17–19, 39–40, 87: WHERE, BETWEEN, LIKE, IN a porovnání |
| Základy | Datové typy | 2 | s. 20–23, 27–33, 41–42: explicitní převod TO_DATE a TO_CHAR |
| Základy | Datum | 2 | s. 21–26: ADD_MONTHS a LAST_DAY |
| Základy | Řetězce | 3 | s. 27–40: UPPER, SUBSTR, TRIM a REPLACE |
| Základy | Čísla | 2 | s. 41–44: ROUND a MOD |
| Základy | Množinové operace | 2 | s. 46–57: UNION ALL a INTERSECT |
| Základy | Agregace | 4 | s. 59–66: SUM, AVG, MIN, MAX, COUNT, GROUP BY a HAVING |
| Základy | Podmíněné výrazy | 2 | s. 68–74: CASE a DECODE |
| Základy | Poddotazy | 4 | s. 75–80, 88–95, 132–134: skalární poddotaz, IN a EXISTS |
| Základy | NULL a NVL | 2 | s. 81–86: NVL a vliv NULL na COUNT |
| Základy | Spojování tabulek | 4 | s. 97–103, 109–131: INNER, LEFT a FULL OUTER JOIN |
| Základy | WITH a CTE | 2 | s. 135–140: pojmenovaný mezivýsledek |
| Pokročilé | Datum — opakovací most | 1 | Základy, s. 21–26: polootevřený interval pro Oracle DATE s časem |
| Pokročilé | Datové typy — opakovací most | 1 | Základy, s. 20–23: převod textu na datum s maskou |
| Pokročilé | Množinové operace — opakovací most | 1 | Základy, s. 46–55: MINUS |
| Pokročilé | Řetězce | 2 | `Advanced_SQL_2_Data academy.pdf`, s. 3–7: CONVERT a TRANSLATE |
| Pokročilé | LISTAGG | 2 | s. 8–11: agregace řetězců a pořadí ve WITHIN GROUP |
| Pokročilé | Partitioning | 2 | s. 12–15: oddíly tabulky a jejich rozdíl od analytického PARTITION BY |
| Pokročilé | Datový slovník | 2 | s. 16–22: ALL_TABLES a ALL_TAB_COLUMNS |
| Pokročilé | PIVOT a UNPIVOT | 2 | s. 23–31: převod řádků a sloupců pomocí PIVOT a UNPIVOT |
| Pokročilé | Pokročilé agregace | 3 | s. 32–43: ROLLUP, GROUPING_ID a CUBE |
| Pokročilé | Regulární výrazy | 3 | s. 44–56: REGEXP_LIKE, REGEXP_REPLACE a REGEXP_SUBSTR |
| Pokročilé | Hierarchické dotazy | 3 | s. 57–68: START WITH, CONNECT BY, LEVEL a SYS_CONNECT_BY_PATH |
| Pokročilé | Analytické funkce | 3 | s. 69–82: ROW_NUMBER, LAG a průběžná SUM s explicitním rámcem |

## Adaptace a předpoklady

- Prezentace učí Oracle SQL a používá DWH schémata; pro úlohy jsou připraveny
  malé samostatné české ukázkové tabulky bez firemních dat a externích souborů.
- Zadání a řešení jsou didaktické adaptace témat a příkladů z uvedených stran,
  nikoli automatický přepis PDF. Pokročilé úlohy Datum, Datové typy a
  Množinové operace jsou výslovně opakovací mosty ze základní prezentace.
- Úloha Partitioning předpokládá existující tabulku a oddíl; úloha datového
  slovníku předpokládá přístup k pohledům ALL_TABLES a ALL_TAB_COLUMNS.
- Datumové příklady používají pevné hodnoty. U analytické agregace je rámec
  `ROWS` uveden výslovně, aby výsledek nezávisel na implicitním rámci Oracle.
- Aplikace SQL nevykonává. Testy ověřují katalog, schéma, deterministické
  generování, rozdělení kvót, kontrolu odpovědí a shodu publikačních kopií;
  nejsou náhradou spuštění dotazů v konkrétní verzi Oracle.

## Úprava a regenerování

Upravuj `materials/tasks_source.json` (zadání a řešení) a
`materials/outline.json` (zdroje, stránky a kvóty). Generátor kontroluje přesně
60 úloh i každou kvótu a zapíše bajtově shodné `web/tasks.json` a `docs/tasks.json`:

```sh
python scripts/build_tasks.py --outline materials/outline.json
python -m unittest discover -s tests -v
node --test tests/test_app.js
```
