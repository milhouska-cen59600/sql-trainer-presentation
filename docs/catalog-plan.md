# Plán rozšíření katalogu z PDF

## Rozsah a metoda

Cíl: **100 ověřených úloh** (50 Základy, 50 Pokročilé), s možností pozdějšího
rozšíření na 120 nebo zúžení na 80. Jde o plán, ne o hotový katalog:
aplikace nadále obsahuje 12 starter úloh (8 + 4). Ty se do cíle započítávají,
tedy pro variantu 100 zbývá připravit **88 nových úloh**.

Podklady v `materials/`:

- **B** = `SQL_1_Data academy.pdf`, 142 stran.
- **A** = `Advanced_SQL_2_Data academy.pdf`, 83 stran.

Osnova byla získána z textové vrstvy obou PDF pomocí `pdfminer`, bez OCR.
Níže uvádíme **pořadová čísla stran PDF od 1**, včetně titulních snímků.
Rozsahy jsou best-effort odkazy na výklad i cvičení; překryvy jsou záměrné
(například převod data patří k typům i datu). Nejde o doslovný přepis,
automatické převzetí příkladů ani záruku správné extrakce diagramů.

Materiály používají Oracle SQL a původní DWH schémata. Pro trenažér vytvoříme
vlastní malé anonymní tabulky, nezávislé na firemních datech, oprávněních a
externích `.txt` souborech zmíněných ve snímcích. Tyto soubory nemáme jako
samostatný zdroj. Verzi Oracle před publikací příkladů ověří autor;
zvláště NLS, LISTAGG, regulární výrazy a analytická okna mohou mít specifika.
Úlohy mají mít pevné vstupy, datum i očekávané řazení.

## Extrahovaná mapa a kanonická taxonomie

`slug` je přesná hodnota `topic` v úloze. Úroveň je vždy `zaklady` nebo
`pokrocile`, nikoli obtížnost odhadnutá podle názvu SQL konstrukce.
Zachováváme všech šest existujících slugů. Pro každou úlohu zvolíme jedno
hlavní téma podle procvičované dovednosti; předpoklady nenavyšují počty.
Například TO_DATE patří k `datove-typy`, výběr měsíce k `datum`,
IN se seznamem k `operatory`, IN se SELECTem k `poddotazy`.

### Základy — 50 úloh

| Slug / české téma | Konkrétní obsah | Zdroj | Napiš dotaz | Vysvětli výsledek | Celkem |
| --- | --- | --- | ---: | ---: | ---: |
| `select` / Výběr a řazení | SELECT, projekce, ORDER BY, DISTINCT; aliasy v pozdějších příkladech | B 13–17, 51, 68 | 3 | 1 | 4 |
| `operatory` / Operátory | WHERE, porovnání, AND/OR/NOT, LIKE, BETWEEN, IN se seznamem | B 17–19, 39–40, 87 | 3 | 2 | 5 |
| `datove-typy` / Datové typy | NUMBER, VARCHAR2, DATE, explicitní převody TO_DATE/TO_CHAR/TO_NUMBER | B 20–23, 27–33, 41–42 | 1 | 2 | 3 |
| `datum` / Datum | Formáty, SYSDATE, aritmetika, ADD_MONTHS, MONTHS_BETWEEN, LAST_DAY, TRUNC/ROUND | B 21–26 | 3 | 1 | 4 |
| `retezce` / Řetězce | Spojování, velikost písmen, SUBSTR, INSTR, TRIM, REPLACE, délka a porovnání | B 27–40 | 3 | 1 | 4 |
| `cisla` / Čísla | ROUND, TRUNC, CEIL/FLOOR, ABS, MOD, POWER/SQRT a číselné výrazy | B 41–44 | 2 | 1 | 3 |
| `mnozinove-operace` / Množinové operace | UNION, UNION ALL, INTERSECT, MINUS, duplicity a kompatibilita větví | B 46–57 | 3 | 2 | 5 |
| `agregace` / Agregace | COUNT/SUM/AVG/MIN/MAX, GROUP BY, HAVING | B 59–66 | 3 | 2 | 5 |
| `podminky` / Podmíněné výrazy | DECODE, jednoduchý i prohledávaný CASE, kategorizace | B 68–74 | 2 | 1 | 3 |
| `poddotazy` / Poddotazy | Odvozené tabulky, IN se SELECTem, vícesloupcové IN, EXISTS/NOT EXISTS | B 75–80, 88–95, 132–134 | 3 | 1 | 4 |
| `null` / NULL a NVL | IS NULL, NVL, NULL v agregacích a výrazech | B 81–86 | 2 | 1 | 3 |
| `joiny` / Spojování tabulek | INNER, LEFT, RIGHT, FULL; chybějící protějšek, násobení řádků | B 97–103, 109–131 | 3 | 2 | 5 |
| `cte` / WITH a CTE | Pojmenování mezivýsledků, skládání dotazu | B 135–140 | 1 | 1 | 2 |
| **Součet** | | | **32** | **18** | **50** |

