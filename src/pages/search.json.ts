import type { APIRoute } from "astro";
import { getAbilities, getGenerations, getIndex, getMoves, getTypes } from "../lib/data";
import { pad } from "../lib/format";

// Compact search index, fetched by the search dialog the first time it opens.
// k: kind, n: name, u: url (without the base, added by the dialog), d: detail line, i: image, t: type colour
export const GET: APIRoute = () => {
  const rows = [
    ...getIndex().map((e) => ({
      k: "Pokémon",
      n: e.name,
      u: `/pokemon/${e.slug}/`,
      d: `#${pad(e.id)} · ${e.types.join(" / ")}`,
      i: e.sprite ?? e.artwork,
      t: e.types[0],
    })),
    ...getTypes().map((t) => ({ k: "Type", n: t.name, u: `/types/${t.slug}/`, d: "Type", t: t.slug })),
    ...getMoves().map((m) => ({
      k: "Move",
      n: m.name,
      u: `/moves/${m.slug}/`,
      d: `${m.type} · ${m.category}${m.power ? ` · ${m.power} power` : ""}`,
      t: m.type,
    })),
    ...getAbilities().map((a) => ({ k: "Ability", n: a.name, u: `/abilities/${a.slug}/`, d: a.effect ?? "" })),
    ...getGenerations().map((g) => ({ k: "Games", n: `${g.name} · ${g.region}`, u: `/games/${g.slug}/`, d: "Generation" })),
  ];
  return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json" } });
};
