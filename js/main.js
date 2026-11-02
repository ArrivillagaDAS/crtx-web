import { listMovies, listCategories, ApiError } from "./api.js";
import { config } from "./config.js";
import { errorText, formatRating, setYear, setupAuthLink } from "./utils.js";

const $ = (selector) => document.querySelector(selector);

const els = {
  rankingList: $("#ranking-list"),
  grid: $("#catalog-grid"),
  count: $("#result-count"),
  empty: $("#empty-state"),
  loadMore: $("#load-more"),
  form: $("#filter-form"),
  search: $("#filter-form input[name='search']"),
  category: $("#filter-form select[name='type']"),
  sort: $("#filter-form select[name='sort']"),
};

let allMovies = [];
let visibleCount = config.pageSize;

function showMessage(container, text) {
  const div = document.createElement("div");
  div.className = "loading-state";
  div.textContent = text;
  container.replaceChildren(div);
}

// Movie card. All text goes through textContent, never innerHTML
function posterCard(movie) {
  const article = document.createElement("article");
  article.className = "poster-card";

  const link = document.createElement("a");
  link.href = `./detail.html?id=${movie.id}`;

  const art = document.createElement("div");
  art.className = "poster-art";

  const initial = movie.movie_name.charAt(0).toUpperCase();
  if (movie.image_url) {
    const img = document.createElement("img");
    img.src = movie.image_url;
    img.alt = movie.movie_name;
    img.loading = "lazy";
    // If the image fails to load, show the initial instead
    img.onerror = () => art.replaceChildren(initial);
    art.append(img);
  } else {
    art.textContent = initial;
  }

  const title = document.createElement("h3");
  title.textContent = movie.movie_name;

  const meta = document.createElement("p");
  const rating = formatRating(movie.average_rating, movie.rating_count);
  meta.textContent = `${movie.release_year} · ${rating ? `★ ${rating}` : "Sin calificar"}`;

  link.append(art, title, meta);
  article.append(link);
  return article;
}

// Top 5 by the backend's weighted ranking
async function loadRanking() {
  showMessage(els.rankingList, "Cargando selección…");
  try {
    const movies = await listMovies({ sort: "ranking" });
    const top = movies.slice(0, 5);
    if (top.length === 0) {
      showMessage(els.rankingList, "Aún no hay títulos en el ranking.");
      return;
    }
    els.rankingList.replaceChildren(...top.map(posterCard));
  } catch (err) {
    showMessage(els.rankingList, errorText(err));
  }
}

// Text search runs in the browser over the loaded list; pagination with "Cargar más"
function renderCatalog() {
  const term = els.search.value.trim().toLowerCase();
  const matches = allMovies.filter((m) => m.movie_name.toLowerCase().includes(term));

  els.count.textContent = `${matches.length} ${matches.length === 1 ? "título" : "títulos"}`;
  els.empty.classList.toggle("hidden", matches.length > 0);
  els.grid.replaceChildren(...matches.slice(0, visibleCount).map(posterCard));
  els.loadMore.classList.toggle("hidden", matches.length <= visibleCount);
}

function updateStats() {
  const reviews = allMovies.reduce((sum, m) => sum + Number(m.rating_count || 0), 0);
  setStat("titles", allMovies.length);
  setStat("reviews", reviews);
}

function setStat(name, value) {
  const el = document.querySelector(`[data-stat="${name}"]`);
  if (el) el.textContent = value.toLocaleString("es");
}

// The catalog is requested again from the backend when category or sort changes
async function loadCatalog() {
  visibleCount = config.pageSize;
  showMessage(els.grid, "Preparando el archivo…");

  try {
    allMovies = await listMovies({
      categoryId: els.category.value || undefined,
      sort: els.sort.value,
    });
    // Hero stats reflect the full catalog, not a filtered view
    if (!els.category.value) updateStats();
    renderCatalog();
  } catch (err) {
    allMovies = [];
    els.count.textContent = "— títulos";
    els.loadMore.classList.add("hidden");
    showMessage(els.grid, errorText(err));
  }
}

async function loadCategories() {
  try {
    const categories = await listCategories();
    const options = categories.map((c) => new Option(c.category_name, c.id));
    els.category.replaceChildren(new Option("Todas las categorías", ""), ...options);
  } catch {
    // Without categories the list still works, just without the filter
  }
}

els.form.addEventListener("submit", (event) => event.preventDefault());
els.search.addEventListener("input", renderCatalog);
els.category.addEventListener("change", loadCatalog);
els.sort.addEventListener("change", loadCatalog);
els.loadMore.addEventListener("click", () => {
  visibleCount += config.pageSize;
  renderCatalog();
});

setYear();
setupAuthLink();
loadCategories();
loadRanking();
loadCatalog();