B 3–11 (data, relační model, klíče, auditní atributy a historizace DWH)
slouží jako kontext k tabulkám, bez samostatné kvóty. Motivační příklad
se vrací na B 12, 45, 58, 96, 104–108 a 137–139; jeho dílčí dovednosti
počítáme do témat výše, nikoli jako další duplicitní úlohy.
B 141 je pouze ochutnávka hierarchie, kterou rozpracujeme podle A 57–68.
U joinů materiál porovnává starší Oracle zápis včetně `(+)` s ANSI syntaxí;
pro nové psané úlohy preferujeme ANSI JOIN, starší zápis lze pouze vysvětlit.

### Pokročilé — 50 úloh

| Slug / české téma | Konkrétní obsah | Zdroj | Napiš dotaz | Vysvětli výsledek | Celkem |
| --- | --- | --- | ---: | ---: | ---: |
| `datum` / Datum | Opakovací most: polootevřený interval a čas v DATE | B 21–26; návrh rozšíření | 1 | 0 | 1 |
| `datove-typy` / Datové typy | Opakovací most: převod s explicitní maskou | B 20–23 | 1 | 0 | 1 |
| `mnozinove-operace` / Množinové operace | Opakovací most: existující MINUS | B 46–55 | 0 | 1 | 1 |
| `retezce` / Řetězce | CONVERT, TRANSLATE; také existující SUBSTR/TRIM ze základů | A 3–7; B 34–38 | 2 | 2 | 4 |
| `listagg` / LISTAGG | Seskupení textů, oddělovač, WITHIN GROUP a řazení/NLSSORT | A 8–11 | 2 | 1 | 3 |
| `partitioning` / Partitioning | Význam oddílů, omezení na partition, rozdíl oproti analytickému PARTITION BY | A 12–15 | 1 | 2 | 3 |
| `datovy-slovnik` / Datový slovník | ALL_OBJECTS, ALL_TABLES, ALL_TAB_COLUMNS, omezení a partition metadata | A 16–22 | 3 | 1 | 4 |
| `pivot-unpivot` / PIVOT a UNPIVOT | Řádky ↔ sloupce, agregace a NULL, alternativa přes CASE | A 23–31 | 4 | 2 | 6 |
| `pokrocile-agregace` / Pokročilé agregace | ROLLUP, CUBE, GROUPING SETS, GROUPING_ID | A 32–43 | 4 | 3 | 7 |
| `regularni-vyrazy` / Regulární výrazy | REGEXP_LIKE/REPLACE/SUBSTR/INSTR, kotvy, kvantifikátory, POSIX třídy | A 44–56 | 4 | 2 | 6 |
| `hierarchicke-dotazy` / Hierarchické dotazy | START WITH, CONNECT BY, PRIOR, LEVEL, cesty; rekurzivní WITH | A 57–68 (WITH 66–68) | 4 | 2 | 6 |
| `analyticke-funkce` / Analytické funkce | OVER, PARTITION BY, ORDER BY, okna ROWS, RANK/ROW_NUMBER, LAG/LEAD, FIRST/LAST_VALUE, průběžné agregace | A 69–82 | 5 | 3 | 8 |
| **Součet** | | | **31** | **19** | **50** |

Tři samostatné opakovací mosty a jedna úloha SUBSTR/TRIM zachovávají
současné čtyři pokročilé starter úlohy. Nejsou vydávány za kapitoly druhého PDF.
CAST z původního starteru je doplňující příklad, nikoli vytěžené téma.
Literál DATE je uveden již na B 20.
U partitioningu neplánujeme administrátorské DDL; psaná úloha pouze vybírá
z předem popsaného oddílu. Metadata dodáme jako ukázkové řádky bez potřeby DBA práv.
Jako doplnění doporučujeme srovnání ROWS/RANGE a explicitní definici okna.
A 72 uvádí výchozí okno jako ROWS; toto tvrzení nelze obecně převzít:
u analytické agregace s ORDER BY je implicitní okno RANGE BETWEEN
UNBOUNDED PRECEDING AND CURRENT ROW. Nové úlohy proto musí určit okno
a řešit i shodné řadicí hodnoty; správnost ověříme proti zvolené verzi Oracle.

## Distribuce a zdroj pro generátor

Celkem **63× `write-query` (Napiš dotaz)** a **37× `explain-result`
(Vysvětli výsledek)**. Typ **`find-bug` / Oprav chybu byl již odstraněn**
z aplikace, seed katalogu i validátoru; má nulovou kvótu a nevrací se.
Žádný další typ ani novou úroveň tento plán nezavádí.

