# Selekcja 26

Gra o powołaniach do reprezentacji Polski na mistrzostwa Europy. Pierwsze zgrupowanie pozwala sprawdzić kandydatów, a drugie służy wyborowi kadry turniejowej. Można porównywać zawodników, przeglądać profile i obsadę pozycji, dobrać wolne miejsca losowo oraz cofnąć ostatnią decyzję. Po zatwierdzeniu kadry gra przedstawia przebieg i wynik turnieju.

[Zagraj w Selekcję 26](https://old-deployment.invalid)

Gra działa w przeglądarce na telefonie i komputerze. Postęp zapisuje się na urządzeniu. „Dobierz losowo” zachowuje już powołanych zawodników i uzupełnia wolne miejsca zgodnie z wymaganymi proporcjami. Gdy obecny skład uniemożliwia spełnienie tych wymagań, gra wskazuje przyczynę i nie zmienia listy.

To nieoficjalna, fikcyjna symulacja. Nazwiska, kluby, pozycje, preferowana noga, forma i oceny są elementami scenariusza EURO 2028, a nie aktualnymi danymi skautingowymi. Wyniki i progi oceny są założeniami gry.

Finałowa lista obejmuje 26 zawodników, w tym co najmniej trzech bramkarzy, zgodnie z [art. 32.01 regulaminu UEFA EURO 2026–28](https://documents.uefa.com/r/Regulations-of-the-UEFA-European-Football-Championship-2026-28/Article-32-Player-lists-Online). Wymóg gry dotyczący dokładnie trzech bramkarzy jest bardziej restrykcyjny. Pozostałe limity pozycyjne i rozmiar zgrupowania kontrolnego są założeniami projektowymi.

Uruchomienie lokalne wymaga Node.js 24+ i pnpm:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Architektura, testy i zasady zmian są opisane w [AGENTS.md](AGENTS.md).
