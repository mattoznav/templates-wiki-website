// Downloads everything the site needs from PokéAPI and writes compact JSON files
// to .cache/data. Raw responses are cached in .cache/pokeapi, so a rebuild only
// hits the network for resources it has never seen.
//
//   node scripts/fetch-data.mjs              fetch what is missing, rebuild the data
//   node scripts/fetch-data.mjs --if-missing do nothing if the data already exist
//   node scripts/fetch-data.mjs --refresh    ignore the cache and download again

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.POKEAPI_URL ?? "https://pokeapi.co/api/v2";
const CACHE = join(ROOT, ".cache", "pokeapi");
const OUT = join(ROOT, ".cache", "data");
const CONCURRENCY = 12;
const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");

const exists = (path) => access(path).then(() => true, () => false);

if (args.has("--if-missing") && (await exists(join(OUT, "meta.json")))) {
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Fetching

let fetched = 0;
let fromCache = 0;

async function get(path) {
  const file = join(CACHE, `${path.replace(/[?&=]/g, "_")}.json`);
  if (!refresh && (await exists(file))) {
    fromCache++;
    return JSON.parse(await readFile(file, "utf8"));
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}/${path}`, {
        headers: { "user-agent": "fieldbook-wiki-template (build script)" },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(data));
      fetched++;
      return data;
    } catch (error) {
      if (attempt >= 5) throw new Error(`${path}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 500 * attempt * attempt));
    }
  }
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const label = items.length > 50;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
      done++;
      if (label && done % 100 === 0) process.stdout.write(`  ${done}/${items.length}\r`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

const idFromUrl = (url) => Number(url.split("/").filter(Boolean).pop());
const pathFromUrl = (url) => url.replace(/^.*\/api\/v2\//, "").replace(/\/$/, "");

async function getAll(resource) {
  const list = await get(`${resource}?limit=5000`);
  return pool(list.results, (r) => get(pathFromUrl(r.url)));
}

// ---------------------------------------------------------------------------
// Text helpers

const en = (entries, key = "name") => entries?.find((e) => e.language.name === "en")?.[key] ?? null;

function clean(text) {
  return text
    ?.replace(/[\f\n\r­]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/POKéMON/g, "Pokémon")
    .trim();
}

function latestEn(entries, key = "flavor_text") {
  const list = entries?.filter((e) => e.language.name === "en") ?? [];
  return list.length ? clean(list[list.length - 1][key]) : null;
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const genNumber = (slug) => ROMAN.indexOf(slug.replace("generation-", "").toUpperCase());

// ---------------------------------------------------------------------------
// Static facts PokéAPI does not carry: release year, platform and kind of game.

const GAME_FACTS = {
  "red-green-japan": [1996, "Game Boy", "original"],
  "blue-japan": [1996, "Game Boy", "original"],
  "red-blue": [1998, "Game Boy", "original"],
  yellow: [1998, "Game Boy", "original"],
  "gold-silver": [1999, "Game Boy Color", "original"],
  crystal: [2000, "Game Boy Color", "original"],
  "ruby-sapphire": [2002, "Game Boy Advance", "original"],
  emerald: [2004, "Game Boy Advance", "original"],
  colosseum: [2003, "GameCube", "spin-off"],
  xd: [2005, "GameCube", "spin-off"],
  "firered-leafgreen": [2004, "Game Boy Advance", "remake"],
  "diamond-pearl": [2006, "Nintendo DS", "original"],
  platinum: [2008, "Nintendo DS", "original"],
  "heartgold-soulsilver": [2009, "Nintendo DS", "remake"],
  "black-white": [2010, "Nintendo DS", "original"],
  "black-2-white-2": [2012, "Nintendo DS", "original"],
  "x-y": [2013, "Nintendo 3DS", "original"],
  "omega-ruby-alpha-sapphire": [2014, "Nintendo 3DS", "remake"],
  "sun-moon": [2016, "Nintendo 3DS", "original"],
  "ultra-sun-ultra-moon": [2017, "Nintendo 3DS", "original"],
  "lets-go-pikachu-lets-go-eevee": [2018, "Nintendo Switch", "remake"],
  "sword-shield": [2019, "Nintendo Switch", "original"],
  "the-isle-of-armor": [2020, "Nintendo Switch", "expansion"],
  "the-crown-tundra": [2020, "Nintendo Switch", "expansion"],
  "brilliant-diamond-shining-pearl": [2021, "Nintendo Switch", "remake"],
  "legends-arceus": [2022, "Nintendo Switch", "original"],
  "scarlet-violet": [2022, "Nintendo Switch", "original"],
  "the-teal-mask": [2023, "Nintendo Switch", "expansion"],
  "the-indigo-disk": [2023, "Nintendo Switch", "expansion"],
  "legends-za": [2025, "Nintendo Switch", "original"],
  "mega-dimension": [2025, "Nintendo Switch", "expansion"],
};

const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const STAT_ORDER = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];

// ---------------------------------------------------------------------------
// Download

const started = Date.now();
console.log("Fetching from PokéAPI (cached in .cache/pokeapi)...");

const [typeList, generations, versionGroups, versions] = await Promise.all([
  get("type?limit=100"),
  getAll("generation"),
  getAll("version-group"),
  getAll("version"),
]);
const types = (await pool(typeList.results, (r) => get(pathFromUrl(r.url)))).filter((t) =>
  TYPE_ORDER.includes(t.name),
);

console.log("Species...");
const speciesRaw = await getAll("pokemon-species");

console.log("Pokémon and forms...");
const varietyPaths = speciesRaw.flatMap((s) => s.varieties.map((v) => pathFromUrl(v.pokemon.url)));
const pokemonRaw = await pool(varietyPaths, (p) => get(p));
const pokemonBySlug = new Map(pokemonRaw.filter(Boolean).map((p) => [p.name, p]));
const formPaths = pokemonRaw
  .filter((p) => p && !p.is_default)
  .map((p) => pathFromUrl(p.forms[0].url));
const formsRaw = await pool(formPaths, (p) => get(p));
const formByPokemon = new Map(formsRaw.filter(Boolean).map((f) => [f.pokemon.name, f]));

console.log("Evolution chains...");
const chainPaths = [...new Set(speciesRaw.map((s) => s.evolution_chain && pathFromUrl(s.evolution_chain.url)).filter(Boolean))];
const chainsRaw = await pool(chainPaths, (p) => get(p));

console.log("Moves...");
const movesRaw = (await getAll("move")).filter(Boolean);

console.log("Abilities...");
const abilitiesRaw = (await getAll("ability")).filter((a) => a && a.is_main_series);

console.log("Items and places named in evolutions...");
const evolutionRefs = { item: new Set(), location: new Set() };
(function collect(nodes) {
  for (const node of nodes) {
    for (const d of node.evolution_details) {
      for (const ref of [d.item, d.held_item]) if (ref) evolutionRefs.item.add(pathFromUrl(ref.url));
      if (d.location) evolutionRefs.location.add(pathFromUrl(d.location.url));
    }
    collect(node.evolves_to);
  }
})(chainsRaw.filter(Boolean).map((c) => c.chain));
const refNames = new Map();
for (const kind of ["item", "location"]) {
  const list = await pool([...evolutionRefs[kind]], (p) => get(p));
  for (const r of list.filter(Boolean)) refNames.set(`${kind}:${r.name}`, en(r.names) ?? titleCase(r.name));
}
const refName = (kind, ref) => refNames.get(`${kind}:${ref.name}`) ?? titleCase(ref.name);

console.log(`Downloaded ${fetched} resources, ${fromCache} from cache.`);

// ---------------------------------------------------------------------------
// Transform

const versionName = new Map(versions.map((v) => [v.name, en(v.names) ?? titleCase(v.name)]));

const groupOrder = new Map(versionGroups.map((g) => [g.name, g.order]));
const games = versionGroups
  .sort((a, b) => a.order - b.order)
  .map((g) => {
    const facts = GAME_FACTS[g.name] ?? [null, null, "other"];
    const names = g.versions.map((v) => versionName.get(v.name));
    // Expansions are listed once per base game ("Sword: The Isle of Armor"): keep the shared part
    const suffixes = [...new Set(names.map((n) => n.split(": ")[1]))];
    const name = names.length > 1 && suffixes.length === 1 && suffixes[0] ? suffixes[0] : names.join(" and ");
    return {
      slug: g.name,
      name,
      versions: names,
      generation: genNumber(g.generation.name),
      regions: g.regions.map((r) => titleCase(r.name)),
      year: facts[0],
      platform: facts[1],
      kind: facts[2],
      order: g.order,
    };
  });
const gameBySlug = new Map(games.map((g) => [g.slug, g]));

// Type chart: chart[attacker][defender] = multiplier
const typeData = TYPE_ORDER.map((slug) => types.find((t) => t.name === slug));
const chart = {};
for (const t of typeData) {
  const row = Object.fromEntries(TYPE_ORDER.map((d) => [d, 1]));
  for (const d of t.damage_relations.double_damage_to) if (d.name in row) row[d.name] = 2;
  for (const d of t.damage_relations.half_damage_to) if (d.name in row) row[d.name] = 0.5;
  for (const d of t.damage_relations.no_damage_to) if (d.name in row) row[d.name] = 0;
  chart[t.name] = row;
}

const speciesSlugByPokemon = new Map();
for (const s of speciesRaw) for (const v of s.varieties) speciesSlugByPokemon.set(v.pokemon.name, s.name);
const speciesById = new Map(speciesRaw.map((s) => [s.id, s]));

// Moves
const moveTypeBySlug = new Map();
const moves = movesRaw
  .filter((m) => TYPE_ORDER.includes(m.type.name) && !m.name.startsWith("max-") && m.generation)
  .map((m) => {
    moveTypeBySlug.set(m.name, m.type.name);
    const effectEntry = m.effect_entries.find((e) => e.language.name === "en");
    const chance = m.effect_chance ?? "";
    let effect = effectEntry ? clean(effectEntry.short_effect.replace(/\$effect_chance/g, chance)) : null;
    // Some newer texts say "has a chance" and keep the number only in effect_chance
    if (effect && chance && !effect.includes("%")) effect = effect.replace(/\ba chance\b/i, `a ${chance}% chance`);
    const learnedBy = [
      ...new Set(m.learned_by_pokemon.map((p) => speciesSlugByPokemon.get(p.name)).filter(Boolean)),
    ];
    return {
      slug: m.name,
      name: en(m.names) ?? titleCase(m.name),
      type: m.type.name,
      category: m.damage_class?.name ?? "status",
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      priority: m.priority,
      target: titleCase(m.target.name).replace("Pokemon", "Pokémon"),
      generation: genNumber(m.generation.name),
      effect,
      flavor: latestEn(m.flavor_text_entries),
      learnedBy,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
const moveBySlug = new Map(moves.map((m) => [m.slug, m]));

// Abilities
const abilities = abilitiesRaw
  .map((a) => {
    const effectEntry = a.effect_entries.find((e) => e.language.name === "en");
    const holders = new Map();
    for (const p of a.pokemon) {
      const species = speciesSlugByPokemon.get(p.pokemon.name);
      if (!species) continue;
      const pokemon = pokemonBySlug.get(p.pokemon.name);
      if (!pokemon?.is_default && holders.has(species)) continue;
      holders.set(species, { species, hidden: p.is_hidden, form: pokemon?.is_default ? null : p.pokemon.name });
    }
    return {
      slug: a.name,
      name: en(a.names) ?? titleCase(a.name),
      generation: genNumber(a.generation.name),
      effect: effectEntry ? clean(effectEntry.short_effect) : null,
      longEffect: effectEntry ? clean(effectEntry.effect) : null,
      flavor: latestEn(a.flavor_text_entries),
      pokemon: [...holders.values()],
    };
  })
  .filter((a) => a.pokemon.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));
const abilityName = new Map(abilities.map((a) => [a.slug, a.name]));

// Evolution chains
function describeEvolution(d) {
  const parts = [];
  const trigger = d.trigger?.name;
  if (trigger === "level-up") parts.push(d.min_level ? `Level ${d.min_level}` : "Level up");
  else if (trigger === "use-item" && d.item) parts.push(`Use ${refName("item", d.item)}`);
  else if (trigger === "trade") parts.push("Trade");
  else if (trigger === "shed") parts.push("Level 20 with a free party slot and a Poké Ball");
  // Alcremie: one entry per Sweet and time of day, all with the same idea
  else if (trigger === "spin") return "Spin around holding a Sweet";
  else if (trigger === "tower-of-darkness") parts.push("Train in the Tower of Darkness");
  else if (trigger === "tower-of-waters") parts.push("Train in the Tower of Waters");
  else if (trigger === "three-critical-hits") parts.push("Land three critical hits in one battle");
  else if (trigger === "take-damage") parts.push(`Take ${d.min_damage_taken ?? 49}+ damage, then walk under a stone bridge`);
  else if (trigger === "agile-style-move") parts.push(`Use ${titleCase(d.used_move?.name ?? "move")} 20 times in agile style`);
  else if (trigger === "strong-style-move") parts.push(`Use ${titleCase(d.used_move?.name ?? "move")} 20 times in strong style`);
  else if (trigger === "recoil-damage") parts.push("Take 294 recoil damage without fainting");
  else if (trigger === "use-move") parts.push(`Use ${titleCase(d.used_move?.name ?? "a move")} ${d.min_move_count ?? 20} times`);
  else if (trigger === "gimmighoul-coins") parts.push("Collect 999 Gimmighoul Coins");
  else if (trigger === "other") parts.push("Special condition");
  else if (trigger) parts.push(titleCase(trigger));

  if (d.held_item) parts.push(`holding ${refName("item", d.held_item)}`);
  if (d.min_happiness) parts.push("with high friendship");
  if (d.min_affection) parts.push("with high affection");
  if (d.min_beauty) parts.push("with high beauty");
  if (d.known_move) parts.push(`knowing ${moveBySlug.get(d.known_move.name)?.name ?? titleCase(d.known_move.name)}`);
  if (d.known_move_type) parts.push(`knowing a ${titleCase(d.known_move_type.name)}-type move`);
  if (d.time_of_day === "full-moon") parts.push("under a full moon");
  else if (d.time_of_day) parts.push(`at ${d.time_of_day === "day" ? "daytime" : d.time_of_day}`);
  if (d.gender === 1) parts.push("(female)");
  if (d.gender === 2) parts.push("(male)");
  if (d.location) parts.push(`at ${refName("location", d.location)}`);
  if (d.needs_overworld_rain) parts.push("while raining");
  if (d.turn_upside_down) parts.push("holding the console upside down");
  if (d.party_species) parts.push(`with ${titleCase(d.party_species.name)} in the party`);
  if (d.party_type) parts.push(`with a ${titleCase(d.party_type.name)}-type in the party`);
  if (d.trade_species) parts.push(`for ${titleCase(d.trade_species.name)}`);
  if (d.relative_physical_stats === 1) parts.push("(Attack > Defense)");
  if (d.relative_physical_stats === -1) parts.push("(Attack < Defense)");
  if (d.relative_physical_stats === 0) parts.push("(Attack = Defense)");
  if (d.needs_multiplayer) parts.push("in Union Circle");
  if (d.min_steps) parts.push(`after ${d.min_steps} steps`);
  return parts.join(" ");
}

function walk(node) {
  const species = speciesById.get(idFromUrl(node.species.url));
  const conditions = [...new Set(node.evolution_details.map(describeEvolution).filter(Boolean))];
  return {
    species: node.species.name,
    id: species?.id ?? idFromUrl(node.species.url),
    conditions,
    into: node.evolves_to.map(walk),
  };
}
const chainById = new Map(chainsRaw.filter(Boolean).map((c) => [c.id, walk(c.chain)]));

// Pokémon (one entry per variety)
function pickMoves(pokemon) {
  const counts = new Map();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.move_learn_method.name !== "level-up") continue;
      counts.set(d.version_group.name, (counts.get(d.version_group.name) ?? 0) + 1);
    }
  }
  const candidates = [...counts.entries()].filter(([, n]) => n >= 2).map(([g]) => g);
  if (!candidates.length) return { game: null, moves: [] };
  const game = candidates.sort((a, b) => (groupOrder.get(b) ?? 0) - (groupOrder.get(a) ?? 0))[0];
  const list = [];
  for (const m of pokemon.moves) {
    if (!moveBySlug.has(m.move.name)) continue;
    const seen = new Set();
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      const method = d.move_learn_method.name;
      if (!["level-up", "machine", "egg", "tutor"].includes(method)) continue;
      const key = `${method}:${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ move: m.move.name, method, level: method === "level-up" ? d.level_learned_at : null });
    }
  }
  list.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.move.localeCompare(b.move));
  return { game, moves: list };
}

function variety(p) {
  const form = formByPokemon.get(p.name);
  const stats = STAT_ORDER.map((s) => p.stats.find((x) => x.stat.name === s)?.base_stat ?? 0);
  const { game, moves: learnset } = pickMoves(p);
  return {
    slug: p.name,
    id: p.id,
    isDefault: p.is_default,
    formName: form ? en(form.form_names) : null,
    fullName: form ? en(form.names) : null,
    isMega: form?.is_mega ?? false,
    types: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats,
    total: stats.reduce((a, b) => a + b, 0),
    abilities: p.abilities
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ slug: a.ability.name, name: abilityName.get(a.ability.name) ?? titleCase(a.ability.name), hidden: a.is_hidden })),
    height: p.height / 10,
    weight: p.weight / 10,
    baseExperience: p.base_experience,
    artwork: p.sprites.other?.["official-artwork"]?.front_default ?? p.sprites.front_default ?? null,
    artworkShiny: p.sprites.other?.["official-artwork"]?.front_shiny ?? null,
    sprite: p.sprites.front_default ?? null,
    cry: p.cries?.latest ?? null,
    learnsetGame: game,
    learnset,
  };
}

const species = speciesRaw
  .sort((a, b) => a.id - b.id)
  .map((s) => {
    const varieties = s.varieties
      .map((v) => pokemonBySlug.get(v.pokemon.name))
      .filter(Boolean)
      .map(variety)
      .filter((v) => v.isDefault || v.artwork);
    const main = varieties.find((v) => v.isDefault) ?? varieties[0];
    // Legends: Arceus entries are written as in-world notes, so prefer any other game
    const flavor = s.flavor_text_entries.filter((e) => e.language.name === "en");
    const regular = flavor.filter((e) => e.version.name !== "legends-arceus");
    const lastFlavor = (regular.length ? regular : flavor).at(-1);
    return {
      id: s.id,
      slug: s.name,
      name: en(s.names) ?? titleCase(s.name),
      genus: en(s.genera, "genus"),
      generation: genNumber(s.generation.name),
      types: main.types,
      total: main.total,
      flavor: lastFlavor ? clean(lastFlavor.flavor_text) : null,
      flavorGame: lastFlavor ? versionName.get(lastFlavor.version.name) : null,
      habitat: s.habitat ? titleCase(s.habitat.name) : null,
      color: s.color ? titleCase(s.color.name) : null,
      shape: s.shape ? titleCase(s.shape.name) : null,
      eggGroups: s.egg_groups.map((g) => titleCase(g.name).replace("No Eggs", "Undiscovered")),
      genderRate: s.gender_rate,
      captureRate: s.capture_rate,
      baseHappiness: s.base_happiness,
      hatchCounter: s.hatch_counter,
      growthRate: titleCase(s.growth_rate.name),
      isLegendary: s.is_legendary,
      isMythical: s.is_mythical,
      isBaby: s.is_baby,
      evolutionChain: s.evolution_chain ? idFromUrl(s.evolution_chain.url) : null,
      evolvesFrom: s.evolves_from_species?.name ?? null,
      varieties,
    };
  });

// Index used by list pages, search and the type pages: no learnsets, no long texts.
const index = species.map((s) => {
  const main = s.varieties.find((v) => v.isDefault) ?? s.varieties[0];
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    genus: s.genus,
    generation: s.generation,
    types: s.types,
    stats: main.stats,
    total: s.total,
    artwork: main.artwork,
    sprite: main.sprite,
    isLegendary: s.isLegendary,
    isMythical: s.isMythical,
  };
});

const typeOut = typeData.map((t) => ({
  slug: t.name,
  name: en(t.names) ?? titleCase(t.name),
  generation: genNumber(t.generation.name),
  attack: chart[t.name],
  defense: Object.fromEntries(TYPE_ORDER.map((a) => [a, chart[a][t.name]])),
}));

const generationOut = generations
  .sort((a, b) => a.id - b.id)
  .map((g) => ({
    number: g.id,
    slug: g.name,
    name: `Generation ${ROMAN[g.id]}`,
    region: titleCase(g.main_region.name),
    games: g.version_groups.map((v) => v.name).filter((v) => gameBySlug.has(v)),
    species: g.pokemon_species.map((s) => idFromUrl(s.url)).sort((a, b) => a - b),
    moves: g.moves.filter((m) => moveBySlug.has(m.name)).length,
    abilities: g.abilities.length,
    types: g.types.map((t) => t.name).filter((t) => TYPE_ORDER.includes(t)),
  }));

const chains = Object.fromEntries(chainById);

await mkdir(OUT, { recursive: true });
const write = (name, data) => writeFile(join(OUT, `${name}.json`), JSON.stringify(data));
await Promise.all([
  write("species", species),
  write("index", index),
  write("moves", moves),
  write("abilities", abilities),
  write("types", typeOut),
  write("games", games),
  write("generations", generationOut),
  write("chains", chains),
]);
await write("meta", {
  source: API,
  builtAt: new Date().toISOString(),
  counts: {
    species: species.length,
    forms: species.reduce((n, s) => n + s.varieties.length, 0),
    moves: moves.length,
    abilities: abilities.length,
    types: typeOut.length,
    games: games.length,
  },
});

console.log(
  `Wrote ${species.length} species, ${moves.length} moves, ${abilities.length} abilities, ` +
    `${games.length} games to .cache/data in ${((Date.now() - started) / 1000).toFixed(0)}s.`,
);
