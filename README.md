# Wiki template: Website

"Fieldbook", a static reference site for every Pokémon: species, forms, stats, evolutions, type matchups, learnsets, moves, abilities, types and games, all cross-linked.

Astro, no UI framework, no backend. Part of the [`templates-wiki`](https://github.com/mattoznav/templates-wiki) template, inside the [`templates`](https://github.com/mattoznav/templates) collection.

## Requirements

- Node.js 22.12 or newer and npm
- An internet connection for the first build (to download the data from [PokéAPI](https://pokeapi.co/))

No API key, account or database is needed.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:4323`.

The first `npm run dev` (or `npm run build`) downloads the data from PokéAPI, which takes about a minute. The raw responses are cached in `.cache/pokeapi/` (about 230 MB), so later runs start straight away.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 4323. Downloads the data first if it is missing. |
| `npm run build` | Static site in `dist/` (about 2,300 pages). Downloads the data first if it is missing. |
| `npm run preview` | Serves the built site |
| `npm run data` | Rebuilds `.cache/data/` from the cache, downloading only what is missing |
| `npm run data -- --refresh` | Ignores the cache and downloads everything again, for example after a new game comes out |
| `npm run check` | Type-checks the components and scripts |

## How the data flows

```
PokéAPI ──(scripts/fetch-data.mjs)──> .cache/pokeapi/   raw responses, one file per resource
                                  └─> .cache/data/      compact JSON the pages read
                                            │
                              (astro build) ▼
                                       dist/            static HTML, CSS, JS
```

`scripts/fetch-data.mjs` downloads species, Pokémon and forms, evolution chains, moves, abilities, types, generations and games (about 4,700 requests, 12 at a time, with retries), then reduces them to a few files: `species.json`, `index.json`, `moves.json`, `abilities.json`, `types.json`, `games.json`, `generations.json`, `chains.json` and `meta.json`. It also turns evolution conditions into readable text ("Level up holding Razor Fang at night") and picks the most recent game with a full learnset for each Pokémon.

Nothing is fetched from PokéAPI while people browse: pages are generated at build time. Only artwork, sprites and cries are loaded from PokéAPI's public GitHub repositories. This follows PokéAPI's fair use policy, which asks clients to cache resources locally.

Set `POKEAPI_URL` to use a self-hosted PokéAPI instance instead of `https://pokeapi.co/api/v2`.

## Pages

| Path | What it shows |
| --- | --- |
| `/` | Search, random entry, featured entry, browse by generation and type |
| `/pokemon/` | All 1,025 species, filterable by type, second type, generation and legendary status, sortable by any base stat. Filters are kept in the URL. |
| `/pokemon/<name>/` | Artwork (with shiny and cry), Pokédex entry, profile, base stats, type defenses, evolution chain, learnset by method, every alternate form |
| `/types/` | The 18 types and the full type chart |
| `/types/<type>/` | What the type beats and resists, its Pokémon and moves |
| `/moves/` | All moves, searchable by name or effect, filterable and sortable |
| `/moves/<move>/` | Power, accuracy, PP, priority, effect, description, every Pokémon that learns it |
| `/abilities/` and `/abilities/<ability>/` | What each ability does and who has it, as a regular or hidden ability |
| `/games/` | Every game by generation, with year, platform and kind |
| `/games/generation-<n>/` | A generation's region, games and the Pokémon it introduced |
| `/about/` | Data sources, how the site is built, trademarks |
| `/search.json` | The index used by the search dialog |

Press `/` or `Ctrl K` / `⌘ K` on any page to search Pokémon, moves, abilities, types and generations.

## Structure

```
scripts/fetch-data.mjs   download and transform the data
src/lib/                 data access (build time), types and formatting helpers
src/components/          cards, type badges, stat bars, matchups, evolution tree, learnset, tables
src/layouts/Base.astro   header, footer, search dialog, theme switch
src/pages/               one file per route
src/scripts/             browser code: search, tabs, filters, form switcher
src/styles/global.css    design tokens and shared styles
```

## Customising

- Colours, fonts and type colours are design tokens at the top of `src/styles/global.css`; dark mode follows the system and can be switched from the header.
- Release years, platforms and the kind of each game (main game, remake, expansion, spin-off) are in `GAME_FACTS` in `scripts/fetch-data.mjs`, because PokéAPI does not carry them.
- The featured entries on the home page are listed in `src/pages/index.astro`.
- Set the real domain in `astro.config.mjs` (`site`) before deploying, so canonical URLs and the sitemap are correct.

## Deploying

`npm run build` produces a plain static site in `dist/` that any static host can serve. On a host that builds from Git, the first build downloads the data; keep `.cache/` between builds if the host allows it, to make later builds take seconds.

## Credits and trademarks

Data from [PokéAPI](https://pokeapi.co/). Artwork, sprites and cries are loaded at runtime from the [PokeAPI/sprites](https://github.com/PokeAPI/sprites) and [PokeAPI/cries](https://github.com/PokeAPI/cries) repositories and are not included in this repository. Fonts: Fraunces, IBM Plex Sans and IBM Plex Mono (SIL Open Font License), installed from npm.

Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. This template is an unofficial fan reference and is not affiliated with or endorsed by them.

## License

The code is released under the [MIT License](LICENSE). It covers the code only: data from PokéAPI, the artwork loaded from its repositories and the Pokémon trademarks are not covered.
