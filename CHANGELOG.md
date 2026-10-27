# Přehled změn

## Nevydáno

Souhrn změn již sloučených do `main`, připravený jako podklad pro vydání.
Release pass nemění obsah úloh ani chování aplikace; chování mění jen sekce Opravy.

### Opravy

- Tlačítko **Náhodná úloha ve zvolené úrovni** zůstávalo po nasazení neaktivní:
  nový `index.html` se spojil se starým `app.js` z cache prohlížeče, který
  tlačítko neznal. `app.js` a `styles.css` se nyní načítají s hashem obsahu
  v URL a tlačítko je aktivní, kdykoli zvolená úroveň obsahuje úlohy.
- Přímé commity `fbe6435` a `d6a8561` upravily jen `web/` (nikoli publikované
  `docs/`), useknuly odstavec pravidel v `index.html` a jako cache verzi použily
  prefix commitu místo SHA-256 obsahu. Odstavec je obnoven, `docs/` synchronizováno
  a hashe přepočítány.
- Názvy tabulek jsou nyní anglické identifikátory (`employees`, `products`,
  `sales`, …) v metadatech, SQL, zadáních i datovém slovníku; české texty
  a datové hodnoty zůstaly. ID, počty a pokrytí témat se nemění.
- Vyhodnocení odpovědi je výrazný zelený/červený/žlutý panel s ikonou;
  neshoda se vzorem netvrdí, že je dotaz neplatný.

### Doplnění podle gap analýzy

- Přidáno 12 úloh (ID 101–112), po šesti pro každou úroveň.
  Katalog nyní obsahuje 112 úloh: 64 základních a 48 pokročilých;
  66 typu `write-query` a 46 typu `explain-result`.
- Základy doplňují REPLACE, CEIL, rozdíl dat, porovnávací operátor,
  vícevětvový CASE a `IS NULL`.
- Pokročilé úlohy doplňují jazykové řazení LISTAGG pomocí NLSSORT,
  metadata ALL_TAB_PARTITIONS, partition pruning, RANK, LEAD a omezený rámec okna.
- Zdroje, strany prezentací, kvóty a předpoklady shrnuje
  [plán katalogu](docs/catalog-plan.md#gap-analysis-summary).

### Kvalitativní audit

- [PR #10](https://github.com/milhouska-cen59600/sql-trainer-presentation/pull/10)
  zpřesnil zadání, požadované sloupce a aliasy, řazení i rozsah výsledků.
- Sladil vysvětlení a kontrolní klíčová slova se vzorovými odpověďmi,
  včetně ISO dat, DECODE, COUNT a počáteční hodnoty NULL u LAG.
- Doplnil hraniční ukázky pro rozlišování velikosti písmen v regulárních
  výrazech a shodné mzdy při analytickém řazení.
- Rozšířil regresní kontroly zadání, ukázkových výsledků a validace odpovědí;
  zachoval počet úloh, jejich ID a shodu zdrojového a publikovaného katalogu.

### Příprava vydání

- README doplňuje stručný postup pro přispěvatele, zdrojový a generační tok,
  ruční synchronizaci UI a plánu katalogu i lokální ověření.
- Bez zavedení nové verze aplikace: repozitář dosud nemá soubor s verzí
  ani zavedenou konvenci samostatných release notes. Verze schématu osnovy
  zůstává beze změny.
