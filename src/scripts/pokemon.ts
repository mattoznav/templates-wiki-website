// Pokémon page: switch between forms, shiny artwork and the cry.

const formTabs = [...document.querySelectorAll<HTMLButtonElement>("[data-form-tab]")];

function showForm(slug: string) {
  if (!formTabs.some((t) => t.dataset.formTab === slug)) return;
  for (const tab of formTabs) tab.setAttribute("aria-pressed", String(tab.dataset.formTab === slug));
  document.querySelectorAll<HTMLElement>("[data-form]").forEach((el) => {
    el.hidden = el.dataset.form !== slug;
  });
}

formTabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    const slug = tab.dataset.formTab!;
    showForm(slug);
    const isDefault = tab === formTabs[0];
    history.replaceState(null, "", isDefault ? location.pathname : `#${slug}`);
  }),
);

document.querySelectorAll<HTMLButtonElement>("[data-form-tab-link]").forEach((link) =>
  link.addEventListener("click", () => {
    formTabs.find((t) => t.dataset.formTab === link.dataset.formTabLink)?.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }),
);

if (location.hash) showForm(decodeURIComponent(location.hash.slice(1)));

// Shiny
const shiny = document.querySelector<HTMLButtonElement>("[data-shiny-toggle]");
shiny?.addEventListener("click", () => {
  const on = shiny.getAttribute("aria-pressed") !== "true";
  shiny.setAttribute("aria-pressed", String(on));
  document.querySelectorAll<HTMLImageElement>(".art img[data-normal]").forEach((img) => {
    const src = on ? img.dataset.shiny : img.dataset.normal;
    if (src) img.src = src;
  });
});

// Cry: the recordings are Ogg Vorbis, so only offer the button where the browser can play it
const cry = document.querySelector<HTMLButtonElement>("[data-cry]");
if (cry && new Audio().canPlayType('audio/ogg; codecs="vorbis"')) {
  cry.hidden = false;
  let audio: HTMLAudioElement | null = null;
  cry.addEventListener("click", () => {
    audio ??= new Audio(cry.dataset.cry);
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });
}
