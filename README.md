# SkurMål V2

En mobil håndværker-huskeseddel, vinkelberegner og loftpladeberegner på dansk. Appen er bygget med React, TypeScript og Vite.

## Funktioner

- De fire vægmål vises i en kompakt oversigt.
- Forskelle mellem modstående vægge fremhæves.
- Korrekt firkantsgeometri med diagonaler og 90°-værktøj.
- Loftpladeberegner med begge læggeretninger.
- Visuelt pladelayout med hele plader, skæredele og genbrugt afskær.
- Beregning af arealminimum, layoutfelter, købsskøn, reserve og pris.
- Huskeseddel og flere lokalt gemte projekter.
- Automatisk lagring i IndexedDB samt JSON-import og -eksport.
- Offlinefunktion og installation som PWA.

V2 fase 1 og 2 er implementeret. Skrueregner og indkøbsliste er planlagt som fase 3 og 4.

## Krav

Installér først [Node.js](https://nodejs.org/) version 20 eller nyere. Projektet kan køres med pnpm eller npm.

## Kør lokalt

```bash
pnpm install
pnpm dev
```

Åbn adressen, som Vite viser, normalt <http://localhost:5173>.

Med npm:

```bash
npm install
npm run dev
```

## Test og produktionsbuild

```bash
pnpm test
pnpm build
pnpm preview
```

Produktionsfilerne bliver placeret i mappen `dist/`.

## Læg projektet på GitHub

Opret et tomt repository på GitHub, og kør derefter følgende inde i projektmappen. Erstat adressen med adressen til dit eget repository.

```bash
git init
git add .
git commit -m "Tilføj SkurMål V2"
git branch -M main
git remote add origin https://github.com/DIT-BRUGERNAVN/skur-maaler.git
git push -u origin main
```

Hvis repositoryets lokale mappe allerede har et Git-repository, skal `git init` springes over. Hvis `origin` allerede findes, skal `git remote add origin ...` også springes over.

## Udgiv appen

Projektet er en almindelig statisk Vite-app. Det kan eksempelvis udgives via GitHub Pages, Vercel, Netlify eller en anden statisk webhost. Kør først:

```bash
pnpm build
```

Udgiv derefter indholdet af `dist/`. Brug HTTPS, hvis appen skal installeres som PWA.

## Installer på telefon

Appen skal åbnes via HTTPS (eller `localhost`) for at kunne installeres og fungere offline.

- iPhone/iPad: Åbn i Safari → Del → **Føj til hjemmeskærm**.
- Android: Åbn i Chrome → menu → **Installer app** eller **Føj til startskærm**.

Data ligger kun i den valgte browser. Brug **Gemte projekter → Eksportér backup**, før browserdata ryddes eller enheden skiftes.

## Projektstruktur

- `src/App.tsx` – brugerflade og navigation.
- `src/geometry.ts` – firkants- og vinkelberegninger.
- `src/boardCalculator.ts` – loftpladelayout og afskærsallokering.
- `src/storage.ts` – IndexedDB, migrering og backup.
- `src/styles.css` – mobil-first styling.
- `public/` – PWA-manifest, ikon og service worker.
- `src/*.test.*` – automatiske tests.

## Geometrisk model

Fire sider alene bestemmer ikke en vilkårlig firkant. Appen viser derfor kun en tydeligt markeret skitse, indtil der findes et gyldigt krydsmål eller en kompatibel målt/låst vinkel. En diagonal deler firkanten i to SSS-bestemte trekanter; beregningen validerer trekantsuligheder og eventuelle ekstra mål.

Loftpladeberegneren bruger en rektangulær planreference. Det teoretiske arealminimum er ikke det samme som en præcis skæreplan. Købsskønnet bruger en deterministisk, konservativ allokering af afskær og lover ikke globalt optimal udnyttelse.
