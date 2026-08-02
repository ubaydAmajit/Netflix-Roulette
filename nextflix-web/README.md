# NextFlix — Next.js

Can't make up your mind for your next binge? We got your NextFlix!

Pick your streaming services, spin, and get one thing to watch that's actually
included with what you already pay for, in your region. Data comes from **TMDB**,
whose watch-provider index is sourced from JustWatch.

## Running it

```bash
npm install
cp .env.example .env.local
```

```bash
npm run dev
```

Open <http://localhost:3000>.

## How the recommendation engine works

`src/lib/recommend.ts`, three stages:

**1. Sample.** Queries `/discover/{movie,tv}` filtered to Netflix
(`with_watch_providers` + `with_watch_monetization_types=flatrate`) in your
region. Reads `total_pages` off the first response, then jumps to a *random*
page — otherwise every spin draws from the same popular 20 titles.

**2. Score.** Ranks the pool by an IMDb-style Bayesian weighted rating:

```
WR = (v / (v + m)) · R  +  (m / (v + m)) · C
```

`R` is the title's average, `v` its vote count, `m` a prior strength
(`PRIOR_VOTES`), `C` the pool mean. Titles with few votes get pulled toward the
average, so a 9.5 from 40 voters doesn't beat an 8.4 from 20,000.

**3. Pick.** Weighted random, `weight = score ^ BIAS_EXPONENT`. At `0` it's a
uniform coin flip; at `3` (default) good titles are likely but the result stays
genuinely uncertain. Tune the constant at the top of the file.

Plus: the last 20 picks are remembered per session, so consecutive spins never
repeat a title.

## Layout

Two pages:

- **`/`** — the roulette. Wheel on the left, wordmark on the right until you
  spin, then the pick takes the right. Nothing else on the page.
- **`/browse`** — search, filters, services and the results grid.

The header logo always returns to the roulette. Region and chosen services are
shared between the two via `localStorage`.

| Path | Role |
| --- | --- |
| `src/lib/tmdb.ts` | **Every** TMDB call — client, genres, regions, providers |
| `src/lib/search.ts` | Candidate gathering: discover path + text path |
| `src/lib/recommend.ts` | The engine: sample → score → pick |
| `src/lib/scoring.ts` | Pure ranking maths, no I/O |
| `src/lib/prefs.ts` | Region + services in `localStorage` |
| `src/lib/types.ts` | Provider-neutral types the rest of the app uses |
| `src/app/actions.ts` | Server Actions: search, spin, providers, availability |
| `src/components/Spinner.tsx` | Home page client |
| `src/components/BrowsePanel.tsx` | Browse page client |
| `src/components/SpinWheel.tsx` | SVG roulette wheel |

Credentials are read only in `src/lib/tmdb.ts`, which is marked `server-only` —
it cannot be imported into a Client Component by accident.

## How services are detected

TMDB lists 140+ "providers" per region (290 in the US) with **no flag saying
which are subscriptions and which are rental shops**. Filtering on
`with_watch_monetization_types=flatrate` does not help — Apple TV Store returns
9,629 results under it.

So `fetchProviders()` measures instead. For each candidate it compares
rent-only inventory against what's included:

| | included (`flatrate\|free\|ads`) | rent | ratio |
| --- | --- | --- | --- |
| Netflix | 3,387 | 784 | **0.23** |
| Disney Plus | 1,550 | 997 | **0.64** |
| BBC iPlayer | 244 | 157 | **0.64** |
| Amazon Prime Video | 7,549 | 6,427 | **0.85** |
| Rakuten TV | 5,944 | 8,647 | 1.45 |
| Sky Store | 7,588 | 12,456 | 1.64 |
| Apple TV Store | 11,451 | 20,435 | 1.78 |

Real services sit below 0.9; storefronts above 1.4. The threshold is 1.3.
Results are cached for a day, so the probe cost is paid once per region.

`free` and `ads` are included alongside `flatrate` deliberately — BBC iPlayer
and Channel 4 cost nothing extra, and restricting to `flatrate` silently
excluded them.
