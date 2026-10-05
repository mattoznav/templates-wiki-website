// Read-only access to the JSON files written by scripts/fetch-data.mjs.
// Everything here runs at build time only.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Ability,
  Chain,
  Game,
  Generation,
  IndexEntry,
  Meta,
  Move,
  Species,
  TypeInfo,
} from "./types";

const DIR = process.env.WIKI_DATA_DIR ?? join(process.cwd(), ".cache", "data");
const cache = new Map<string, unknown>();

function load<T>(name: string): T {
  if (!cache.has(name)) {
    try {
      cache.set(name, JSON.parse(readFileSync(join(DIR, `${name}.json`), "utf8")));
    } catch {
      throw new Error(`Missing .cache/data/${name}.json: run "npm run data" first.`);
    }
  }
  return cache.get(name) as T;
}

export const getSpecies = () => load<Species[]>("species");
export const getIndex = () => load<IndexEntry[]>("index");
export const getMoves = () => load<Move[]>("moves");
export const getAbilities = () => load<Ability[]>("abilities");
export const getTypes = () => load<TypeInfo[]>("types");
export const getGames = () => load<Game[]>("games");
export const getGenerations = () => load<Generation[]>("generations");
export const getChains = () => load<Record<string, Chain>>("chains");
export const getMeta = () => load<Meta>("meta");

function lookup<T, K>(list: () => T[], key: (item: T) => K) {
  const map = new Map<K, T>();
  return (k: K) => {
    if (!map.size) for (const item of list()) map.set(key(item), item);
    return map.get(k);
  };
}

export const entryBySlug = lookup(getIndex, (e) => e.slug);
export const entryById = lookup(getIndex, (e) => e.id);
export const moveBySlug = lookup(getMoves, (m) => m.slug);
export const abilityBySlug = lookup(getAbilities, (a) => a.slug);
export const gameBySlug = lookup(getGames, (g) => g.slug);
export const typeBySlug = lookup(getTypes, (t) => t.slug);

export function entriesBySlugs(slugs: string[]): IndexEntry[] {
  return slugs
    .map((s) => entryBySlug(s))
    .filter((e): e is IndexEntry => Boolean(e))
    .sort((a, b) => a.id - b.id);
}
