# SQL Trainer

Jednoduchý český trenažér Oracle SQL bez frameworku, databáze a externích závislostí.
Obsahuje 112 úloh odvozených z PDF v `materials/`: 64 základních a 48 pokročilých.
Zadání obsahuje stručný úkol a potřebná ukázková data. Teorie je ve výchozím
stavu sbalená; nápovědu a vzorové řešení lze zobrazit na vyžádání.

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
**Napiš dotaz**, **Vysvětli výsledek**, **Oprav SQL** a volitelně téma.
Klikni na **Spustit**. **Další úloha** cyklicky prochází aktuální výběr.
Režim **Oprav SQL** odvozuje 66 cvičení z existujících úloh typu **Napiš dotaz**,
bez změny katalogu a jeho ID. Dostaneš chybný dotaz také předvyplněný v odpovědi;
oprav jej podle zadání. Chyba vzniká deterministicky ze vzorového řešení
(například `SORT BY`, chybějící `BY`, chybná podmínka spojení nebo `FORM` místo
`FROM`). Kontrola používá stejné porovnání s původním správným řešením.
Zobrazené SQL i předvyplněná odpověď mají jednotné víceřádkové formátování.
Tlačítko **Náhodná úloha ve zvolené úrovni** vybírá se stejnou pravděpodobností
ze všech úloh dané úrovně včetně odvozených oprav SQL bez ohledu na téma a typ,
i bez vybraného tématu.
Tlačítko je aktivní, kdykoli zvolená úroveň obsahuje alespoň jednu úlohu.
Opětovným kliknutím losuješ znovu; **Další úloha** pak prochází celou zvolenou úroveň.
Témata i úlohy odpovídají pouze zvolené úrovni a jejímu zdrojovému PDF.
Interní ID úloh se v nadpisech nezobrazují.
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
- `index.html` načítá `app.js` a `styles.css` s parametrem `?v=` (prvních 8 znaků
  SHA-256 obsahu souboru), aby prohlížeč po nasazení nepoužil starou verzi z cache.
  Při změně těchto souborů hash aktualizuj; hlídá to `tests/test_catalog.py`.
- `scripts/build_tasks.py`: validátor a deterministický generátor katalogu.
- `tests/test_catalog.py`: schéma, unikátní ID, pokrytí, generování a parita.
- `tests/test_app.js`: kontrola odpovědí pomocí vestavěného Node test runneru.
- `materials/SQL_1_Data academy.pdf`: podkladová prezentace.
- `materials/Advanced_SQL_2_Data academy.pdf`: pokročilá prezentace.
- `materials/outline.json`: témata, odkazy na strany PDF a přesné kvóty.
- `materials/tasks_source.json`: kanonický zdroj všech 112 úloh.
- `docs/catalog-plan.md`, `web/catalog-plan.md`: zrcadlený přehled pokrytí a předpokladů.

## Práce s obsahem

Stručný postup pro přispěvatele:

1. Uprav zadání v `materials/tasks_source.json`, nikoli v generovaných kopiích.
   Zachovej ID existujících úloh; nové ID musí být unikátní kladné celé číslo.
2. Zkontroluj soulad zadání, ukázkových tabulek, řešení, nápovědy a klíčových slov
   podle schématu níže. Výstupní aliasy a požadované řazení uveď přímo v zadání.
3. Při změně pokrytí uprav také `materials/outline.json` a obě kopie
   `catalog-plan.md`. Přidání úlohy vyžaduje sladění celkového počtu, kvót
   i odpovídajících kontrol v generátoru a testech; samotné přidání do JSON nestačí.
4. Spusť generátor a oba testovací příkazy níže. Změněnou úlohu ověř i
   v prohlížeči: zadání, tabulky, nápovědu, kontrolu odpovědi a vzorové řešení.
5. V diffu zkontroluj zamýšlené změny a commituj zdroj i obě generované kopie.

Úlohy jsou obsahové adaptace dvou PDF, nikoli automatický přepis; generátor PDF
nečte ani neprovádí OCR. Upravuj `materials/tasks_source.json` a odpovídající
kvóty či odkazy na strany v `materials/outline.json`. Generátor ověřuje cílový
počet 112 i kvóty pro jednotlivá témata a typy.

```sh
python scripts/build_tasks.py --outline materials/outline.json
python -m unittest discover -s tests -v
node --test tests/test_app.js
```

Python generátor a testy používají pouze standardní knihovnu. Node.js 18+ je
potřeba pro JS testy, nikoli pro provoz aplikace.
Testy ověřují katalog a kontrolu odpovědí, neprovádějí však úplnou validaci
Oracle SQL; vybrané přenositelné příklady se kontrolují pomocí SQLite.

