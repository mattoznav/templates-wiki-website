import type { TypeInfo, TypeSlug } from "./types";

export const TYPE_ORDER: TypeSlug[] = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export const STAT_LABELS = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];
export const STAT_SHORT = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export const dexNo = (id: number) => `No. ${String(id).padStart(4, "0")}`;
export const pad = (id: number) => String(id).padStart(4, "0");

export const typeName = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function formatHeight(m: number) {
  const inches = Math.round(m * 39.3701);
  return `${m.toFixed(1)} m · ${Math.floor(inches / 12)}′${String(inches % 12).padStart(2, "0")}″`;
}

export function formatWeight(kg: number) {
  return `${kg.toFixed(1)} kg · ${(kg * 2.20462).toFixed(1)} lb`;
}

/** gender_rate is the chance of being female in eighths, or -1 when genderless. */
export function gender(rate: number) {
  if (rate < 0) return null;
  const female = (rate / 8) * 100;
  return { female, male: 100 - female };
}

export const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function multiplierLabel(m: number) {
  if (m === 0) return "0";
  if (m === 0.25) return "¼";
  if (m === 0.5) return "½";
  return String(m);
}

/** Damage taken by a Pokémon of the given types, from every attacking type. */
export function defenses(types: TypeSlug[], all: TypeInfo[]) {
  const byType = new Map(all.map((t) => [t.slug, t]));
  return TYPE_ORDER.map((attacker) => ({
    type: attacker,
    multiplier: types.reduce((m, t) => m * (byType.get(t)?.defense[attacker] ?? 1), 1),
  }));
}

export function statTone(value: number) {
  if (value >= 150) return "s6";
  if (value >= 120) return "s5";
  if (value >= 90) return "s4";
  if (value >= 60) return "s3";
  if (value >= 30) return "s2";
  return "s1";
}

export const categoryLabel = { physical: "Physical", special: "Special", status: "Status" } as const;

export const methodLabel = {
  "level-up": "Level up",
  machine: "TM",
  egg: "Egg move",
  tutor: "Tutor",
} as const;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
