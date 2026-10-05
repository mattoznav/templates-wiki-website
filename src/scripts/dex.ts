// Filtering and sorting for the Pokémon list. Every card is already in the page,
// so this only hides, shows and reorders them, and keeps the URL in sync.

const root = document.querySelector<HTMLElement>("[data-dex-filters]")!;
const grid = document.querySelector<HTMLElement>("[data-dex]")!;
const empty = document.querySelector<HTMLElement>("[data-empty]")!;
const count = root.querySelector<HTMLElement>("[data-count]")!;
const reset = root.querySelector<HTMLButtonElement>("[data-reset]")!;
const q = root.querySelector<HTMLInputElement>("[name=q]")!;
const type = root.querySelector<HTMLSelectElement>("[name=type]")!;
const type2 = root.querySelector<HTMLSelectElement>("[name=type2]")!;
const gen = root.querySelector<HTMLSelectElement>("[name=gen]")!;
const sort = root.querySelector<HTMLSelectElement>("[name=sort]")!;
const special = root.querySelector<HTMLButtonElement>("[name=special]")!;

interface Card {
  el: HTMLElement;
  id: number;
  name: string;
  types: string[];
  gen: string;
  total: number;
  stats: number[];
  special: boolean;
}

const cards: Card[] = [...grid.querySelectorAll<HTMLElement>(".card")].map((el) => ({
  el,
  id: Number(el.dataset.id),
  name: el.dataset.name!,
  types: el.dataset.types!.split(" "),
  gen: el.dataset.gen!,
  total: Number(el.dataset.total),
  stats: el.dataset.stats!.split(" ").map(Number),
  special: Boolean(el.dataset.special),
}));

const normalise = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

let lastSort = "id";

function apply() {
  const text = normalise(q.value).replace(/^#/, "");
  const number = /^\d+$/.test(text) ? Number(text) : null;
  let shown = 0;

  for (const c of cards) {
    const match =
      (!text || (number !== null ? c.id === number || String(c.id).startsWith(text) : normalise(c.name).includes(text))) &&
      (!type.value || c.types.includes(type.value)) &&
      (!type2.value ||
        (type2.value === "none" ? c.types.length === 1 : c.types.includes(type2.value))) &&
      (!gen.value || c.gen === gen.value) &&
      (special.getAttribute("aria-pressed") !== "true" || c.special);
    c.el.hidden = !match;
    if (match) shown++;
  }

  if (sort.value !== lastSort) {
    const key = sort.value;
    const sorted = [...cards].sort((a, b) => {
      if (key === "name") return a.name.localeCompare(b.name);
      if (key === "total") return b.total - a.total || a.id - b.id;
      if (key.startsWith("stat-")) {
        const i = Number(key.slice(5));
        return b.stats[i] - a.stats[i] || a.id - b.id;
      }
      return a.id - b.id;
    });
    grid.append(...sorted.map((c) => c.el));
    lastSort = key;
  }

  count.textContent = String(shown);
  empty.hidden = shown > 0;

  const params = new URLSearchParams();
  if (q.value.trim()) params.set("q", q.value.trim());
  if (type.value) params.set("type", type.value);
  if (type2.value) params.set("type2", type2.value);
  if (gen.value) params.set("gen", gen.value);
  if (sort.value !== "id") params.set("sort", sort.value);
  if (special.getAttribute("aria-pressed") === "true") params.set("special", "1");
  reset.hidden = params.size === 0;
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

// Restore from the URL so filtered lists can be shared
const initial = new URLSearchParams(location.search);
q.value = initial.get("q") ?? "";
type.value = initial.get("type") ?? "";
type2.value = initial.get("type2") ?? "";
gen.value = initial.get("gen") ?? "";
sort.value = initial.get("sort") ?? "id";
special.setAttribute("aria-pressed", String(initial.get("special") === "1"));
if (initial.size) apply();

let timer: number | undefined;
q.addEventListener("input", () => {
  clearTimeout(timer);
  timer = window.setTimeout(apply, 80);
});
[type, type2, gen, sort].forEach((el) => el.addEventListener("change", apply));
special.addEventListener("click", () => {
  special.setAttribute("aria-pressed", String(special.getAttribute("aria-pressed") !== "true"));
  apply();
});
reset.addEventListener("click", () => {
  q.value = type.value = type2.value = gen.value = "";
  sort.value = "id";
  special.setAttribute("aria-pressed", "false");
  apply();
});
