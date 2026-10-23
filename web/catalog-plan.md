# Katalog 100 úloh z PDF

Katalog obsahuje přesně **100 úloh**: **58 základních** a **42 pokročilých**.
Typy: **60× Napiš dotaz** (`write-query`) a **40× Vysvětli výsledek**
(`explain-result`). Typ `find-bug` se nepoužívá.

## Zdroje a pokrytá témata

Čísla stran jsou pořadová čísla stran PDF od 1. Podrobné strojově čitelné
odkazy a kvóty jsou v `materials/outline.json`; vlastní zadání jsou v
`materials/tasks_source.json`.

| Úroveň | Téma | Úlohy | Zdroj a obsah |
| --- | --- | ---: | --- |
| Základy | Výběr a řazení | 4 | `SQL_1_Data academy.pdf`, s. 13–17, 51, 68: SELECT, DISTINCT, ORDER BY |
| Základy | Operátory | 5 | s. 17–19, 39–40, 87: WHERE, BETWEEN, LIKE, IN a porovnání |
| Základy | Datové typy | 5 | s. 20–23, 27–33, 41–42: explicitní převod TO_DATE a TO_CHAR |
| Základy | Datum | 5 | s. 21–26: ADD_MONTHS, LAST_DAY a datumová aritmetika |
| Základy | Řetězce | 6 | s. 27–40: UPPER, SUBSTR, TRIM, REPLACE, LPAD a konkatenace |
| Základy | Čísla | 3 | s. 41–44: ROUND, TRUNC, CEIL a MOD |
| Základy | Množinové operace | 5 | s. 46–57: UNION, UNION ALL, INTERSECT a MINUS |
| Základy | Agregace | 6 | s. 59–66, 81–86: COUNT, GROUP BY, HAVING a NULL |
| Základy | Podmíněné výrazy | 3 | s. 68–74: CASE a DECODE |
| Základy | Poddotazy | 5 | s. 75–80, 88–95, 132–134: skalární poddotaz, IN a EXISTS |
| Základy | NULL a NVL | 3 | s. 81–86: NVL, NVL2 a vliv NULL na COUNT |
| Základy | Spojování tabulek | 5 | s. 97–103, 109–131: INNER, LEFT, RIGHT a FULL OUTER JOIN |
| Základy | WITH a CTE | 3 | s. 135–140: pojmenovaný mezivýsledek |
| Pokročilé | Řetězce | 4 | `Advanced_SQL_2_Data academy.pdf`, s. 3–7: CONVERT a TRANSLATE |
| Pokročilé | LISTAGG | 4 | s. 8–11: agregace řetězců a pořadí ve WITHIN GROUP |
| Pokročilé | Partitioning | 4 | s. 12–15: oddíly tabulky a jejich rozdíl od analytického PARTITION BY |
| Pokročilé | Datový slovník | 4 | s. 16–22: ALL_TABLES, ALL_TAB_COLUMNS a partition pohledy |
| Pokročilé | PIVOT a UNPIVOT | 5 | s. 23–31: převod řádků a sloupců pomocí PIVOT a UNPIVOT |
| Pokročilé | Pokročilé agregace | 6 | s. 32–43: ROLLUP, GROUPING SETS, GROUPING_ID a CUBE |
| Pokročilé | Regulární výrazy | 5 | s. 44–56: REGEXP_LIKE, REGEXP_REPLACE a POSIX třídy |
| Pokročilé | Hierarchické dotazy | 5 | s. 57–68: START WITH, CONNECT BY, LEVEL a SYS_CONNECT_BY_PATH |
| Pokročilé | Analytické funkce | 5 | s. 69–82: ROW_NUMBER, LAG, okna a průběžná SUM |

## Adaptace a předpoklady

- Prezentace učí Oracle SQL a používá DWH schémata; pro úlohy jsou připraveny
  malé samostatné české ukázkové tabulky bez firemních dat a externích souborů.
- Zadání a řešení jsou didaktické adaptace témat a příkladů z uvedených stran,
  nikoli automatický přepis PDF. Úroveň každé úlohy odpovídá zdrojové prezentaci;
  úlohy ze základní prezentace nejsou součástí pokročilého výběru.
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
100 úloh i každou kvótu a zapíše bajtově shodné `web/tasks.json` a `docs/tasks.json`:

```sh
python scripts/build_tasks.py --outline materials/outline.json
python -m unittest discover -s tests -v
node --test tests/test_app.js
```
