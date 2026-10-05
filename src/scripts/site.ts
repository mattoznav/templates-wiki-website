// Behaviour shared by every page: theme switch, mobile menu and the search dialog.

const root = document.documentElement;

// Theme ---------------------------------------------------------------------

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const current = root.dataset.theme ?? (systemDark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {}
});

// Mobile menu -----------------------------------------------------------------

const menuButton = document.querySelector<HTMLButtonElement>("[data-menu]");
const mobileNav = document.querySelector<HTMLElement>(".mobile-nav");
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  if (mobileNav) mobileNav.hidden = !open;
});

// Search ----------------------------------------------------------------------

interface Row {
  k: string;
  n: string;
  u: string;
  d: string;
  i?: string | null;
  t?: string;
}

const dialog = document.querySelector<HTMLDialogElement>("dialog.search")!;
const input = dialog.querySelector("input")!;
const list = dialog.querySelector<HTMLUListElement>(".search-results")!;
let rows: Row[] | null = null;
let loading: Promise<Row[]> | null = null;
let results: Row[] = [];
let active = 0;

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function load() {
  loading ??= fetch("/search.json")
    .then((r) => r.json() as Promise<Row[]>)
    .then((data) => {
      rows = data.map((r) => ({ ...r, key: normalise(r.n) }) as Row & { key: string });
      return rows;
    });
  return loading;
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function search(query: string) {
  const q = normalise(query);
  if (!rows) return [];
  if (!q) return rows.filter((r) => r.k === "Type").slice(0, 18);
  const number = /^\d+$/.test(q) ? Number(q) : null;
  const scored: { row: Row; score: number }[] = [];
  for (const row of rows as (Row & { key: string })[]) {
    let score = -1;
    if (number !== null && row.k === "Pokémon" && row.d.startsWith(`#${String(number).padStart(4, "0")}`)) score = 100;
    else if (row.key === q) score = 90;
    else if (row.key.startsWith(q)) score = 70;
    else if (row.key.includes(` ${q}`)) score = 50;
    else if (row.key.includes(q)) score = 30;
    if (score < 0) continue;
    if (row.k === "Pokémon") score += 5;
    scored.push({ row, score: score - row.key.length / 100 });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((s) => s.row);
}

function render() {
  if (!rows) {
    list.innerHTML = `<li class="sr-empty">Loading the index…</li>`;
    return;
  }
  if (!results.length) {
    list.innerHTML = `<li class="sr-empty">Nothing found. Try a name, a number or a type.</li>`;
    return;
  }
  list.innerHTML = results
    .map(
      (r, i) => `<li role="option" id="sr-${i}" aria-selected="${i === active}">
        <a href="${r.u}" class="sr" ${r.t ? `data-type="${r.t}"` : ""}>
          <span class="sr-icon">${
            r.i ? `<img src="${r.i}" alt="" width="40" height="40" loading="lazy">` : `<span class="sr-dot"></span>`
          }</span>
          <span class="sr-text"><span class="sr-name">${escape(r.n)}</span><span class="sr-detail">${escape(r.d)}</span></span>
          <span class="sr-kind label">${r.k}</span>
        </a></li>`,
    )
    .join("");
  input.setAttribute("aria-activedescendant", `sr-${active}`);
  list.querySelector(`#sr-${active}`)?.scrollIntoView({ block: "nearest" });
}

function update() {
  results = search(input.value);
  active = 0;
  render();
}

export function openSearch(initial = "") {
  if (dialog.open) return;
  dialog.showModal();
  input.value = initial;
  input.focus();
  render();
  load().then(update);
}

document.querySelectorAll("[data-open-search]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    openSearch((el as HTMLElement).dataset.query ?? "");
  }),
);

input.addEventListener("input", update);

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!results.length) return;
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
    render();
  } else if (e.key === "Enter") {
    const target = results[active];
    if (target) location.href = target.u;
  }
});

dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  const typing = target.matches("input, textarea, select, [contenteditable]");
  if ((e.key === "/" && !typing) || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
    e.preventDefault();
    openSearch();
  }
});

// Inline search fields (home page) open the dialog with what was typed so far
document.querySelectorAll<HTMLInputElement>("[data-search-field]").forEach((field) => {
  field.addEventListener("focus", () => {
    openSearch(field.value);
    field.blur();
  });
});

// Tabs ------------------------------------------------------------------------
// Any [data-tabs] container with role="tab" buttons pointing at role="tabpanel" elements.

document.querySelectorAll<HTMLElement>("[data-tabs]").forEach((container) => {
  const tabs = [...container.querySelectorAll<HTMLButtonElement>(":scope [role=tab]")].filter(
    (t) => t.closest("[data-tabs]") === container,
  );
  const select = (tab: HTMLButtonElement) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.setAttribute("aria-pressed", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls")!);
      if (panel) panel.hidden = !on;
    }
    container.dispatchEvent(new CustomEvent("tabchange", { detail: tab.dataset.value }));
  };
  tabs.forEach((tab, i) => {
    tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
});
