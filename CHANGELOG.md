# Přehled změn

## Nevydáno

Souhrn změn již sloučených do `main`, připravený jako podklad pro vydání.
Tento release pass nemění obsah úloh ani chování aplikace.

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