Katalog je neprázdné JSON pole objektů. Povinné klíče:

| Klíč | Význam |
| --- | --- |
| `id` | Unikátní kladné celé číslo |
| `level` | `zaklady` nebo `pokrocile` |
| `topic` | Jeden ze slugů uvedených v `materials/outline.json` |
| `type` | `write-query`, `explain-result` |
| `instruction` | Krátký titulek zadání |
| `prompt` | Přesné zadání bez univerzálních poznámek o nesouvisejících sloupcích |
| `sql` | SQL k rozboru; u psaní dotazu může být `null` |
| `theory` | Krátká teorie; prázdný řetězec skryje blok |
| `tables` | Pole `{name, columns, rows}`; může být prázdné |
| `solution` | Vzorový dotaz nebo vysvětlení |
| `hint` | Nápověda |
| `keywords` | Pole klíčových slov, čísel či ISO dat; neprázdné u vysvětlení, jinak `[]` |

`columns` obsahuje anglické identifikátory a typy ve formátu
`department (VARCHAR2(20))` nebo `amount (NUMBER(10,2))`; stejné identifikátory
používej v zadání a SQL. `rows` obsahuje pole stejně širokých řádků.
Buňky jsou text, číslo nebo `null` (zobrazí se jako `NULL`). Data jsou pouze
ukázka, ne databáze. Poznámky o chybějících hodnotách přidávej jen tam, kde mají
význam. `explain-result` vyžaduje neprázdné `sql`.
Pro vysvětlení vybírej stručná jednoznačná klíčová slova; kontrola hledá celé
tokeny, ne podřetězce (`2` neodpovídá `12`). Používej desetinný oddělovač shodný
se vzorovým řešením. Pokud jsou klíčová slova výhradně seznamem více celých čísel,
čárka v odpovědi odděluje položky seznamu (`1,2,3`), nikoli desetinná místa.

## Katalog z PDF

[Plán katalogu](docs/catalog-plan.md) shrnuje pokryté sekce obou PDF, distribuci
úloh a nutné předpoklady. `materials/outline.json` je zdroj témat, stran a
kvót; `materials/tasks_source.json` je kanonický zdroj zadání i řešení.
Generátor vyžaduje přesně 112 úloh, zapisuje shodné kopie do `docs/` a `web/`
a testy hlídají počet, kvóty, ID i paritu.

## Synchronizace a publikace

`web/` a `docs/` záměrně obsahují **bajtově totožné soubory** včetně plánu katalogu.
Tok katalogu je `materials/tasks_source.json` + `materials/outline.json`
→ `scripts/build_tasks.py` → `web/tasks.json` + `docs/tasks.json`.
Generátor synchronizuje pouze `tasks.json`; UI ani plán katalogu negeneruje.
Po úpravě HTML/JS/CSS spusť:

```sh
cp web/index.html web/app.js web/styles.css docs/
python -m unittest discover -s tests -v
```

Test parity hlídá čtyři aplikační soubory a kopie plánu. Commituj zdroj i generované kopie.
Plán upravuj v `web/catalog-plan.md` a zkopíruj jej do `docs/catalog-plan.md`.
Před odesláním PR spusť všechny tři příkazy z části **Práce s obsahem**.
Pro ověření, že regenerování nezměnilo commitované katalogy, použij
`git diff --exit-code -- web/tasks.json docs/tasks.json` po jejich zařazení do commitu.
V GitHub **Settings → Pages → Deploy from a branch** vyber větev `main`
a složku `/docs`, potom ulož. Po sloučení změn je aplikace dostupná na
<https://milhouska-cen59600.github.io/sql-trainer-presentation/>.
Není nutný bundler ani build workflow.

## Změny a příprava vydání

Souhrn sloučených obsahových a kvalitativních změn je v [CHANGELOG.md](CHANGELOG.md).
Repozitář zatím nemá soubor s verzí aplikace; `version` v
`materials/outline.json` označuje verzi schématu, nikoli vydání aplikace.

## Rozdíl oproti sql-trainer-cli

Původní `sql-trainer-cli` nabízí CLI/GUI a webový trenažér s bankovní doménou
a úrovněmi Junior/Medior/Senior. Tento samostatný projekt přebírá princip
výběru úlohy, nápovědy a řešení i vizuální styl (světlé karty, tmavé panely
zadání a odpovědi, tmavé selecty a textarea), ale zaměřuje se na témata
prezentace, právě dvě úrovně a teorii u každé úlohy. Nesdílí databázi,
Python runtime aplikaci ani katalog původního projektu.