Autoritativní strojový zdroj je `materials/outline.json`:

- `version: 1`, `target_total: 100`, `sources` s názvy a počty stran;
- `topics`: položky `slug`, český `label`, `level`, `source`,
  `pages` (seznam inkluzivních dvojic od–do) a `quotas` podle dvou povolených typů;
- stejný slug může být v obou úrovních, ale dvojice `(level, slug)` je unikátní;
- volitelné `note` vysvětluje opakovací mosty a předpoklady.

Generátor s `--outline materials/outline.json` ověřuje slugy, úrovně,
typy, nezáporné celočíselné kvóty a součet cíle. U hotových úloh kontroluje
příslušnost k dvojici úroveň/téma a vypisuje plnění každé kvóty.
Průběžné podplnění ani překročení kvóty neblokuje publikaci; přehled není
hodnocení kvality. Odkazy na PDF jsou redakční metadata, nikoli vstup OCR.
Změnu kvót vždy promítni do obou kopií tohoto dokumentu a testu distribuce.

## Roadmapa M1 / M2 / M3

| Milník | Cílový stav (kumulativně) | Konkrétní práce a podmínka dokončení |
| --- | --- | --- |
| **M1 — pevný základ** | 30 Základy + 10 Pokročilé = **40** (přidat 28) | Zachovat ID a zrevidovat všech 12 starter úloh. Doplnit prvních sedm základních témat na jejich plné kvóty (28) a dvě úlohy `agregace`. V Pokročilých dokončit tři mosty, `retezce` a `listagg` (10). Zavést editovatelný zdroj, české popisky nových témat v UI a kontrolu pokrytí. |
| **M2 — šíře kurzu** | 50 Základy + 30 Pokročilé = **80** (přidat 40) | Dokončit všechny základní kvóty včetně NULL, poddotazů, joinů a CTE. V Pokročilých naplnit `partitioning` (3), `datovy-slovnik` (4), `pivot-unpivot` (6), `pokrocile-agregace` (7): dalších 20. Ručně projít filtry pro každé nově obsazené téma. |
| **M3 — plný plán** | 50 Základy + 50 Pokročilé = **100** (přidat 20) | Doplnit `regularni-vyrazy` (6), `hierarchicke-dotazy` (6), `analyticke-funkce` (8). Zkontrolovat všechny kvóty, návaznosti a řešení. Rozšíření na 120 řešit až následným přepočtem osnovy; 80 z M2 je použitelná meziverze, ne splnění cíle 100. |

U každé nové úlohy:

1. Vybrat jeden výukový cíl a zdrojovou sekci, použít stabilní nové ID.
   Přidat zadání, krátkou teorii, nápovědu, vlastní malé vstupní tabulky a řešení.
2. Pokrýt rozhodující hraniční situaci (duplicity, NULL, čas, shodné pořadí,
   prázdný oddíl nebo kořen hierarchie), ne jen měnit čísla stejného dotazu.
3. Vzorový SQL a očekávaný výsledek ručně ověřit v odpovídajícím Oracle prostředí.
   Aplikace sama SQL **nespouští**. Není-li prostředí dostupné, označit úlohu
   při redakční kontrole jako neověřenou a zatím ji nepublikovat do zdroje.
4. Pro `explain-result` dodat SQL a jednoznačná klíčová slova; u `write-query`
   vysvětlit požadovaný tvar, protože tokenová kontrola nepozná všechny
   ekvivalentní dotazy. Neslibovat deterministické pořadí bez ORDER BY.
5. Spustit generátor, Python a JS testy; potvrdit shodu `docs/` a `web/`.
   Při novém tématu doplnit `topicLabels` v UI. Milník uzavřít až po redakční
   kontrole, nikoli pouhým dosažením počtu.

## Provedení

Z kořene repozitáře, bez dalších Python závislostí:

```sh
# Jen při prvním založení vlastního zdroje (existující zdroj nepřepisovat):
cp web/tasks.json materials/tasks_source.json
# Ručně upravit zdroj úloh a případně outline.json.
python scripts/build_tasks.py --outline materials/outline.json
cp docs/catalog-plan.md web/catalog-plan.md
python -m unittest discover -s tests -v
node --test tests/test_app.js
```

Generátor zapisuje obě kopie `tasks.json` automaticky a bez osnovy zachovává
původní režim. V tomto plánovacím kroku se zdroj plného katalogu ani nových
88 úloh nevytváří. Plán v `docs/catalog-plan.md` a `web/catalog-plan.md` má být
bajtově totožný; zdrojem pro další úpravy dokumentu je kopie v `docs/`.
