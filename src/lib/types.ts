export type TypeSlug =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice" | "fighting" | "poison" | "ground"
  | "flying" | "psychic" | "bug" | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export interface AbilityRef {
  slug: string;
  name: string;
  hidden: boolean;
}

export interface LearnedMove {
  move: string;
  method: "level-up" | "machine" | "egg" | "tutor";
  level: number | null;
}

export interface Variety {
  slug: string;
  id: number;
  isDefault: boolean;
  formName: string | null;
  fullName: string | null;
  isMega: boolean;
  types: TypeSlug[];
  stats: number[];
  total: number;
  abilities: AbilityRef[];
  height: number;
  weight: number;
  baseExperience: number | null;
  artwork: string | null;
  artworkShiny: string | null;
  sprite: string | null;
  cry: string | null;
  learnsetGame: string | null;
  learnset: LearnedMove[];
}

export interface Species {
  id: number;
  slug: string;
  name: string;
  genus: string | null;
  generation: number;
  types: TypeSlug[];
  total: number;
  flavor: string | null;
  flavorGame: string | null;
  habitat: string | null;
  color: string | null;
  shape: string | null;
  eggGroups: string[];
  genderRate: number;
  captureRate: number;
  baseHappiness: number | null;
  hatchCounter: number | null;
  growthRate: string;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  evolutionChain: number | null;
  evolvesFrom: string | null;
  varieties: Variety[];
}

export interface IndexEntry {
  id: number;
  slug: string;
  name: string;
  genus: string | null;
  generation: number;
  types: TypeSlug[];
  stats: number[];
  total: number;
  artwork: string | null;
  sprite: string | null;
  isLegendary: boolean;
  isMythical: boolean;
}

export interface Move {
  slug: string;
  name: string;
  type: TypeSlug;
  category: "physical" | "special" | "status";
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  target: string;
  generation: number;
  effect: string | null;
  flavor: string | null;
  learnedBy: string[];
}

export interface Ability {
  slug: string;
  name: string;
  generation: number;
  effect: string | null;
  longEffect: string | null;
  flavor: string | null;
  pokemon: { species: string; hidden: boolean; form: string | null }[];
}

export interface TypeInfo {
  slug: TypeSlug;
  name: string;
  generation: number;
  attack: Record<TypeSlug, number>;
  defense: Record<TypeSlug, number>;
}

export interface Game {
  slug: string;
  name: string;
  versions: string[];
  generation: number;
  regions: string[];
  year: number | null;
  platform: string | null;
  kind: "original" | "remake" | "expansion" | "spin-off" | "other";
  order: number;
}

export interface Generation {
  number: number;
  slug: string;
  name: string;
  region: string;
  games: string[];
  species: number[];
  moves: number;
  abilities: number;
  types: TypeSlug[];
}

export interface Chain {
  species: string;
  id: number;
  conditions: string[];
  into: Chain[];
}

export interface Meta {
  source: string;
  builtAt: string;
  counts: Record<string, number>;
}
