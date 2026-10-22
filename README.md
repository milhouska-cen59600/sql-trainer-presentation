# SQL trenažér z prezentace

Jednoduchý český trenažér Oracle SQL bez frameworku, databáze a externích závislostí.
Obsahuje 8 základních a 4 pokročilé úlohy: operátory, datum, řetězce,
datové typy, čísla a množinové operace. Každá úloha obsahuje krátkou teorii,
nápovědu a vzorové řešení; tam, kde jsou potřeba, také ukázková data.

## Spuštění lokálně

Z kořene repozitáře (Python 3.9+):

```sh
python scripts/build_tasks.py
python -m http.server 8000
```

Otevři <http://localhost:8000/docs/> nebo <http://localhost:8000/web/>.
Pouhé otevření `docs/index.html` přes `file://` nestačí: prohlížeč může blokovat
načtení JSON. Na GitHub Pages funguje relativní cesta `./tasks.json` i pod názvem
repozitáře. JavaScript potřebuje moderní prohlížeč.

Vyber úroveň **Základy** (`zaklady`) nebo **Pokročilé** (`pokrocile`), typ
**Napiš dotaz**, **Vysvětli výsledek** a volitelně téma.
Klikni na **Spustit**. **Další úloha** cyklicky prochází aktuální výběr.
Změna filtru vymaže rozepsanou odpověď a vyžaduje nové spuštění.
Prázdná kombinace filtrů zobrazí zprávu, nikoli nesouvisející úlohu.

Kontrola **neprovádí SQL**: porovnává tokeny se vzorem a u vysvětlení hledá
všechna klíčová slova (bez ohledu na diakritiku a velikost písmen).
SQL porovnání zachovává obsah literálů a uvozovaných identifikátorů.
Ekvivalentní přepis dotazu může být odmítnut; klíčová slova nezaručují věcně
správné vysvětlení. Výsledek proto vždy porovnej se vzorovým řešením.
Odpovědi se neukládají ani nikam neodesílají.

## Soubory

- `web/index.html`, `web/app.js`, `web/styles.css`: zdrojové UI.
- `web/tasks.json`: generovaný katalog.
- `docs/`: totožné čtyři soubory pro publikaci.
- `scripts/build_tasks.py`: vložený starter katalog, validátor a generátor.
- `tests/test_catalog.py`: schéma, unikátní ID, pokrytí, generování a parita.
- `tests/test_app.js`: kontrola odpovědí pomocí vestavěného Node test runneru.
- `materials/SQL_1_Data academy.pdf`: podkladová prezentace.
- `materials/tasks_source.json`: volitelný vlastní zdroj katalogu.

## Práce s obsahem

Starter je ručně připravený podle uvedených témat, ne automatický přepis PDF.
Generátor PDF nečte ani neprovádí OCR. Při rozšiřování kontroluj příklady
oproti prezentaci a používej konzistentně dialekt Oracle SQL.

1. Při prvním přizpůsobení vytvoř editovatelný zdroj:

   ```sh
   cp web/tasks.json materials/tasks_source.json
   ```

2. Uprav tento JSON podle prezentace. Bez tohoto souboru generátor použije
   vložený `SEED` v `scripts/build_tasks.py` a vypíše návod. Existující neplatný
   zdroj či chybějící explicitní `--source` skončí chybou bez přepsání katalogů.
3. Vygeneruj obě kopie a spusť testy:

   ```sh
   python scripts/build_tasks.py
   python -m unittest discover -s tests -v
   node --test tests/test_app.js
   ```

   Python testy a generátor nemají závislosti mimo stdlib. Node.js 18+ je
   volitelný pouze pro JS testy, nikoli pro provoz aplikace. Jiný zdroj lze zadat
   pomocí `python scripts/build_tasks.py --source cesta/k/uloham.json`.

Katalog je neprázdné JSON pole objektů. Povinné klíče:

| Klíč | Význam |
| --- | --- |
| `id` | Unikátní kladné celé číslo |
| `level` | `zaklady` nebo `pokrocile` |
| `topic` | `operatory`, `datum`, `retezce`, `datove-typy`, `cisla`, `mnozinove-operace` |
| `type` | `write-query`, `explain-result` |
| `instruction` | Krátký titulek zadání |
| `prompt` | Přesné zadání bez univerzálních poznámek o nesouvisejících sloupcích |
| `sql` | SQL k rozboru; u psaní dotazu může být `null` |
| `theory` | Krátká teorie; prázdný řetězec skryje blok |
| `tables` | Pole `{name, columns, rows}`; může být prázdné |
| `solution` | Vzorový dotaz nebo vysvětlení |
| `hint` | Nápověda |
| `keywords` | Pole klíčových slov, čísel či ISO dat; neprázdné u vysvětlení, jinak `[]` |

`columns` obsahuje popisky sloupců včetně typů, `rows` pole stejně širokých řádků.
Buňky jsou text, číslo nebo `null` (zobrazí se jako `NULL`). Data jsou pouze
ukázka, ne databáze. Poznámky o chybějících hodnotách přidávej jen tam, kde mají
význam. `explain-result` vyžaduje neprázdné `sql`.
Pro vysvětlení vybírej stručná jednoznačná klíčová slova; kontrola hledá celé
tokeny, ne podřetězce (`2` neodpovídá `12`). Používej desetinný oddělovač shodný
se vzorovým řešením. Pokud jsou klíčová slova výhradně seznamem více celých čísel,
čárka v odpovědi odděluje položky seznamu (`1,2,3`), nikoli desetinná místa.

## Synchronizace a publikace

`web/` a `docs/` záměrně obsahují **bajtově totožné soubory**.
Generátor synchronizuje pouze `tasks.json`. Po úpravě HTML/JS/CSS spusť:

```sh
cp web/index.html web/app.js web/styles.css docs/
python -m unittest discover -s tests -v
```

Test parity hlídá všechny čtyři soubory. Commituj zdroj i generované kopie.
V GitHub **Settings → Pages → Deploy from a branch** vyber větev `main`
a složku `/docs`, potom ulož. Po sloučení změn je aplikace dostupná na
<https://milhouska-cen59600.github.io/sql-trainer-presentation/>.
Není nutný bundler ani build workflow.

## Rozdíl oproti sql-trainer-cli

Původní `sql-trainer-cli` nabízí CLI/GUI a webový trenažér s bankovní doménou
a úrovněmi Junior/Medior/Senior. Tento samostatný projekt přebírá princip
výběru úlohy, nápovědy a řešení i vizuální styl (světlé karty, tmavé panely
zadání a odpovědi, tmavé selecty a textarea), ale zaměřuje se na témata
prezentace, právě dvě úrovně a teorii u každé úlohy. Nesdílí databázi,
Python runtime aplikaci ani katalog původního projektu.
