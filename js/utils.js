import { isLoggedIn, logout } from "./auth.js";
import { ApiError } from "./api.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function showAlert(box, message, type = "error") {
  box.textContent = message;
  box.className = `alert alert-${type}`;
  box.hidden = false;
}

export function clearAlert(box) {
  box.textContent = "";
  box.hidden = true;
}

// Fills <small data-error-for="field"> elements with backend validation errors
export function showFieldErrors(form, errors = []) {
  form.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
  for (const { field, message } of errors) {
    const el = form.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;
  }
}

export function errorText(err) {
  return err instanceof ApiError ? err.message : "Algo salió mal. Intenta de nuevo.";
}

export function setBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
}

export function setYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

// average_rating llega como decimal desde MySQL; solo se muestra si hay calificaciones
export function formatRating(average, count) {
  if (!Number(count)) return null;
  return Number(average).toFixed(1);
}

export function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("es") : "";
}

// Header link: "Iniciar sesión" when logged out, "Cerrar sesión" when logged in
export function setupAuthLink() {
  const link = document.querySelector("[data-auth-link]");
  if (!link || !isLoggedIn()) return;
  link.textContent = "Cerrar sesión";
  link.href = "#";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });
}
