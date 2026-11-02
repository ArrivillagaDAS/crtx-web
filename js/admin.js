import {
  approveMovie, createCategory, deleteCategory, deleteMovie,
  listCategories, listPendingMovies, updateCategory, ApiError,
} from "./api.js";
import { logout, requireAdmin } from "./auth.js";
import { $, $$, clearAlert, errorText, escapeHtml, formatDate, setBusy, setYear, showAlert } from "./utils.js";

if (requireAdmin()) init();

const alertBox = () => $("#admin-alert");

// Pending movies (admin approval)
function pendingCard(movie) {
  return `
    <article class="admin-card" data-id="${movie.id}">
      <div>
        <h3>${escapeHtml(movie.movie_name)}</h3>
        <p>${escapeHtml(movie.release_year)} · ${escapeHtml(movie.overview)}</p>
        <span class="admin-card-meta">Propuesta #${movie.id} · ${escapeHtml(formatDate(movie.created_at))}</span>
      </div>
      <div class="admin-card-actions">
        <button class="button button-primary" data-action="approve">Aprobar</button>
        <button class="button button-danger" data-action="delete">Eliminar</button>
      </div>
    </article>`;
}

async function loadPending() {
  const box = $("#pending-list");
  box.innerHTML = '<p class="loading-state">Cargando propuestas…</p>';
  try {
    const movies = await listPendingMovies();
    $("#pending-count").textContent = `${movies.length} pendientes`;
    box.innerHTML = movies.length
      ? movies.map(pendingCard).join("")
      : '<p class="loading-state">No hay películas pendientes de aprobación.</p>';
  } catch (err) {
    box.innerHTML = `<p class="loading-state">${escapeHtml(errorText(err))}</p>`;
  }
}

// Categories (admin CRUD)
function categoryRow(category) {
  return `
    <article class="admin-card" data-id="${category.id}">
      <div class="admin-category-edit">
        <input name="categoryName" value="${escapeHtml(category.category_name)}" maxlength="80" aria-label="Nombre de la categoría" />
      </div>
      <div class="admin-card-actions">
        <button class="button button-quiet" data-action="save">Guardar</button>
        <button class="button button-danger" data-action="delete">Eliminar</button>
      </div>
    </article>`;
}

async function loadCategories() {
  const box = $("#category-list");
  box.innerHTML = '<p class="loading-state">Cargando categorías…</p>';
  try {
    const categories = await listCategories();
    box.innerHTML = categories.length
      ? categories.map(categoryRow).join("")
      : '<p class="loading-state">Aún no hay categorías.</p>';
  } catch (err) {
    box.innerHTML = `<p class="loading-state">${escapeHtml(errorText(err))}</p>`;
  }
}

async function run(button, action) {
  clearAlert(alertBox());
  setBusy(button, true);
  try {
    await action();
  } catch (err) {
    // 409 from the backend means the row is still referenced (e.g. category used by movies)
    const message = err instanceof ApiError && err.status === 409
      ? "No se puede eliminar: el elemento todavía está en uso."
      : errorText(err);
    showAlert(alertBox(), message);
  } finally {
    setBusy(button, false);
  }
}

function initTabs() {
  $$(".admin-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      $$(".admin-tab").forEach((item) => item.classList.toggle("active", item === tab));
      $("#admin-pending").classList.toggle("hidden", tab.dataset.adminTab !== "pending");
      $("#admin-categories").classList.toggle("hidden", tab.dataset.adminTab !== "categories");
    }),
  );
}

function initActions() {
  $("#pending-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = button.closest("[data-id]").dataset.id;
    run(button, async () => {
      if (button.dataset.action === "approve") {
        await approveMovie(id);
      } else {
        if (!window.confirm("¿Eliminar esta propuesta?")) return;
        await deleteMovie(id);
      }
      await loadPending();
    });
  });

  $("#category-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    run(button, async () => {
      if (button.dataset.action === "save") {
        const name = card.querySelector("input").value.trim();
        await updateCategory(card.dataset.id, name);
      } else {
        if (!window.confirm("¿Eliminar esta categoría?")) return;
        await deleteCategory(card.dataset.id);
      }
      await loadCategories();
    });
  });

  const form = $("#category-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const name = form.elements.categoryName.value.trim();
    run(button, async () => {
      await createCategory(name);
      form.reset();
      await loadCategories();
    });
  });
}

function init() {
  setYear();
  $("#logout-button").addEventListener("click", logout);
  initTabs();
  initActions();
  loadPending();
  loadCategories();
}
